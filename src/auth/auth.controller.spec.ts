import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    getUserProfile: jest.fn(),
    logout: jest.fn(),
    getClearAuthCookie: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockPrismaService = {
    tokenBlacklist: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Add cache module to fix the dependency error
        CacheModule.register(),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            findOneByEmail: jest.fn(),
            findOneByUsername: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set authentication cookie and return user data when login is successful', () => {
      // Arrange
      const user = { username: 'testuser', userId: 1 };
      const cookieValue =
        'Authentication=token; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict; Secure';
      const mockResponse = { setHeader: jest.fn() } as any;
      mockAuthService.login.mockReturnValue({ cookie: cookieValue });

      // Act
      const result = controller.login({ user }, mockResponse);

      // Assert
      expect(result).toEqual({ user });
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Set-Cookie', cookieValue);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw an exception when login fails', () => {
      // Arrange
      const user = { username: 'testuser', userId: 1 };
      const mockResponse = { setHeader: jest.fn() } as any;
      mockAuthService.login.mockImplementation(() => {
        throw new UnauthorizedException('Login failed');
      });

      // Act & Assert
      expect(() => controller.login({ user }, mockResponse)).toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should return user data when registration is successful', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        username: 'newuser',
      };
      const expectedResult = { id: 1, email: 'newuser@example.com', username: 'newuser' };
      mockAuthService.register.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        undefined, // name is undefined in this test
      );
    });

    it('should throw an HttpException when registration fails', async () => {
      // Arrange
      const registerDto = {
        email: 'existinguser@example.com',
        password: 'Password123!',
        username: 'existinguser',
      };
      const errorMessage = 'Registration failed';
      mockAuthService.register.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(errorMessage);
    });
  });

  describe('getProfile', () => {
    it('should call getUserProfile with correct userId', async () => {
      // Arrange
      const userId = 1;
      const userProfile = { id: userId, email: 'test@example.com' };
      const req = { user: { userId } };
      mockAuthService.getUserProfile.mockResolvedValue(userProfile);

      // Act
      const result = await controller.getProfile(req);

      // Assert
      expect(mockAuthService.getUserProfile).toHaveBeenCalledWith(userId);
      expect(result).toEqual(userProfile);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the token from cookies and clear the cookie', async () => {
      // Arrange
      const token = 'valid-token';
      const req = { cookies: { Authentication: token } };
      const mockResponse = { setHeader: jest.fn() } as any;
      const clearCookieValue =
        'Authentication=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure';

      mockAuthService.logout.mockResolvedValue(undefined);
      mockAuthService.getClearAuthCookie.mockReturnValue(clearCookieValue);

      // Act
      const result = await controller.logout(req, mockResponse);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(token);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Set-Cookie', clearCookieValue);
      expect(result).toEqual({ message: 'Logout successful' });
    });

    it('should throw UnauthorizedException when no authentication cookie is provided', async () => {
      // Arrange
      const req = { cookies: {} };
      const mockResponse = { setHeader: jest.fn() } as any;

      // Act & Assert
      await expect(controller.logout(req, mockResponse)).rejects.toThrow(
        new UnauthorizedException('No authentication cookie found'),
      );
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authService.logout fails', async () => {
      // Arrange
      const token = 'valid-token';
      const req = { cookies: { Authentication: token } };
      const mockResponse = { setHeader: jest.fn() } as any;
      const error = new Error('Logout failed');

      mockAuthService.logout.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.logout(req, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Logout failed'),
      );
      expect(mockAuthService.logout).toHaveBeenCalledWith(token);
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });
  });
});
