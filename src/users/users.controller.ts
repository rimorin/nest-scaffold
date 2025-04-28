import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from './dtos/user.dto';
import { UserFilterDto } from './dtos/user-filter.dto';
import { PaginationResponseDto } from '../common/pagination/pagination-response.dto';

/**
 * Controller for managing users
 */
@ApiTags('users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('paginated')
  @ApiOperation({ summary: 'Get users with pagination, sorting, and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated users',
    type: PaginationResponseDto,
  })
  async findAllPaginated(@Query() filterDto: UserFilterDto) {
    // Extract pagination parameters from the filter DTO
    const { username, email, verified, disabled, ...paginationOptions } = filterDto;

    // Build the filter object for Prisma with security measures
    const filters: Record<string, any> = {};

    // Apply regex-validated username filter if provided
    if (username !== undefined) {
      // The validation in UserFilterDto ensures the username only contains safe characters
      filters.username = { contains: username, mode: 'insensitive' };
    }

    // Apply regex-validated email filter if provided
    if (email !== undefined) {
      // The validation in UserFilterDto ensures the email only contains safe characters
      filters.email = { contains: email, mode: 'insensitive' };
    }

    // Apply strictly boolean filters
    if (verified !== undefined) {
      filters.verified = verified;
    }

    if (disabled !== undefined) {
      filters.disabled = disabled;
    }

    // Get paginated results
    const paginatedResult = await this.usersService.findAllPaginated(paginationOptions, filters);

    // Transform users to DTOs
    paginatedResult.items = paginatedResult.items.map(user => new UserResponseDto(user));

    return paginatedResult;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns all users',
    type: [UserResponseDto],
  })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(user => new UserResponseDto(user));
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({
    status: 200,
    description: 'Returns a user by id',
    type: UserResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return new UserResponseDto(user);
  }
}
