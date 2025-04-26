import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
/**
 * Data Transfer Object for User entity responses
 * Uses class-transformer decorators to control serialization
 */
export class UserResponseDto implements User {
  @Expose()
  @ApiProperty({ description: "User's full name", nullable: true })
  name: string | null;

  @Expose()
  @ApiProperty({ description: 'Unique identifier for the user' })
  id: number;

  @Expose()
  @ApiProperty({ description: 'Email address of the user' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Username of the user', nullable: true })
  username: string | null;

  @Exclude()
  password: string;

  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  @ApiProperty({ description: 'When the user was created' })
  createdAt: Date;

  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  @ApiProperty({ description: 'When the user was last updated', nullable: true })
  updatedAt: Date | null;

  @Exclude()
  @ApiProperty({ description: 'Whether the user account is disabled' })
  disabled: boolean;

  @Exclude()
  @ApiProperty({ description: 'Whether the user account is verified' })
  verified: boolean;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
