import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

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
            tokenBlacklist: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation(key => {
              const config = {
                'app.cookieDomain': 'example.com',
                'jwt.expiresIn': '1d',
                'jwt.secret': 'test-secret',
              };
              return config[key];
            }),
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
    it('should return user without password when credentials are valid', async () => {
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

      // Check that user is returned without password
      expect(result).toBeTruthy();
      expect(result.id).toEqual(mockUser.id);
      expect(result.username).toEqual(mockUser.username);
      expect(result.email).toEqual(mockUser.email);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith('nonexistent@example.com');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
      expect(result).toBeNull();
    });

    it('should return null when user account is disabled', async () => {
      // Arrange
      const disabledUser = { ...mockUser, disabled: true };
      jest.spyOn(usersService, 'findOne').mockResolvedValue(disabledUser);

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should generate JWT token and return cookie', () => {
      // Arrange
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        verified: false,
      };
      const mockToken = 'jwt-token';
      const mockCookie =
        'Authentication=jwt-token; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict; Secure';

      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);
      jest.spyOn(service as any, 'getTokenCookie').mockReturnValue(mockCookie);

      // Act
      const result = service.login(user);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        username: user.username,
        sub: user.id,
        verified: user.verified,
      });
      expect(result).toEqual({ cookie: mockCookie });
    });
  });

  describe('register', () => {
    it('should create new user and trigger welcome email', async () => {
      // Arrange
      const email = 'new@example.com';
      const password = 'Password123!';
      const username = 'newuser';
      const name = 'New User';
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
      expect(result).not.toHaveProperty('password');
    });

    it('should register with only required fields (email and password)', async () => {
      // Arrange
      const email = 'minimal@example.com';
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
      expect(usersService.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
        username: undefined,
        name: undefined,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException when email is already registered', async () => {
      // Arrange
      const email = 'existing@example.com';
      const password = 'Password123!';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(email, password)).rejects.toThrow(
        new BadRequestException('Email already in use'),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when username is already taken', async () => {
      // Arrange
      const email = 'new@example.com';
      const password = 'Password123!';
      const username = 'existinguser';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(email, password, username)).rejects.toThrow(
        new BadRequestException('Username already in use'),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should blacklist token with correct expiry time', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        sub: 1,
        email: 'test@example.com',
      };

      jest.spyOn(jwtService, 'decode').mockReturnValue(decodedToken);

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
      const createCall = (prismaService.tokenBlacklist.create as jest.Mock).mock.calls[0][0];
      // Verify expiration date matches token's expiration
      // const createCall = prismaService.tokenBlacklist.create.mock.calls[0][0];
      const expectedExpiry = new Date(decodedToken.exp * 1000);
      expect(createCall.data.expiresAt.getTime()).toEqual(expectedExpiry.getTime());
    });

    it('should throw BadRequestException for invalid tokens', async () => {
      // Arrange
      const token = 'invalid.token';
      jest.spyOn(jwtService, 'decode').mockReturnValue(null);

      // Act & Assert
      await expect(service.logout(token)).rejects.toThrow(new BadRequestException('Invalid token'));
      expect(prismaService.tokenBlacklist.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without sensitive information', async () => {
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
          name: mockUser.name,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException when user is not found', async () => {
      // Arrange
      const userId = 999;
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserProfile(userId)).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });
  });
});
