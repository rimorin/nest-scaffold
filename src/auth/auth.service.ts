import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

/**
 * Authentication service that handles user validation, login, logout, and registration
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prismaService: PrismaService,
    private queueService: QueueService,
  ) {}

  /**
   * Validates a user by checking username/email and password
   *
   * @param identifier - The email or username to validate
   * @param pass - The password to validate
   * @returns The user object without password if validation is successful, null otherwise
   */
  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(identifier);
    if (!user) {
      return null;
    }

    // Check if user is disabled
    if (user.disabled) {
      return null;
    }

    // Validate password
    if (await bcrypt.compare(pass, user.password)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  /**
   * Generates JWT access token upon successful login
   *
   * @param user - The authenticated user object
   * @returns Object containing the signed JWT access token
   */
  login(user: any) {
    const payload = {
      email: user.email,
      username: user.username,
      sub: user.id,
      verified: user.verified,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Invalidates a JWT token by adding it to the blacklist
   *
   * @param token - The JWT token to invalidate
   * @throws BadRequestException if the token is invalid
   */
  async logout(token: string): Promise<void> {
    // Decode the token to get its expiry time
    const decoded = this.jwtService.decode(token);

    if (!decoded || typeof decoded !== 'object') {
      throw new BadRequestException('Invalid token');
    }

    const expiresAt = new Date(decoded.exp * 1000);

    // Store the invalidated token in the database
    await this.prismaService.tokenBlacklist.create({
      data: {
        token,
        expiresAt,
      },
    });
  }

  /**
   * Registers a new user with hashed password
   *
   * @param email - The email for the new user
   * @param username - Optional username for the new user
   * @param password - The raw password to be hashed and stored
   * @param name - Optional name for the new user
   * @returns The created user object without the password field
   */
  async register(email: string, password: string, username?: string, name?: string) {
    // Check if the email is already in use
    const existingUserByEmail = await this.usersService.findOneByEmail(email);
    if (existingUserByEmail) {
      throw new BadRequestException('Email already in use');
    }

    // Check if the username is already in use (if provided)
    if (username) {
      const existingUserByUsername = await this.usersService.findOneByUsername(username);
      if (existingUserByUsername) {
        throw new BadRequestException('Username already in use');
      }
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    const user = await this.usersService.create({
      email,
      username,
      password: hashedPassword,
      name,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    // Add a welcome email job to the queue
    await this.queueService.addJob('send-welcome-mail', {
      email: user.email,
      username: user.username,
      name: user.name,
    });

    return result;
  }

  /**
   * Get a user's profile by their ID
   *
   * @param userId - The user's ID
   * @returns The user profile without sensitive information
   */
  async getUserProfile(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Remove sensitive information
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userProfile } = user;
    return userProfile;
  }
}
