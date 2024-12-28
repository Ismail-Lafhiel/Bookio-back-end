import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Logger,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { Category } from './interfaces/category.interface';
import { Book } from 'src/books/interfaces/book.interface';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles, UserRole } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    this.logger.log(
      `Creating new category with name: ${createCategoryDto.name}`,
    );
    try {
      const category = await this.categoriesService.create(createCategoryDto);
      this.logger.log(`Category created successfully with ID: ${category.id}`);
      return category;
    } catch (error) {
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories or a message if none found',
    schema: {
      properties: {
        message: { type: 'string' },
        categories: {
          type: 'array',
          items: { $ref: '#/components/schemas/Category' },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(): Promise<{ message: string; categories: Category[] }> {
    return this.categoriesService.findAll();
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async findByName(@Query('name') name: string): Promise<Category[]> {
    this.logger.log(`Searching for categories with name: ${name}`);
    try {
      const categories = await this.categoriesService.findByName(name);
      this.logger.log(
        `Found ${categories.length} categories matching name: ${name}`,
      );
      return categories;
    } catch (error) {
      this.logger.error(
        `Failed to search categories by name: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Category> {
    this.logger.log(`Fetching category with ID: ${id}`);
    try {
      const category = await this.categoriesService.findOne(id);
      this.logger.log(`Found category: ${category.name}`);
      return category;
    } catch (error) {
      this.logger.error(
        `Failed to fetch category ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id/books')
  @HttpCode(HttpStatus.OK)
  async findBooksByCategory(
    @Param('id', ParseUUIDPipe) categoryId: string,
  ): Promise<Book[]> {
    return this.categoriesService.findBooksByCategory(categoryId);
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    this.logger.log(`Updating category with ID: ${id}`);
    try {
      const category = await this.categoriesService.update(
        id,
        updateCategoryDto,
      );
      this.logger.log(`Category ${id} updated successfully`);
      return category;
    } catch (error) {
      this.logger.error(
        `Failed to update category ${id}: ${error.message}`,
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
    this.logger.log(`Deleting category with ID: ${id}`);
    try {
      const result = await this.categoriesService.remove(id);
      this.logger.log(`Category ${id} deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to delete category ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
