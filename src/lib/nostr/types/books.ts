
import { Reply } from './common';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  description?: string;
  pubDate?: string;
  pageCount?: number;
  categories?: string[];
  readingStatus?: {
    status: 'tbr' | 'reading' | 'finished';
    dateAdded: number;
    rating?: number;
  };
  // Add author_name field for compatibility with OpenLibrary data
  author_name?: string[];
}

export interface BookReview {
  id: string;
  pubkey: string;
  content: string;
  rating?: number;
  createdAt: number;
  author?: {
    name?: string;
    picture?: string;
    npub?: string;
  };
  bookIsbn?: string;
  bookTitle?: string;
  bookCover?: string;
  bookAuthor?: string;
  replies?: Reply[];
}
