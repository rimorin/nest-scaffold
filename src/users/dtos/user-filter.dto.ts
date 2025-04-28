import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

// Define allowed sort fields to prevent potential SQL injection
export enum UserSortField {
  ID = 'id',
  USERNAME = 'username',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class UserFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by username (partial match)',
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_.-]*$',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_.-]*$/, {
    message: 'Username must only contain alphanumeric characters, underscores, dots, or hyphens',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Filter by email (partial match)',
    maxLength: 100,
    pattern: '^[a-zA-Z0-9._%+-@]*$',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9._%+-@]*$/, {
    message: 'Email filter must only contain valid email characters',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by disabled status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  disabled?: boolean;
}
