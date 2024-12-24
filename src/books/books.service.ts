import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './interfaces/book.interface';
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
  BookNotFoundException,
  BookAlreadyExistsException,
  BookCreateException,
  BookUpdateException,
  BookDeleteException,
} from './exceptions/book.exceptions';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class BooksService {
  private readonly tableName = 'Books';
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createBookDto: CreateBookDto,
    coverFile?: Express.Multer.File,
    pdfFile?: Express.Multer.File,
  ): Promise<Book> {
    try {
      // Check for existing book with same ISBN
      const existingBooks = await this.findByISBN(createBookDto.isbn).catch(
        (error) => {
          if (error instanceof BookNotFoundException) {
            return [];
          }
          throw error;
        },
      );

      if (existingBooks && existingBooks.length > 0) {
        throw new BookAlreadyExistsException(createBookDto.isbn);
      }

      let coverUrl: string | undefined;
      let pdfUrl: string | undefined;

      if (coverFile) {
        coverUrl = await this.s3Service.uploadFile(coverFile, 'books_covers');
      }

      if (pdfFile) {
        pdfUrl = await this.s3Service.uploadFile(pdfFile, 'books_pdfs');
      }

      const book: Book = {
        id: uuidv4(),
        ...createBookDto,
        coverUrl,
        pdfUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: book,
        ConditionExpression: 'attribute_not_exists(id)',
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Created book with ID: ${book.id}`);
      return book;
    } catch (error) {
      this.logger.error(`Failed to create book: ${error.message}`, error.stack);
      if (error instanceof BookAlreadyExistsException) {
        throw error;
      }
      throw new BookCreateException(error.message);
    }
  }

  async findAll(): Promise<Book[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return response.Items as Book[];
    } catch (error) {
      this.logger.error(`Failed to fetch books: ${error.message}`, error.stack);
      throw new BookCreateException(error.message);
    }
  }

  async findOne(id: string): Promise<Book> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const response = await this.dynamoDBService.documentClient.send(command);

      if (!response.Item) {
        throw new BookNotFoundException(id);
      }

      return response.Item as Book;
    } catch (error) {
      this.logger.error(
        `Failed to fetch book ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof BookNotFoundException) {
        throw error;
      }
      throw new BookCreateException(error.message);
    }
  }

  async findByISBN(isbn: string): Promise<Book[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'ISBNIndex',
        KeyConditionExpression: '#isbn = :isbn',
        ExpressionAttributeNames: {
          '#isbn': 'isbn',
        },
        ExpressionAttributeValues: {
          ':isbn': isbn,
        },
      });

      const response = await this.dynamoDBService.documentClient.send(command);
      return (response.Items || []) as Book[];
    } catch (error) {
      this.logger.error(
        `Failed to fetch books by ISBN ${isbn}: ${error.message}`,
        error.stack,
      );
      throw new BookCreateException(error.message);
    }
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    coverFile?: Express.Multer.File,
    pdfFile?: Express.Multer.File,
  ): Promise<Book> {
    try {
      const existingBook = await this.findOne(id);

      let coverUrl = existingBook.coverUrl;
      let pdfUrl = existingBook.pdfUrl;

      if (coverFile) {
        coverUrl = await this.s3Service.uploadFile(coverFile, 'books_covers');
      }

      if (pdfFile) {
        pdfUrl = await this.s3Service.uploadFile(pdfFile, 'books_pdfs');
      }

      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updateBookDto).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      if (coverUrl !== existingBook.coverUrl) {
        updateExpression.push('#coverUrl = :coverUrl');
        expressionAttributeNames['#coverUrl'] = 'coverUrl';
        expressionAttributeValues[':coverUrl'] = coverUrl;
      }

      if (pdfUrl !== existingBook.pdfUrl) {
        updateExpression.push('#pdfUrl = :pdfUrl');
        expressionAttributeNames['#pdfUrl'] = 'pdfUrl';
        expressionAttributeValues[':pdfUrl'] = pdfUrl;
      }

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
      this.logger.log(`Updated book with ID: ${id}`);
      return response.Attributes as Book;
    } catch (error) {
      this.logger.error(
        `Failed to update book ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BookNotFoundException ||
        error instanceof BookAlreadyExistsException
      ) {
        throw error;
      }
      throw new BookUpdateException(error.message);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const book = await this.findOne(id);

      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      });

      await this.dynamoDBService.documentClient.send(command);
      this.logger.log(`Deleted book with ID: ${id}`);

      return {
        message: `Book with ID "${id}" has been successfully deleted`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete book ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof BookNotFoundException) {
        throw error;
      }
      throw new BookDeleteException(error.message);
    }
  }
}
