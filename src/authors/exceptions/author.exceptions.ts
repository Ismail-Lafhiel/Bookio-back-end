// src/authors/exceptions/author.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthorNotFoundException extends HttpException {
    constructor(identifier: string) {
      super(`Author with identifier "${identifier}" not found`, HttpStatus.NOT_FOUND);
    }
  }
  

export class AuthorAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(`Author with email "${email}" already exists`, HttpStatus.CONFLICT);
  }
}

export class AuthorCreateException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to create author: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class AuthorUpdateException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to update author: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class AuthorDeleteException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to delete author: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}