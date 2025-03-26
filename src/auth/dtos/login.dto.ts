import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username or email for authentication',
    example: 'john_doe or user@example.com',
    minLength: 3,
  })
  @IsString({ message: 'Identifier must be a string' })
  @IsNotEmpty({ message: 'Username or email is required' })
  @MinLength(3, { message: 'Identifier must be at least 3 characters long' })
  identifier: string;

  @ApiProperty({
    description: 'User password',
    example: 'Pass123!',
    minLength: 8,
    maxLength: 32,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password cannot exceed 32 characters' })
  password: string;
}
