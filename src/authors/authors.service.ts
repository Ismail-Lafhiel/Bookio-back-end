// src/authors/authors.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Author } from './interfaces/author.interface';
import { v4 as uuidv4 } from 'uuid';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  AuthorNotFoundException,
  AuthorAlreadyExistsException,
  AuthorCreateException,
  AuthorUpdateException,
  AuthorDeleteException,
} from './exceptions/author.exceptions';

@Injectable()
export class AuthorsService {
  private readonly tableName = 'Authors';
  private readonly logger = new Logger(AuthorsService.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createAuthorDto: CreateAuthorDto): Promise<Author> {
    try {
      // Check for existing author with same name
      const existingAuthors = await this.findByName(createAuthorDto.name).catch(
        (error) => {
          if (error instanceof AuthorNotFoundException) {
            return [];
          }
          throw error;
        },
      );

      if (existingAuthors && existingAuthors.length > 0) {
        throw new AuthorAlreadyExistsException(createAuthorDto.name);
      }

      const author: Author = {
        id: uuidv4(),
        ...createAuthorDto,
        booksCount: 0,
        createdAt: new Date().toISOString(),
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: author,
        ConditionExpression: 'attribute_not_exists(id)',
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Created author with ID: ${author.id}`);
      return author;
    } catch (error) {
      this.logger.error(
        `Failed to create author: ${error.message}`,
        error.stack,
      );
      if (error instanceof AuthorAlreadyExistsException) {
        throw error;
      }
      throw new AuthorCreateException(error.message);
    }
  }

  async findAll(): Promise<Author[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return response.Items as Author[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch authors: ${error.message}`,
        error.stack,
      );
      throw new AuthorCreateException(error.message);
    }
  }

  async findOne(id: string): Promise<Author> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Item) {
        throw new AuthorNotFoundException(id);
      }

      return response.Item as Author;
    } catch (error) {
      this.logger.error(
        `Failed to fetch author ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof AuthorNotFoundException) {
        throw error;
      }
      throw new AuthorCreateException(error.message);
    }
  }

  async findByName(name: string): Promise<Author[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'NameIndex',
        KeyConditionExpression: '#name = :name',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
        },
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return (response.Items || []) as Author[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch authors by name ${name}: ${error.message}`,
        error.stack,
      );
      throw new AuthorCreateException(error.message);
    }
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<Author> {
    try {
      // Check if author exists
      const existingAuthor = await this.findOne(id);

      // If name is being updated, check for duplicates
      if (
        updateAuthorDto.name &&
        updateAuthorDto.name !== existingAuthor.name
      ) {
        const existingAuthors = await this.findByName(
          updateAuthorDto.name,
        ).catch((error) => {
          if (error instanceof AuthorNotFoundException) {
            return [];
          }
          throw error;
        });

        if (existingAuthors && existingAuthors.length > 0) {
          throw new AuthorAlreadyExistsException(updateAuthorDto.name);
        }
      }

      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updateAuthorDto).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      // Add updatedAt timestamp
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
      this.logger.log(`Updated author with ID: ${id}`);
      return response.Attributes as Author;
    } catch (error) {
      this.logger.error(
        `Failed to update author ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof AuthorNotFoundException ||
        error instanceof AuthorAlreadyExistsException
      ) {
        throw error;
      }
      throw new AuthorUpdateException(error.message);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const author = await this.findOne(id);

      if (author.booksCount > 0) {
        throw new AuthorDeleteException(
          'Cannot delete author with existing books',
        );
      }

      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Deleted author with ID: ${id}`);

      return {
        message: `Author with ID "${id}" has been successfully deleted`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete author ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof AuthorNotFoundException) {
        throw error;
      }
      throw new AuthorDeleteException(error.message);
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
      this.logger.log(`Incremented books count for author ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to increment books count for author ${id}: ${error.message}`,
        error.stack,
      );
      throw new AuthorUpdateException(error.message);
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
      this.logger.log(`Decremented books count for author ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to decrement books count for author ${id}: ${error.message}`,
        error.stack,
      );
      throw new AuthorUpdateException(error.message);
    }
  }
}
