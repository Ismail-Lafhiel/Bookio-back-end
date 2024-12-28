import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  BadRequestException,
  ValidationPipe,
  UseGuards,
  Request,
  Query,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './interfaces/book.interface';
import { CognitoAuthGuard } from 'src/auth/cognito.guard';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(CognitoAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'cover') {
            if (!file.mimetype.match(/^image\/(jpg|jpeg|png)$/)) {
              return callback(
                new BadRequestException(
                  'Invalid cover image format. Only JPG, JPEG, and PNG are allowed',
                ),
                false,
              );
            }
          }
          if (file.fieldname === 'pdf') {
            if (file.mimetype !== 'application/pdf') {
              return callback(
                new BadRequestException(
                  'Invalid file format. Only PDF files are allowed',
                ),
                false,
              );
            }
          }
          callback(null, true);
        },
      },
    ),
  )
  async create(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createBookDto: CreateBookDto,
    @UploadedFiles()
    files: {
      cover?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    },
  ): Promise<Book> {
    return this.booksService.create(createBookDto, files);
  }

  @Get()
  async findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Book> {
    return this.booksService.findOne(id);
  }

  @Get('category/:categoryId')
  async findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<Book[]> {
    return this.booksService.findByCategory(categoryId);
  }

  @Get('author/:authorId')
  async findByAuthor(
    @Param('authorId', ParseUUIDPipe) authorId: string,
  ): Promise<Book[]> {
    return this.booksService.findByAuthor(authorId);
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
        },
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'cover') {
            if (!file.mimetype.match(/^image\/(jpg|jpeg|png)$/)) {
              return callback(
                new BadRequestException(
                  'Invalid cover image format. Only JPG, JPEG, and PNG are allowed',
                ),
                false,
              );
            }
          }
          if (file.fieldname === 'pdf') {
            if (file.mimetype !== 'application/pdf') {
              return callback(
                new BadRequestException(
                  'Invalid file format. Only PDF files are allowed',
                ),
                false,
              );
            }
          }
          callback(null, true);
        },
      },
    ),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles()
    files: {
      cover?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    },
  ): Promise<Book> {
    return this.booksService.update(id, updateBookDto, files);
  }

  @Patch(':id/borrow')
  @UseGuards(CognitoAuthGuard)
  @ApiOperation({ summary: 'Borrow a book' })
  @ApiResponse({ status: 200, description: 'Book borrowed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Various validation errors',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async borrow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() borrowBookDto: BorrowBookDto,
    @Request() req,
  ): Promise<Book> {
    try {
      const borrowerId = req.user.sub;
      const result = await this.booksService.borrow(id, {
        ...borrowBookDto,
        borrowerId,
      });
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to borrow book');
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.booksService.remove(id);
  }

  @Get('borrowed/me')
  @UseGuards(CognitoAuthGuard)
  @ApiOperation({ summary: 'Get all books borrowed by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all books borrowed by the user',
    schema: {
      properties: {
        message: { type: 'string' },
        books: {
          type: 'array',
          items: { $ref: '#/components/schemas/Book' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  async getMyBorrowedBooks(
    @Request() req,
  ): Promise<{ message: string; books: Book[] }> {
    const userId = req.user.sub;
    console.log('User ID from Cognito:', userId); // Debug log
    return this.booksService.findBorrowedBooksByUser(userId);
  }
}
