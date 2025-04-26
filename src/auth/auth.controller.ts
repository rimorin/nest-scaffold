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
  Res,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { Public } from './decorators/public.decorator';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProfileResponseDto } from './dtos/profile.dto';

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
   * @param response - Express response object to set cookies
   * @returns JWT access token
   * @throws UnauthorizedException if authentication fails
   * @public This endpoint is accessible without authentication
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with username/email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Returns user data after setting authentication cookie',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  login(@Request() req, @Res({ passthrough: true }) response: Response) {
    const authResult = this.authService.login(req.user);
    response.setHeader('Set-Cookie', authResult.cookie);
    return { user: req.user };
  }

  /**
   * Logs out a user by invalidating their JWT token
   *
   * @route POST /auth/logout
   * @param req - The request object containing the authorization header with JWT token
   * @param response - Express response object to clear cookies
   * @returns Success message upon logout
   * @throws UnauthorizedException if logout fails or no token is provided
   * @protected This endpoint requires authentication
   */
  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    // Extract token from cookies
    const token = req.cookies?.Authentication;

    if (!token) {
      throw new UnauthorizedException('No authentication cookie found');
    }

    await this.authService.logout(token);

    // Clear the authentication cookie
    response.setHeader('Set-Cookie', this.authService.getClearAuthCookie());

    return { message: 'Logout successful' };
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
      return await this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.name,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Registration failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
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
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile information',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    // Fetch complete user information
    const user = await this.authService.getUserProfile(req.user.userId);
    return new ProfileResponseDto(user);
  }
}
