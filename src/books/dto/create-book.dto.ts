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
  Length,
  IsUrl,
} from 'class-validator';
import { BookStatus } from '../interfaces/book.interface';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @Length(1, 255, { message: 'Title must be between 1 and 255 characters' })
  title: string;

  @IsUUID('4', { message: 'Author ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Author ID is required' })
  authorId: string;

  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId: string;

  @IsISBN('13', { message: 'ISBN must be a valid 13-digit ISBN' })
  @IsNotEmpty({ message: 'ISBN is required' })
  isbn: string;

  @IsEnum(BookStatus, {
    message: 'Status must be either AVAILABLE or BORROWED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: BookStatus;

  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: 'Description can be up to 1000 characters' })
  description?: string;

  @IsInt({ message: 'Published year must be an integer' })
  @Min(1000, { message: 'Published year must be at least 1000' })
  @Max(new Date().getFullYear(), {
    message: `Published year cannot be in the future`,
  })
  @IsOptional()
  publishedYear?: number;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity cannot be negative' })
  @IsOptional()
  quantity?: number;

  @IsUrl({}, { message: 'Cover URL must be a valid URL' })
  @IsOptional()
  coverUrl?: string;

  @IsUrl({}, { message: 'PDF URL must be a valid URL' })
  @IsOptional()
  pdfUrl?: string;
}