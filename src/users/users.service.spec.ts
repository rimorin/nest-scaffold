import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    verified: false,
    disabled: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByUsername', () => {
    it('should find a user by username', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOneByUsername('testuser');

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await service.findOneByUsername('nonexistent');

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
    });
  });

  describe('findOneByEmail', () => {
    it('should find a user by email', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOneByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when email not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await service.findOneByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });
  });

  describe('findOne', () => {
    it('should find a user by email or username', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
        },
      });
    });

    it('should return null when identifier not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      // Act
      const result = await service.findOne('nonexistent');

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'nonexistent' }, { username: 'nonexistent' }],
        },
      });
    });
  });

  describe('create', () => {
    it('should create a new user with all fields', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'hashedpass',
        name: 'New User',
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUser,
        ...userData,
        id: 2,
      });

      // Act
      const result = await service.create(userData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: 2,
          email: userData.email,
          username: userData.username,
          password: userData.password,
          name: userData.name,
        }),
      );

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should create a user without optional fields', async () => {
      // Arrange
      const userData = {
        email: 'minimal@example.com',
        password: 'hashedpass',
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUser,
        ...userData,
        username: null,
        name: null,
        id: 3,
      });

      // Act
      const result = await service.create(userData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: 3,
          email: userData.email,
          password: userData.password,
        }),
      );

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when id not found', async () => {
      // Arrange
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Act
      const result = await service.findById(999);

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('setVerificationStatus', () => {
    it('should update user verification status', async () => {
      // Arrange
      const updatedUser = { ...mockUser, verified: true, updatedAt: new Date() };
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.setVerificationStatus(1, true);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          verified: true,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('setDisabledStatus', () => {
    it('should update user disabled status', async () => {
      // Arrange
      const updatedUser = { ...mockUser, disabled: true, updatedAt: new Date() };
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.setDisabledStatus(1, true);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          disabled: true,
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});
