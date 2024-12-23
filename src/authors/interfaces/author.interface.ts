export interface Author {
  id: string;
  name: string;
  biography: string;
  birthDate: string;
  nationality: string;
  email: string;
  website?: string;
  genres: string[];
  booksCount: number;
  imageUrl?: string;
}
