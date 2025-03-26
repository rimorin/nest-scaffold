import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsAlphanumeric,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email for registration',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Optional username for registration',
    example: 'john_eric',
    minLength: 3,
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @IsAlphanumeric(undefined, { message: 'Username can only contain letters and numbers' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
  username?: string;

  @ApiProperty({
    description: 'Optional name for registration',
    example: 'John Smith',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description:
      'User password - must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    example: 'Pass123!',
    minLength: 8,
    maxLength: 32,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password cannot exceed 32 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}
