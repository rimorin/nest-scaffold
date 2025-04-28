import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { UserResponseDto } from './dtos/user.dto';
import { PaginationService } from '../common/pagination/pagination.service';

// Mock implementation of UserResponseDto to test serialization
jest.mock('./dtos/user.dto', () => {
  class MockUserResponseDto {
    id: number;
    email: string;
    username: string | null;
    name: string | null;

    constructor(partial: any) {
      Object.assign(this, {
        id: partial.id,
        email: partial.email,
        username: partial.username,
        name: partial.name,
      });
    }

    toJSON() {
      return {
        id: this.id,
        email: this.email,
        username: this.username,
        name: this.name,
      };
    }
  }
  return { UserResponseDto: MockUserResponseDto };
});

describe('UsersController', () => {
  let controller: UsersController;

  // Mock user data for testing
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    verified: false,
    disabled: false,
  };

  const mockUsers = [
    mockUser,
    {
      ...mockUser,
      id: 2,
      email: 'user2@example.com',
      username: 'user2',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockUsers),
            findById: jest.fn().mockImplementation(id => {
              const user = mockUsers.find(u => u.id === id);
              return Promise.resolve(user || null);
            }),
            findAllPaginated: jest.fn().mockResolvedValue({
              items: mockUsers,
              meta: {
                totalItems: 2,
                itemCount: 2,
                itemsPerPage: 10,
                totalPages: 1,
                currentPage: 1,
              },
            }),
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

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return serialized users with only exposed fields', async () => {
      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toHaveLength(2);

      // Check first user's serialized properties
      expect(result[0]).toHaveProperty('id', mockUsers[0].id);
      expect(result[0]).toHaveProperty('email', mockUsers[0].email);
      expect(result[0]).toHaveProperty('username', mockUsers[0].username);
      expect(result[0]).toHaveProperty('name', mockUsers[0].name);

      // Verify excluded properties are not present
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
      expect(result[0]).not.toHaveProperty('disabled');
      expect(result[0]).not.toHaveProperty('verified');
    });
  });

  describe('findOne', () => {
    it('should return a serialized user with only exposed fields', async () => {
      // Act
      const result = await controller.findOne(1);

      // Assert
      expect(result).toBeInstanceOf(UserResponseDto);

      // Check exposed properties
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('name', mockUser.name);

      // Verify excluded properties are not present
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('disabled');
      expect(result).not.toHaveProperty('verified');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Act & Assert
      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users with serialized data', async () => {
      // Arrange
      const mockFilterDto = {
        skip: 0,
        take: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        username: 'test',
        email: 'example',
        verified: true,
        disabled: false,
      };

      const paginatedResult = {
        items: mockUsers,
        total: 2,
        page: 0,
        pageSize: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };

      const usersServiceMock = (
        await Test.createTestingModule({
          controllers: [UsersController],
          providers: [
            {
              provide: UsersService,
              useValue: {
                findAllPaginated: jest.fn(),
              },
            },
          ],
        }).compile()
      ).get<{ findAllPaginated: jest.Mock }>(UsersService);
      usersServiceMock.findAllPaginated.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.findAllPaginated(mockFilterDto);

      // Assert
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.items).toHaveLength(2);

      // Check that items are properly serialized
      expect(result.items[0]).toHaveProperty('email', mockUsers[0].email);
      expect(result.items[0]).toHaveProperty('username', mockUsers[0].username);
      expect(result.items[0]).not.toHaveProperty('password');

      // Check pagination metadata
      expect(result['meta']).toHaveProperty('totalItems', 2);
      expect(result['meta']).toHaveProperty('itemsPerPage', 10);
      expect(result['meta']).toHaveProperty('totalPages', 1);
      expect(result['meta']).toHaveProperty('currentPage', 1);
      expect(result['meta']).toHaveProperty('itemCount', 2);
    });
  });
});
