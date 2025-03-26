import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let queueService: QueueService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    verified: false,
    disabled: false,
  };

  const mockToken = 'test-token';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findOneByEmail: jest.fn(),
            findOneByUsername: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(mockToken),
            decode: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            tokenBlacklist: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object without password when validation is successful', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const identifier = 'test@example.com';
      const password = 'password';

      // Act
      const result = await service.validateUser(identifier, password);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(identifier);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      const identifier = 'wrong@example.com';
      const password = 'password';

      // Act
      const result = await service.validateUser(identifier, password);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(identifier);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const identifier = 'test@example.com';
      const password = 'wrongpassword';

      // Act
      const result = await service.validateUser(identifier, password);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(identifier);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toBeNull();
    });

    it('should return null when user is disabled', async () => {
      // Arrange
      const disabledUser = { ...mockUser, disabled: true };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(disabledUser);
      const identifier = 'test@example.com';
      const password = 'password';

      // Act
      const result = await service.validateUser(identifier, password);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith(identifier);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token with correct payload', () => {
      // Arrange
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        verified: false,
      };

      // Act
      const result = service.login(user);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        username: user.username,
        sub: user.id,
        verified: user.verified,
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ access_token: mockToken });
    });
  });

  describe('register', () => {
    it('should register a new user and return user without password', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const username = 'testuser';
      const name = 'Test User';
      const hashedPassword = 'hashedpassword';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);

      // Act
      const result = await service.register(email, password, username, name);

      // Assert
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(usersService.findOneByUsername).toHaveBeenCalledWith(username);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email,
        username,
        password: hashedPassword,
        name,
      });
      expect(queueService.addJob).toHaveBeenCalledWith('send-welcome-mail', {
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          username: expect.any(String),
          email: expect.any(String),
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should register without optional username and name', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const hashedPassword = 'hashedpassword';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);

      // Act
      const result = await service.register(email, password);

      // Assert
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(usersService.findOneByUsername).not.toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email,
        username: undefined,
        password: hashedPassword,
        name: undefined,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException if email already exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if username already exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Password123!';
      const username = 'testuser';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(email, password, username)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(usersService.findOneByUsername).toHaveBeenCalledWith(username);
      expect(usersService.create).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should add token to blacklist with correct expiry', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        sub: 1,
        email: 'test@example.com',
      };
      jest.spyOn(jwtService, 'decode').mockReturnValue(decodedToken);
      // jest.spyOn(prismaService.tokenBlacklist, 'create').mockResolvedValue({
      //   token,
      //   expiresAt: new Date(decodedToken.exp * 1000),

      // });

      // Act
      await service.logout(token);

      // Assert
      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(prismaService.tokenBlacklist.create).toHaveBeenCalledWith({
        data: {
          token,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Arrange
      const token = 'invalid.token';
      jest.spyOn(jwtService, 'decode').mockReturnValue(null);

      // Act & Assert
      await expect(service.logout(token)).rejects.toThrow(BadRequestException);
      expect(prismaService.tokenBlacklist.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without password', async () => {
      // Arrange
      const userId = 1;
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserProfile(userId);

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException if user is not found', async () => {
      // Arrange
      const userId = 999;
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserProfile(userId)).rejects.toThrow(BadRequestException);
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });
  });
});
