export interface Book {
  id: string;
  title: string;
  authorId: string;
  categoryId: string;
  isbn: string;
  status: BookStatus;
  description?: string;
  publishedYear?: number;
  borrowerId?: string;
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}

export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
}