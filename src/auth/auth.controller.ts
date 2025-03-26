import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { Public } from './decorators/public.decorator';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

/**
 * Controller handling authentication-related endpoints
 * Provides login, logout, registration, and profile retrieval functionality
 */
@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
@UseInterceptors(CacheInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticates a user and returns a JWT token
   *
   * @route POST /auth/login
   * @param req - The request object containing the validated user from LocalAuthGuard
   * @returns JWT access token
   * @throws UnauthorizedException if authentication fails
   * @public This endpoint is accessible without authentication
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with username/email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Returns JWT access token on successful login' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  login(@Request() req) {
    try {
      return this.authService.login(req.user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  /**
   * Logs out a user by invalidating their JWT token
   *
   * @route POST /auth/logout
   * @param req - The request object containing the authorization header with JWT token
   * @returns Success message upon logout
   * @throws UnauthorizedException if logout fails or no token is provided
   * @protected This endpoint requires authentication
   */
  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async logout(@Request() req) {
    try {
      // Extract token from Authorization header
      const token = req.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
      await this.authService.logout(token);
      return { message: 'Logout successful' };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Logout failed');
    }
  }

  /**
   * Registers a new user in the system
   *
   * @route POST /auth/register
   * @param registerDto - Data transfer object containing registration details
   * @returns Created user object (without password)
   * @throws HttpException if registration fails
   * @public This endpoint is accessible without authentication
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or existing user' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      return this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.name,
      );
    } catch (error) {
      throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves the profile information of the authenticated user
   *
   * @route GET /auth/profile
   * @param req - The request object containing the authenticated user (injected by JWT strategy)
   * @returns User profile information
   * @protected This endpoint requires authentication
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    // Fetch complete user information
    const user = await this.authService.getUserProfile(req.user.userId);
    return user;
  }
}
