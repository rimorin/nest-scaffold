export class ProfileResponseDto {
  id: number;
  username: string;
  isActive: boolean;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
