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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { Author } from './interfaces/author.interface';

@Controller('authors')
@UseGuards(CognitoAuthGuard)
export class AuthorsController {
  private readonly logger = new Logger(AuthorsController.name);

  constructor(private readonly authorsService: AuthorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async create(
    @Body(new ValidationPipe({ transform: true })) createAuthorDto: CreateAuthorDto,
    @UploadedFile() profilePicture: Express.Multer.File,
  ): Promise<Author> {
    this.logger.log(`Creating new author with name: ${createAuthorDto.name}`);
    try {
      const author = await this.authorsService.create(createAuthorDto, profilePicture);
      this.logger.log(`Author created successfully with ID: ${author.id}`);
      return author;
    } catch (error) {
      this.logger.error(`Failed to create author: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Author[]> {
    this.logger.log('Fetching all authors');
    try {
      const authors = await this.authorsService.findAll();
      this.logger.log(`Found ${authors.length} authors`);
      return authors;
    } catch (error) {
      this.logger.error(`Failed to fetch authors: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async findByName(@Query('name') name: string): Promise<Author[]> {
    this.logger.log(`Searching for author with name: ${name}`);
    try {
      const authors = await this.authorsService.findByName(name);
      this.logger.log(`Found ${authors.length} authors matching name: ${name}`);
      return authors;
    } catch (error) {
      this.logger.error(`Failed to search authors by name: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Author> {
    this.logger.log(`Fetching author with ID: ${id}`);
    try {
      const author = await this.authorsService.findOne(id);
      this.logger.log(`Found author: ${author.name}`);
      return author;
    } catch (error) {
      this.logger.error(`Failed to fetch author: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) updateAuthorDto: UpdateAuthorDto,
    @UploadedFile() profilePicture: Express.Multer.File,
  ): Promise<Author> {
    this.logger.log(`Updating author with ID: ${id}`);
    try {
      const author = await this.authorsService.update(id, updateAuthorDto, profilePicture);
      this.logger.log(`Author ${id} updated successfully`);
      return author;
    } catch (error) {
      this.logger.error(`Failed to update author: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting author with ID: ${id}`);
    try {
      const result = await this.authorsService.remove(id);
      this.logger.log(`Author ${id} deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete author: ${error.message}`, error.stack);
      throw error;
    }
  }
}
