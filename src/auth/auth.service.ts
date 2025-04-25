import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';

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
    private configService: ConfigService,
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
   * @returns Object containing cookie information for authentication
   */
  login(user: any) {
    const payload = {
      email: user.email,
      username: user.username,
      sub: user.id,
      verified: user.verified,
    };

    const token = this.jwtService.sign(payload);

    return {
      cookie: this.getTokenCookie(token),
    };
  }

  /**
   * Calculate expiration date from a duration string like '1d', '7h', etc.
   *
   * @param durationStr - Duration string (e.g. '1d', '7h', '30m', '60s')
   * @returns Date object representing the expiration time
   */
  private calculateExpirationDate(durationStr: string): Date {
    const expires = new Date();

    if (durationStr.endsWith('d')) {
      expires.setDate(expires.getDate() + parseInt(durationStr.slice(0, -1), 10));
    } else if (durationStr.endsWith('h')) {
      expires.setHours(expires.getHours() + parseInt(durationStr.slice(0, -1), 10));
    } else if (durationStr.endsWith('m')) {
      expires.setMinutes(expires.getMinutes() + parseInt(durationStr.slice(0, -1), 10));
    } else if (durationStr.endsWith('s')) {
      expires.setSeconds(expires.getSeconds() + parseInt(durationStr.slice(0, -1), 10));
    } else {
      // Default to 1 day if format not recognized
      expires.setDate(expires.getDate() + 1);
    }

    return expires;
  }

  /**
   * Get common cookie attributes used for both setting and clearing cookies
   *
   * @returns String of common cookie attributes
   */
  private getCommonCookieAttributes(): string {
    const cookieDomain = this.configService.get<string>('app.cookieDomain');
    const domainPart = cookieDomain ? `; Domain=${cookieDomain}` : '';

    return `HttpOnly; Path=/${domainPart}; SameSite=Strict; Secure`;
  }

  /**
   * Creates a secure cookie string with the JWT token
   *
   * @param token - The JWT token to include in the cookie
   * @returns The cookie string ready to be set in response header
   */
  private getTokenCookie(token: string): string {
    // Get JWT expiration from config
    const expiresIn = this.configService.get<string>('jwt.expiresIn', '1d');

    const expires = this.calculateExpirationDate(expiresIn);
    const maxAge = Math.floor((expires.getTime() - Date.now()) / 1000);

    return `Authentication=${token}; ${this.getCommonCookieAttributes()}; Max-Age=${maxAge}`;
  }

  /**
   * Creates a cookie that immediately expires to clear the authentication cookie
   *
   * @returns The cookie string that will clear the auth cookie
   */
  getClearAuthCookie(): string {
    return `Authentication=; ${this.getCommonCookieAttributes()}; Max-Age=0`;
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
    // Validate email and username in parallel if both are provided
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.usersService.findOneByEmail(email),
      username ? this.usersService.findOneByUsername(username) : null,
    ]);

    if (existingUserByEmail) {
      throw new BadRequestException('Email already in use');
    }

    if (existingUserByUsername) {
      throw new BadRequestException('Username already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await this.usersService.create({
      email,
      username,
      password: hashedPassword,
      name,
    });

    // Remove password from the returned user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    // Queue welcome email
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
