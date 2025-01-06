import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  let controller: BooksController;
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({
              message: 'Books retrieved successfully',
              books: [],
              lastEvaluatedKey: undefined,
            }),
            findOne: jest.fn().mockResolvedValue({
              message: 'Book retrieved successfully',
              book: {},
            }),
            findByCategory: jest.fn().mockResolvedValue({
              message: 'Books retrieved successfully',
              books: [],
              lastEvaluatedKey: undefined,
            }),
            findByAuthor: jest.fn().mockResolvedValue({
              message: 'Books retrieved successfully',
              books: [],
            }),
            findBorrowedBooksByUser: jest.fn().mockResolvedValue({
              message: 'Found 0 borrowed book(s)',
              books: [],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BooksController>(BooksController);
    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all books', async () => {
    const result = await controller.findAll(10);
    expect(result).toEqual({
      message: 'Books retrieved successfully',
      books: [],
      lastEvaluatedKey: undefined,
    });
  });

  it('should return a single book', async () => {
    const result = await controller.findOne('1');
    expect(result).toEqual({
      message: 'Book retrieved successfully',
      book: {},
    });
  });

  it('should return books by category', async () => {
    const result = await controller.findByCategory('1', 10);
    expect(result).toEqual({
      message: 'Books retrieved successfully',
      books: [],
      lastEvaluatedKey: undefined,
    });
  });

  it('should return books by author', async () => {
    const result = await controller.findByAuthor('1');
    expect(result).toEqual({
      message: 'Books retrieved successfully',
      books: [],
    });
  });

  it('should return borrowed books by user', async () => {
    const result = await controller.getMyBorrowedBooks({ user: { sub: '1' } });
    expect(result).toEqual({
      message: 'Found 0 borrowed book(s)',
      books: [],
    });
  });
});
