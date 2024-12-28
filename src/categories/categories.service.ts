// src/categories/categories.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './interfaces/category.interface';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  CategoryNotFoundException,
  CategoryAlreadyExistsException,
  CategoryCreateException,
  CategoryUpdateException,
  CategoryDeleteException,
  CategoryNotFoundByNameException,
} from './exceptions/category.exceptions';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { Book, BookStatus } from 'src/books/interfaces/book.interface';

@Injectable()
export class CategoriesService {
  private readonly tableName = 'Categories';
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      // Check for existing category with same name
      const existingCategories = await this.findByName(
        createCategoryDto.name,
        1,
      ).catch((error) => {
        // If category not found, that's good - continue with creation
        if (error instanceof CategoryNotFoundByNameException) {
          return { categories: [] };
        }
        throw error;
      });

      if (existingCategories && existingCategories.categories.length > 0) {
        throw new CategoryAlreadyExistsException(createCategoryDto.name);
      }

      const category: Category = {
        id: uuidv4(),
        ...createCategoryDto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        booksCount: 0,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: category,
        ConditionExpression: 'attribute_not_exists(id)',
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Created category with ID: ${category.id}`);
      return category;
    } catch (error) {
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
      );
      if (error instanceof CategoryAlreadyExistsException) {
        throw error;
      }
      throw new CategoryCreateException(error.message);
    }
  }

  async findAll(limit: number, lastEvaluatedKey?: string): Promise<{ message: string; categories: Category[]; lastEvaluatedKey?: string }> {
    try {
      const params: any = {
        TableName: this.tableName,
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = { id: lastEvaluatedKey };
      }

      const command = new ScanCommand(params);
      const response = await this.dynamoDBService.documentClient.send(command);
      const categories = response.Items as Category[];

      if (!categories || categories.length === 0) {
        return {
          message: 'No categories found',
          categories: [],
        };
      }

      return {
        message: 'Categories retrieved successfully',
        categories,
        lastEvaluatedKey: response.LastEvaluatedKey ? response.LastEvaluatedKey.id : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch categories: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Item) {
        throw new CategoryNotFoundException(id);
      }

      return response.Item as Category;
    } catch (error) {
      this.logger.error(
        `Failed to fetch category ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof CategoryNotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByName(name: string, limit: number, lastEvaluatedKey?: string): Promise<{ categories: Category[]; lastEvaluatedKey?: string }> {
    try {
      const params: any = {
        TableName: this.tableName,
        IndexName: 'NameIndex',
        KeyConditionExpression: '#name = :name',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
        },
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = { id: lastEvaluatedKey };
      }

      const command = new QueryCommand(params);
      const response = await this.dynamoDBService.documentClient.send(command);
      const categories = response.Items as Category[];

      if (!categories || categories.length === 0) {
        throw new CategoryNotFoundByNameException(name);
      }

      return {
        categories,
        lastEvaluatedKey: response.LastEvaluatedKey ? response.LastEvaluatedKey.id : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch categories by name ${name}: ${error.message}`, error.stack);
      if (error instanceof CategoryNotFoundByNameException) {
        throw error;
      }
      throw new HttpException('Failed to fetch categories by name', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      // Check if category exists
      await this.findOne(id);

      // If name is being updated, check for duplicates
      if (updateCategoryDto.name) {
        const existingCategories = await this.findByName(
          updateCategoryDto.name,
          1,
        ).catch((error) => {
          // If category not found, that's good - continue with update
          if (error instanceof CategoryNotFoundByNameException) {
            return { categories: [] };
          }
          throw error;
        });

        if (
          existingCategories &&
          existingCategories.categories.length > 0 &&
          existingCategories.categories[0].id !== id
        ) {
          throw new CategoryAlreadyExistsException(updateCategoryDto.name);
        }
      }

      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      if (updateCategoryDto.name) {
        updateExpression.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updateCategoryDto.name;
      }

      if (updateCategoryDto.description) {
        updateExpression.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] =
          updateCategoryDto.description;
      }

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Updated category with ID: ${id}`);
      return response.Attributes as Category;
    } catch (error) {
      this.logger.error(
        `Failed to update category ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof CategoryNotFoundException ||
        error instanceof CategoryAlreadyExistsException
      ) {
        throw error;
      }
      throw new CategoryUpdateException(error.message);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      // checking if category exists
      await this.findOne(id);

      // Checking if category has any books
      const category = await this.findOne(id);
      if (category.booksCount > 0) {
        throw new HttpException(
          'Cannot delete category with existing books',
          HttpStatus.CONFLICT,
        );
      }

      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Deleted category with ID: ${id}`);

      return {
        message: `Category with ID "${id}" has been successfully deleted`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete category ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof CategoryNotFoundException) {
        throw error;
      }
      throw new CategoryDeleteException(error.message);
    }
  }

  async incrementBooksCount(id: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET booksCount = booksCount + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Incremented books count for category ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to increment books count for category ${id}: ${error.message}`,
        error.stack,
      );
      throw new CategoryUpdateException(error.message);
    }
  }

  async decrementBooksCount(id: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET booksCount = booksCount - :dec',
        ConditionExpression: 'booksCount > :zero',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':zero': 0,
        },
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Decremented books count for category ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to decrement books count for category ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof ConditionalCheckFailedException) {
        throw new HttpException(
          'Books count cannot be negative',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new CategoryUpdateException(error.message);
    }
  }

  async findBooksByCategory(categoryId: string): Promise<Book[]> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new QueryCommand({
          TableName: 'Books',
          IndexName: 'CategoryIndex',
          KeyConditionExpression: 'categoryId = :categoryId',
          ExpressionAttributeValues: {
            ':categoryId': categoryId,
          },
        }),
      );

      const books = result.Items as Book[];

      // Update status based on quantity
      books.forEach((book) => {
        if (book.quantity > 0) {
          book.status = BookStatus.AVAILABLE;
        } else {
          book.status = BookStatus.UNAVAILABLE;
        }
      });

      return books;
    } catch (error) {
      this.logger.error(
        `Failed to fetch books by category: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addBookToCategory(categoryId: string): Promise<void> {
    try {
      await this.incrementBooksCount(categoryId);
      this.logger.log(`Added book to category ${categoryId}`);
    } catch (error) {
      this.logger.error(
        `Failed to add book to category ${categoryId}: ${error.message}`,
        error.stack,
      );
      throw new CategoryUpdateException(error.message);
    }
  }
}
