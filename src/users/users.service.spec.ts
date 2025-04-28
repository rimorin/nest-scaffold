import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { PaginationService } from '../common/pagination/pagination.service';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let paginationService: PaginationService;

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
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    paginationService = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('user lookup methods', () => {
    it('should find a user by username', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findOneByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should find a user by email', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should find a user by email or username', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const result = await service.findOne('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'test@example.com' }],
        },
      });
    });

    it('should find a user by id', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when user is not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      expect(await service.findOneByUsername('nonexistent')).toBeNull();
      expect(await service.findOneByEmail('nonexistent@example.com')).toBeNull();
      expect(await service.findOne('nonexistent')).toBeNull();
      expect(await service.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a user with provided fields', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'hashedpass',
        username: 'newuser',
        name: 'New User',
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUser,
        ...userData,
        id: 2,
      });

      const result = await service.create(userData);

      expect(result).toEqual(
        expect.objectContaining({
          id: 2,
          email: userData.email,
        }),
      );
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('status update methods', () => {
    it('should update user verification status', async () => {
      const updatedUser = { ...mockUser, verified: true };
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.setVerificationStatus(1, true);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          verified: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should update user disabled status', async () => {
      const updatedUser = { ...mockUser, disabled: true };
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.setDisabledStatus(1, true);

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

  describe('findAllPaginated', () => {
    it('should return paginated users with filters', async () => {
      const paginationOptions: PaginationQueryDto = {
        skip: 0,
        take: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const paginatedResult = {
        items: [mockUser],
        total: 1,
        page: 0,
        pageSize: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };

      jest.spyOn(paginationService, 'paginate').mockResolvedValue(paginatedResult);

      const result = await service.findAllPaginated(paginationOptions, { verified: true });

      expect(result).toEqual(paginatedResult);
      expect(paginationService.paginate).toHaveBeenCalledWith(
        prismaService.user,
        paginationOptions,
        { where: { verified: true } },
      );
    });
  });
});
