import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsISBN,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { BookStatus } from '../interfaces/book.interface';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID()
  @IsNotEmpty()
  authorId: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsISBN()
  @IsNotEmpty()
  isbn: string;

  @IsEnum(BookStatus)
  @IsNotEmpty()
  status: BookStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear())
  @IsOptional()
  publishedYear?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
