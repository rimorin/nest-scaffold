import { User } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto implements User {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ description: "User's full name", nullable: true })
  name: string | null;

  @Expose()
  @ApiProperty({ description: 'Email address of the user' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Username of the user', nullable: true })
  username: string | null;

  @Exclude()
  password: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date | null;

  @Exclude()
  disabled: boolean;

  @Exclude()
  verified: boolean;

  constructor(partial: Partial<ProfileResponseDto>) {
    Object.assign(this, partial);
  }
}
