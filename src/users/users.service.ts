import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service responsible for user management operations
 * Handles creating and retrieving user data from the database
 */
@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Find all users in the database
   *
   * @returns An array of user objects
   */
  async findAll(): Promise<User[]> {
    return this.prismaService.user.findMany();
  }

  /**
   * Find a user by their username
   *
   * @param username - The unique username to search for
   * @returns The user object if found, null otherwise
   */
  async findOneByUsername(username: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { username },
    });
  }

  /**
   * Find a user by their email
   *
   * @param email - The unique email to search for
   * @returns The user object if found, null otherwise
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by either username or email
   *
   * @param identifier - The username or email to search for
   * @returns The user object if found, null otherwise
   */
  async findOne(identifier: string): Promise<User | null> {
    // Try to find by email first (assuming most users login with email)
    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    return user;
  }

  /**
   * Create a new user in the database
   *
   * @param userData - Object containing user data (email, username, password)
   * @returns The newly created user object
   */
  async create(userData: {
    email: string;
    username?: string;
    password: string;
    name?: string;
  }): Promise<User> {
    return this.prismaService.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        name: userData.name,
      },
    });
  }

  /**
   * Get a user by their ID
   *
   * @param id - The user's unique ID
   * @returns The user object if found, null otherwise
   */
  async findById(id: number): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update a user's verification status
   *
   * @param userId - The user's unique ID
   * @param verified - The verification status to set
   * @returns The updated user object
   */
  async setVerificationStatus(userId: number, verified: boolean): Promise<User> {
    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        verified,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update a user's active/disabled status
   *
   * @param userId - The user's unique ID
   * @param disabled - Whether the user should be disabled
   * @returns The updated user object
   */
  async setDisabledStatus(userId: number, disabled: boolean): Promise<User> {
    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        disabled,
        updatedAt: new Date(),
      },
    });
  }
}
