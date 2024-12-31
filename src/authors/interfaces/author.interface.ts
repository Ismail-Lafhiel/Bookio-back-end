export interface Author {
  id: string;
  name: string;
  biography: string;
  birthDate: string;
  nationality: string;
  email: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  genres: string[];
  booksCount: number;
  profile?: string;
  createdAt: string;
  updatedAt: string;
}
