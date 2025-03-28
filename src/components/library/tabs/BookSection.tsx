
import React from "react";
import { EmptyState } from "@/components/profile/EmptyState";
import { BookCard } from "@/components/BookCard";
import { Book } from "@/lib/nostr/types";

interface BookSectionProps {
  title: string;
  books: Book[];
  emptyStateType: string;
  onUpdate?: () => void;
}

export const BookSection: React.FC<BookSectionProps> = ({
  title,
  books,
  emptyStateType,
  onUpdate
}) => {
  console.log(`Rendering ${title} section with ${books.length} books`);

  // Log books with ratings for debugging
  const booksWithRatings = books.filter(book => book.readingStatus?.rating !== undefined);
  if (booksWithRatings.length > 0) {
    console.log(`Found ${booksWithRatings.length} books with ratings in ${title} section:`, booksWithRatings.map(b => ({
      title: b.title,
      isbn: b.isbn,
      rating: b.readingStatus?.rating
    })));
  }
  
  return (
    <section className="mb-12 py-0 my-[25px]">
      <h2 className="text-2xl font-serif font-semibold mb-4">{title}</h2>
      {books.length === 0 ? (
        <EmptyState type={emptyStateType} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {books.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              size="medium" 
              showRating={true} 
              onUpdate={onUpdate} 
            />
          ))}
        </div>
      )}
    </section>
  );
};
