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
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { Author } from './interfaces/author.interface';
import { Book } from 'src/books/interfaces/book.interface';
import { Roles, UserRole } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('authors')
export class AuthorsController {
  private readonly logger = new Logger(AuthorsController.name);

  constructor(private readonly authorsService: AuthorsService) {}

  @Post()
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async create(
    @Body(new ValidationPipe({ transform: true }))
    createAuthorDto: CreateAuthorDto,
    @UploadedFile() profilePicture: Express.Multer.File,
  ): Promise<Author> {
    this.logger.log(`Creating new author with name: ${createAuthorDto.name}`);
    try {
      const author = await this.authorsService.create(
        createAuthorDto,
        profilePicture,
      );
      this.logger.log(`Author created successfully with ID: ${author.id}`);
      return author;
    } catch (error) {
      this.logger.error(
        `Failed to create author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('limit') limit = 10,
    @Query('lastEvaluatedKey') lastEvaluatedKey?: string,
  ): Promise<{
    message: string;
    authors: Author[];
    lastEvaluatedKey?: string;
  }> {
    this.logger.log('Fetching all authors');
    try {
      const result = await this.authorsService.findAll(limit, lastEvaluatedKey);
      this.logger.log(`Found ${result.authors.length} authors`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch authors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async findByName(
    @Query('name') name: string,
    @Query('limit') limit = 10,
    @Query('lastEvaluatedKey') lastEvaluatedKey?: string,
  ): Promise<{
    message: string;
    authors: Author[];
    lastEvaluatedKey?: string;
  }> {
    this.logger.log(`Searching for author with name: ${name}`);
    try {
      const result = await this.authorsService.findByName(
        name,
        limit,
        lastEvaluatedKey,
      );
      this.logger.log(
        `Found ${result.authors.length} authors matching name: ${name}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to search authors by name: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; author: Author }> {
    this.logger.log(`Fetching author with ID: ${id}`);
    try {
      const result = await this.authorsService.findOne(id);
      this.logger.log(`Found author: ${result.author.name}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id/books')
  @HttpCode(HttpStatus.OK)
  async findBooksByAuthor(
    @Param('id', ParseUUIDPipe) authorId: string,
  ): Promise<{ message: string; books: Book[] }> {
    return this.authorsService.findBooksByAuthor(authorId);
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    updateAuthorDto: UpdateAuthorDto,
    @UploadedFile() profilePicture: Express.Multer.File,
  ): Promise<{ message: string; author: Author }> {
    this.logger.log(`Updating author with ID: ${id}`);
    try {
      const result = await this.authorsService.update(
        id,
        updateAuthorDto,
        profilePicture,
      );
      this.logger.log(`Author ${id} updated successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting author with ID: ${id}`);
    try {
      const result = await this.authorsService.remove(id);
      this.logger.log(`Author ${id} deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to delete author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
