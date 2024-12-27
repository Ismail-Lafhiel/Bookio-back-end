import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { S3Service } from '../s3/s3.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, BookStatus } from './interfaces/book.interface';
import { v4 as uuidv4 } from 'uuid';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

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
    files: { cover?: Express.Multer.File[]; pdf?: Express.Multer.File[] },
  ): Promise<Book> {
    try {
      if (!files.cover?.[0] || !files.pdf?.[0]) {
        throw new Error('Both cover and PDF files are required');
      }

      // Upload files to S3
      const coverUrl = await this.s3Service.uploadFile(
        files.cover[0],
        'books/covers',
      );
      const pdfUrl = await this.s3Service.uploadFile(
        files.pdf[0],
        'books/pdfs',
      );

      const book: Book = {
        id: uuidv4(),
        ...createBookDto,
        status: BookStatus.AVAILABLE,
        cover: coverUrl,
        pdf: pdfUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoDBService.documentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: book,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );

      return book;
    } catch (error) {
      this.logger.error(`Failed to create book: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Book[]> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new ScanCommand({
          TableName: this.tableName,
        }),
      );

      const books = result.Items as Book[];

      // Update status based on quantity
      books.forEach(book => {
        if (book.quantity > 0) {
          book.status = BookStatus.AVAILABLE;
        } else {
          book.status = BookStatus.UNAVAILABLE;
        }
      });

      return books;
    } catch (error) {
      this.logger.error(`Failed to fetch books: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Book> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );

      if (!result.Item) {
        throw new NotFoundException(`Book with ID "${id}" not found`);
      }

      const book = result.Item as Book;

      // Update status based on quantity
      if (book.quantity > 0) {
        book.status = BookStatus.AVAILABLE;
      } else {
        book.status = BookStatus.UNAVAILABLE;
      }

      return book;
    } catch (error) {
      this.logger.error(`Failed to fetch book: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    files: { cover?: Express.Multer.File[]; pdf?: Express.Multer.File[] },
  ): Promise<Book> {
    try {
      const existingBook = await this.findOne(id);

      let updateExpression = 'SET updatedAt = :updatedAt';
      const expressionAttributeValues: any = {
        ':updatedAt': new Date().toISOString(),
      };
      const expressionAttributeNames: any = {};

      // Handle file updates
      if (files.cover?.[0]) {
        const coverUrl = await this.s3Service.uploadFile(
          files.cover[0],
          'books/covers',
        );
        updateExpression += ', #cover = :cover';
        expressionAttributeValues[':cover'] = coverUrl;
        expressionAttributeNames['#cover'] = 'cover';

        // Delete old cover if exists
        if (existingBook.cover) {
          await this.s3Service.deleteFile(existingBook.cover);
        }
      }

      if (files.pdf?.[0]) {
        const pdfUrl = await this.s3Service.uploadFile(
          files.pdf[0],
          'books/pdfs',
        );
        updateExpression += ', #pdf = :pdf';
        expressionAttributeValues[':pdf'] = pdfUrl;
        expressionAttributeNames['#pdf'] = 'pdf';

        // Delete old PDF if exists
        if (existingBook.pdf) {
          await this.s3Service.deleteFile(existingBook.pdf);
        }
      }

      // Handle other fields
      Object.entries(updateBookDto).forEach(([key, value]) => {
        if (value !== undefined && !['id', 'createdAt', 'updatedAt'].includes(key)) {
          updateExpression += `, #${key} = :${key}`;
          expressionAttributeValues[`:${key}`] = value;
          expressionAttributeNames[`#${key}`] = key;
        }
      });

      const result = await this.dynamoDBService.documentClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW',
          ConditionExpression: 'attribute_exists(id)',
        }),
      );

      return result.Attributes as Book;
    } catch (error) {
      this.logger.error(`Failed to update book: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const book = await this.findOne(id);

      // Delete files from S3
      if (book.cover) {
        await this.s3Service.deleteFile(book.cover);
      }
      if (book.pdf) {
        await this.s3Service.deleteFile(book.pdf);
      }

      await this.dynamoDBService.documentClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
          ConditionExpression: 'attribute_exists(id)',
        }),
      );

      return { message: `Book with ID "${id}" has been successfully deleted` };
    } catch (error) {
      this.logger.error(`Failed to delete book: ${error.message}`, error.stack);
      throw error;
    }
  }

  async borrow(id: string, borrowerId: string): Promise<Book> {
    try {
      const book = await this.findOne(id);

      if (book.quantity <= 0) {
        throw new BadRequestException(`Book with ID "${id}" is not available for borrowing`);
      }

      const startDate = new Date().toISOString();
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 14); // Assuming a 2-week borrowing period
      const returnDateString = returnDate.toISOString();

      const newQuantity = book.quantity - 1;

      const updateExpression = 'SET #borrowerId = :borrowerId, #quantity = :quantity, #startDate = :startDate, #returnDate = :returnDate, updatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':borrowerId': borrowerId,
        ':quantity': newQuantity,
        ':startDate': startDate,
        ':returnDate': returnDateString,
        ':updatedAt': new Date().toISOString(),
      };
      const expressionAttributeNames = {
        '#borrowerId': 'borrowerId',
        '#quantity': 'quantity',
        '#startDate': 'startDate',
        '#returnDate': 'returnDate',
      };

      const result = await this.dynamoDBService.documentClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: expressionAttributeNames,
          ReturnValues: 'ALL_NEW',
          ConditionExpression: 'attribute_exists(id)',
        }),
      );

      const updatedBook = result.Attributes as Book;
      updatedBook.status = BookStatus.BORROWED;

      return updatedBook;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.error(`Book not found: ${error.message}`, error.stack);
        throw new NotFoundException(`Book with ID "${id}" not found`);
      } else if (error instanceof BadRequestException) {
        this.logger.error(`Book not available: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(`Failed to borrow book: ${error.message}`, error.stack);
        throw new Error(`Failed to borrow book: ${error.message}`);
      }
    }
  }
}
