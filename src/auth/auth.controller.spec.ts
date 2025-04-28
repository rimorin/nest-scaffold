import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    getUserProfile: jest.fn(),
    logout: jest.fn(),
    getClearAuthCookie: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
        { provide: PrismaService, useValue: { tokenBlacklist: { create: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set authentication cookie and return user data', () => {
      const user = { username: 'testuser', userId: 1 };
      const cookieValue = 'Authentication=token; HttpOnly;';
      const mockResponse = { setHeader: jest.fn() } as unknown as Response;

      mockAuthService.login.mockReturnValue({ cookie: cookieValue });

      const result = controller.login({ user }, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Set-Cookie', cookieValue);
      expect(result).toEqual({ user });
    });
  });

  describe('register', () => {
    it('should register a new user and return user data', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123!',
        username: 'newuser',
      };
      const expectedUser = { id: 1, email: registerDto.email, username: registerDto.username };

      mockAuthService.register.mockResolvedValue(expectedUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        undefined,
      );
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 1;
      const req = { user: { userId } };
      const userProfile = {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
      };

      mockAuthService.getUserProfile.mockResolvedValue(userProfile);

      const result = await controller.getProfile(req);

      expect(authService.getUserProfile).toHaveBeenCalledWith(userId);
      expect(result).toEqual(userProfile);
    });
  });

  describe('logout', () => {
    it('should clear auth cookie and logout user', async () => {
      const token = 'valid-token';
      const req = { cookies: { Authentication: token } };
      const mockResponse = { setHeader: jest.fn() } as unknown as Response;
      const clearCookie = 'Authentication=; HttpOnly; Max-Age=0;';

      mockAuthService.logout.mockResolvedValue(undefined);
      mockAuthService.getClearAuthCookie.mockReturnValue(clearCookie);

      const result = await controller.logout(req, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith(token);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Set-Cookie', clearCookie);
      expect(result).toEqual({ message: 'Logout successful' });
    });

    it('should throw UnauthorizedException when no auth cookie', async () => {
      const req = { cookies: {} };
      const mockResponse = { setHeader: jest.fn() } as unknown as Response;

      await expect(controller.logout(req, mockResponse)).rejects.toThrow(UnauthorizedException);
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });
  });
});
