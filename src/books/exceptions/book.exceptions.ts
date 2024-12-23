import { HttpException, HttpStatus } from '@nestjs/common';

export class BookNotFoundException extends HttpException {
  constructor(id: string) {
    super(`Book with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class BookAlreadyExistsException extends HttpException {
  constructor(isbn: string) {
    super(`Book with ISBN "${isbn}" already exists`, HttpStatus.CONFLICT);
  }
}

export class BookCreateException extends HttpException {
  constructor(error: string) {
    super(`Failed to create book: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class BookUpdateException extends HttpException {
  constructor(error: string) {
    super(`Failed to update book: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class BookDeleteException extends HttpException {
  constructor(error: string) {
    super(`Failed to delete book: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
