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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { Category } from './interfaces/category.interface';

@Controller('categories')
@UseGuards(CognitoAuthGuard)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
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
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<Category[]> {
    this.logger.log('Fetching all categories');
    try {
      const categories = await this.categoriesService.findAll();
      this.logger.log(`Found ${categories.length} categories`);
      return categories;
    } catch (error) {
      this.logger.error(
        `Failed to fetch categories: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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

  @Patch(':id')
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
