import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { Book } from './interfaces/book.interface';

@Controller('books')
@UseGuards(CognitoAuthGuard)
export class BooksController {
  private readonly logger = new Logger(BooksController.name);

  constructor(private readonly booksService: BooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true })) createBookDto: CreateBookDto,
  ): Promise<Book> {
    this.logger.log(`Creating new book with title: ${createBookDto.title}`);
    try {
      const book = await this.booksService.create(createBookDto);
      this.logger.log(`Book created successfully with ID: ${book.id}`);
      return book;
    } catch (error) {
      this.logger.error(`Failed to create book: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Book[]> {
    this.logger.log('Fetching all books');
    try {
      const books = await this.booksService.findAll();
      this.logger.log(`Found ${books.length} books`);
      return books;
    } catch (error) {
      this.logger.error(`Failed to fetch books: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async findByISBN(@Query('isbn') isbn: string): Promise<Book[]> {
    this.logger.log(`Searching for book with ISBN: ${isbn}`);
    try {
      const books = await this.booksService.findByISBN(isbn);
      this.logger.log(`Found ${books.length} books matching ISBN: ${isbn}`);
      return books;
    } catch (error) {
      this.logger.error(
        `Failed to search books by ISBN: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Book> {
    this.logger.log(`Fetching book with ID: ${id}`);
    try {
      const book = await this.booksService.findOne(id);
      this.logger.log(`Found book: ${book.title}`);
      return book;
    } catch (error) {
      this.logger.error(`Failed to fetch book: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    this.logger.log(`Updating book with ID: ${id}`);
    try {
      const book = await this.booksService.update(id, updateBookDto);
      this.logger.log(`Book ${id} updated successfully`);
      return book;
    } catch (error) {
      this.logger.error(`Failed to update book: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting book with ID: ${id}`);
    try {
      const result = await this.booksService.remove(id);
      this.logger.log(`Book ${id} deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete book: ${error.message}`, error.stack);
      throw error;
    }
  }
}