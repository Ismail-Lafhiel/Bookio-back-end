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
import { S3Service } from '../s3/s3.service';
import { Book, BookStatus } from 'src/books/interfaces/book.interface';
@Injectable()
export class AuthorsService {
  private readonly tableName = 'Authors';
  private readonly logger = new Logger(AuthorsService.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createAuthorDto: CreateAuthorDto,
    profilePicture?: Express.Multer.File,
  ): Promise<Author> {
    try {
      // Validate profile field to only accept images
      if (profilePicture && !profilePicture.mimetype.startsWith('image/')) {
        throw new Error('Profile must be an image file');
      }

      const existingAuthorsResult = await this.findByName(
        createAuthorDto.name,
        1,
      ).catch((error) => {
        if (error instanceof AuthorNotFoundException) {
          return { authors: [] };
        }
        throw error;
      });

      const existingAuthors = existingAuthorsResult.authors;

      if (existingAuthors && existingAuthors.length > 0) {
        throw new AuthorAlreadyExistsException(createAuthorDto.name);
      }

      let profileUrl: string | undefined;
      if (profilePicture) {
        profileUrl = await this.s3Service.uploadFile(
          profilePicture,
          'authors/profiles',
        );
      }

      const author: Author = {
        id: uuidv4(),
        ...createAuthorDto,
        profile: profileUrl,
        booksCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  async findAll(
    limit: number,
    lastEvaluatedKey?: string,
  ): Promise<{
    message: string;
    authors: Author[];
    lastEvaluatedKey?: string;
  }> {
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
      const authors = response.Items as Author[];

      return {
        message: 'Authors retrieved successfully',
        authors,
        lastEvaluatedKey: response.LastEvaluatedKey
          ? response.LastEvaluatedKey.id
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch authors: ${error.message}`,
        error.stack,
      );
      throw new AuthorCreateException(error.message);
    }
  }

  async findOne(id: string): Promise<{ message: string; author: Author }> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Item) {
        throw new AuthorNotFoundException(id);
      }

      const author = response.Item as Author;

      return {
        message: 'Author retrieved successfully',
        author,
      };
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

  async findByName(
    name: string,
    limit: number,
    lastEvaluatedKey?: string,
  ): Promise<{
    message: string;
    authors: Author[];
    lastEvaluatedKey?: string;
  }> {
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
      const authors = response.Items as Author[];

      if (!authors || authors.length === 0) {
        throw new AuthorNotFoundException(
          `Author with name "${name}" does not exist`,
        );
      }

      return {
        message: 'Authors retrieved successfully',
        authors,
        lastEvaluatedKey: response.LastEvaluatedKey
          ? response.LastEvaluatedKey.id
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch authors by name ${name}: ${error.message}`,
        error.stack,
      );
      if (error instanceof AuthorNotFoundException) {
        throw error;
      }
      throw new AuthorCreateException(error.message);
    }
  }

  async update(
    id: string,
    updateAuthorDto: UpdateAuthorDto,
    profilePicture?: Express.Multer.File,
  ): Promise<{ message: string; author: Author }> {
    try {
      // Validate profile field to only accept images
      if (profilePicture && !profilePicture.mimetype.startsWith('image/')) {
        throw new Error('Profile must be an image file');
      }

      // Check if author exists
      const existingAuthorResponse = await this.findOne(id);
      const existingAuthor = existingAuthorResponse.author;

      // If name is being updated, check for duplicates
      if (
        updateAuthorDto.name &&
        updateAuthorDto.name !== existingAuthor.name
      ) {
        const existingAuthorsResult = await this.findByName(
          updateAuthorDto.name,
          1,
        ).catch((error) => {
          if (error instanceof AuthorNotFoundException) {
            return { authors: [] };
          }
          throw error;
        });

        const existingAuthors = existingAuthorsResult.authors;

        if (existingAuthors && existingAuthors.length > 0) {
          throw new AuthorAlreadyExistsException(updateAuthorDto.name);
        }
      }

      let profileUrl: string | undefined;
      if (profilePicture) {
        profileUrl = await this.s3Service.uploadFile(
          profilePicture,
          'authors/profiles',
        );
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

      if (profileUrl) {
        updateExpression.push('#profile = :profile');
        expressionAttributeNames['#profile'] = 'profile';
        expressionAttributeValues[':profile'] = profileUrl;
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
      this.logger.log(`Updated author with ID: ${id}`);
      return {
        message: 'Author updated successfully',
        author: response.Attributes as Author,
      };
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
      const existingAuthorResponse = await this.findOne(id);
      const author = existingAuthorResponse.author;

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

  async removeBookFromAuthor(authorId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id: authorId },
        UpdateExpression: 'SET booksCount = booksCount - :dec',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':zero': 0,
        },
        ConditionExpression: 'booksCount > :zero',
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Removed book from author: ${authorId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove book from author: ${error.message}`,
        error.stack,
      );
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Cannot decrease books count below zero');
      }
      throw new Error(`Failed to remove book from author: ${error.message}`);
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

  async addBookToAuthor(authorId: string): Promise<void> {
    try {
      await this.incrementBooksCount(authorId);
      this.logger.log(`Added book to author ${authorId}`);
    } catch (error) {
      this.logger.error(
        `Failed to add book to author ${authorId}: ${error.message}`,
        error.stack,
      );
      throw new AuthorUpdateException(error.message);
    }
  }

  async findBooksByAuthor(
    authorId: string,
  ): Promise<{ message: string; books: Book[] }> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new QueryCommand({
          TableName: 'Books',
          IndexName: 'AuthorIndex',
          KeyConditionExpression: 'authorId = :authorId',
          ExpressionAttributeValues: {
            ':authorId': authorId,
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

      return {
        message: 'Books retrieved successfully',
        books,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch books by author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
