import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from './pagination.dto';
import { PaginationResponseDto } from './pagination-response.dto';

/**
 * Service for handling pagination with Prisma queries
 */
@Injectable()
export class PaginationService {
  /**
   * Execute a paginated query using Prisma
   *
   * @param model - The Prisma model to query (e.g., prismaService.user)
   * @param paginationOptions - The pagination parameters (skip, take, sortBy, sortOrder)
   * @param findManyArgs - Additional Prisma query arguments like where, include, select
   * @returns A standardized pagination response with items and metadata
   */
  async paginate<
    T,
    K extends {
      findMany: (args: any) => Promise<T[]>;
      count: (args?: any) => Promise<number>;
    },
  >(
    model: K,
    paginationOptions: PaginationQueryDto,
    findManyArgs: Omit<any, 'skip' | 'take' | 'orderBy'> = {},
  ): Promise<PaginationResponseDto<T>> {
    const { skip = 0, take = 10, sortBy, sortOrder = 'desc' } = paginationOptions;

    // Prepare the orderBy object if sorting is specified
    const orderBy = sortBy ? { [sortBy]: sortOrder } : undefined;

    // Get the items with pagination and any additional query arguments
    const items = await model.findMany({
      ...findManyArgs,
      skip,
      take,
      ...(orderBy && { orderBy }),
    });

    // Get the total count with the same filters
    const total = await model.count({
      ...(findManyArgs.where ? { where: findManyArgs.where } : {}),
    });

    // Calculate pagination metadata
    const page = Math.floor(skip / take);
    const totalPages = Math.ceil(total / take);

    return {
      items,
      total,
      page,
      pageSize: take,
      totalPages,
      hasNextPage: skip + take < total,
      hasPrevPage: skip > 0,
    };
  }
}
