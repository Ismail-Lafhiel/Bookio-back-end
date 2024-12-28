import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { CategoriesService } from '../categories/categories.service';
import { AuthorsService } from '../authors/authors.service';
import { BorrowBookDto } from './dto/borrow-book.dto';

@Injectable()
export class BooksService {
  private readonly tableName = 'Books';
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
    private readonly categoriesService: CategoriesService,
    private readonly authorsService: AuthorsService,
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

      // Increment books count for category and author
      await this.categoriesService.addBookToCategory(createBookDto.categoryId);
      await this.authorsService.addBookToAuthor(createBookDto.authorId);

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
      books.forEach((book) => {
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
        if (
          value !== undefined &&
          !['id', 'createdAt', 'updatedAt'].includes(key)
        ) {
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

  async borrow(
    id: string,
    borrowData: { borrowerId: string; startDate: string; returnDate: string },
  ): Promise<Book> {
    try {
      const book = await this.findOne(id);

      // Check if the book is already borrowed by this user
      const userBorrowedBooks = await this.findBorrowedBooksByUser(
        borrowData.borrowerId,
      );
      const alreadyBorrowed = userBorrowedBooks.books.some(
        (borrowedBook) => borrowedBook.id === id,
      );

      if (alreadyBorrowed) {
        throw new BadRequestException(`You have already borrowed this book`);
      }

      // Get total number of books currently borrowed by the user
      const totalBorrowedBooks = userBorrowedBooks.books.length;
      const MAX_BORROWED_BOOKS = 3; // You can adjust this limit

      if (totalBorrowedBooks >= MAX_BORROWED_BOOKS) {
        throw new BadRequestException(
          `You cannot borrow more than ${MAX_BORROWED_BOOKS} books at a time. Please return some books first.`,
        );
      }

      if (book.quantity <= 0) {
        throw new BadRequestException(
          `Book with ID "${id}" is not available for borrowing`,
        );
      }

      // Validate dates
      const currentDate = new Date();
      const startDate = new Date(borrowData.startDate);
      const returnDate = new Date(borrowData.returnDate);

      if (startDate < currentDate) {
        throw new BadRequestException('Start date cannot be in the past');
      }

      if (returnDate <= startDate) {
        throw new BadRequestException('Return date must be after start date');
      }

      // Maximum borrow duration (e.g., 30 days)
      const MAX_BORROW_DAYS = 30;
      const daysDifference = Math.ceil(
        (returnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDifference > MAX_BORROW_DAYS) {
        throw new BadRequestException(
          `Maximum borrow duration is ${MAX_BORROW_DAYS} days`,
        );
      }

      const newQuantity = book.quantity - 1;

      const updateExpression =
        'SET #borrowerId = :borrowerId, #quantity = :quantity, #startDate = :startDate, #returnDate = :returnDate, #status = :status, updatedAt = :updatedAt';

      const expressionAttributeValues = {
        ':borrowerId': borrowData.borrowerId,
        ':quantity': newQuantity,
        ':startDate': borrowData.startDate,
        ':returnDate': borrowData.returnDate,
        ':status': BookStatus.BORROWED,
        ':updatedAt': new Date().toISOString(),
      };

      const expressionAttributeNames = {
        '#borrowerId': 'borrowerId',
        '#quantity': 'quantity',
        '#startDate': 'startDate',
        '#returnDate': 'returnDate',
        '#status': 'status',
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

      // Log the successful borrow operation
      this.logger.log(`Book ${id} borrowed by user ${borrowData.borrowerId}`, {
        bookId: id,
        borrowerId: borrowData.borrowerId,
        startDate: borrowData.startDate,
        returnDate: borrowData.returnDate,
      });

      return updatedBook;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.error(`Book not found: ${error.message}`, error.stack);
        throw new NotFoundException(`Book with ID "${id}" not found`);
      } else if (error instanceof BadRequestException) {
        this.logger.error(`Book not available: ${error.message}`, error.stack);
        throw error;
      } else {
        this.logger.error(
          `Failed to borrow book: ${error.message}`,
          error.stack,
        );
        throw new Error(`Failed to borrow book: ${error.message}`);
      }
    }
  }

  async findByCategory(categoryId: string): Promise<Book[]> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new QueryCommand({
          TableName: this.tableName,
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

  async findByAuthor(authorId: string): Promise<Book[]> {
    try {
      const result = await this.dynamoDBService.documentClient.send(
        new QueryCommand({
          TableName: this.tableName,
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

      return books;
    } catch (error) {
      this.logger.error(
        `Failed to fetch books by author: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findBorrowedBooksByUser(
    userId: string,
  ): Promise<{ message: string; books: Book[] }> {
    try {
      console.log('Searching for books borrowed by user:', userId);

      const params = {
        TableName: this.tableName,
        FilterExpression: '#borrowerId = :borrowerId AND #status = :status',
        ExpressionAttributeNames: {
          '#borrowerId': 'borrowerId',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':borrowerId': userId,
          ':status': BookStatus.BORROWED,
        },
      };

      console.log('Scan params:', JSON.stringify(params, null, 2));

      const result = await this.dynamoDBService.documentClient.send(
        new ScanCommand(params),
      );

      console.log('Scan result:', JSON.stringify(result, null, 2));

      const books = result.Items as Book[];

      if (!books || books.length === 0) {
        return {
          message: 'No borrowed books found',
          books: [],
        };
      }

      return {
        message: `Found ${books.length} borrowed book(s)`,
        books: books,
      };
    } catch (error) {
      console.error('Full error details:', error);

      this.logger.error('Failed to fetch borrowed books:', {
        userId,
        error: error.message,
        stack: error.stack,
        errorName: error.name,
      });

      throw new InternalServerErrorException(
        `Failed to fetch borrowed books: ${error.message}`,
      );
    }
  }
}
