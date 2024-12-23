import { HttpException, HttpStatus } from '@nestjs/common';

export class CategoryNotFoundException extends HttpException {
  constructor(id: string) {
    super(`Category with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class CategoryAlreadyExistsException extends HttpException {
  constructor(name: string) {
    super(`Category with name "${name}" already exists`, HttpStatus.CONFLICT);
  }
}

export class CategoryCreateException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to create category: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class CategoryUpdateException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to update category: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class CategoryDeleteException extends HttpException {
  constructor(error: string) {
    super(
      `Failed to delete category: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class CategoryNotFoundByNameException extends HttpException {
  constructor(name: string) {
    super(`Category with name "${name}" not found`, HttpStatus.NOT_FOUND);
  }
}
