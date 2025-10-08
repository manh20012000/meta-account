import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class SearchUserDto {
  @IsString()
  @IsOptional()
  search!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip: number = 0;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit: number = 20;
}
