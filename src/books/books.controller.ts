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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './interfaces/book.interface';
import { CognitoAuthGuard } from 'src/auth/cognito.guard';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
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

  @Patch(':id')
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
  async borrow(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<Book> {
    const borrowerId = req.user.sub;
    return this.booksService.borrow(id, borrowerId);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.booksService.remove(id);
  }
}
