// src/books/dto/create-book.dto.ts
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsISBN,
  IsInt,
  Min,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  publishedYear: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  quantity: number;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  pdf?: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  rating?: number;
}
