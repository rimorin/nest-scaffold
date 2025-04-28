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
    it('should return user (without password) when credentials are valid', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(usersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(result).toBeTruthy();
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found or invalid credentials', async () => {
      // User not found
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);
      expect(await service.validateUser('nonexistent@example.com', 'password')).toBeNull();

      // Password incorrect
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      expect(await service.validateUser('test@example.com', 'wrongpassword')).toBeNull();

      // User disabled
      jest.spyOn(usersService, 'findOne').mockResolvedValue({ ...mockUser, disabled: true });
      expect(await service.validateUser('test@example.com', 'password')).toBeNull();
    });
  });

  describe('login', () => {
    it('should generate JWT token and return cookie', () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        verified: false,
      };
      const mockCookie =
        'Authentication=test-token; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict; Secure';
      jest.spyOn(service as any, 'getTokenCookie').mockReturnValue(mockCookie);

      const result = service.login(user);

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
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);

      const result = await service.register(
        'new@example.com',
        'Password123!',
        'newuser',
        'New User',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(usersService.create).toHaveBeenCalled();
      expect(queueService.addJob).toHaveBeenCalledWith('send-welcome-mail', expect.any(Object));
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException when email or username already exists', async () => {
      // Email exists
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);
      await expect(service.register('existing@example.com', 'Password123!')).rejects.toThrow(
        BadRequestException,
      );

      // Username exists
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findOneByUsername').mockResolvedValue(mockUser);
      await expect(
        service.register('new@example.com', 'Password123!', 'existinguser'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should blacklist token with correct expiry time', async () => {
      const token = 'valid.jwt.token';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 1,
        email: 'test@example.com',
      };
      jest.spyOn(jwtService, 'decode').mockReturnValue(decodedToken);

      await service.logout(token);

      expect(prismaService.tokenBlacklist.create).toHaveBeenCalledWith({
        data: {
          token,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException for invalid tokens', async () => {
      jest.spyOn(jwtService, 'decode').mockReturnValue(null);
      await expect(service.logout('invalid.token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without sensitive information', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);

      const result = await service.getUserProfile(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException when user not found', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);
      await expect(service.getUserProfile(999)).rejects.toThrow(BadRequestException);
    });
  });
});
