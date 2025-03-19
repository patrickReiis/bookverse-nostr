import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Book as BookIcon, Search, Loader2 } from "lucide-react";
import { Book } from "@/lib/nostr";
import { searchBooks, searchBooksByGenre } from "@/lib/openlibrary";
import { useToast } from "@/components/ui/use-toast";
import { BookCard } from "@/components/BookCard";
import { useWeeklyTrendingBooks } from "@/hooks/use-weekly-trending-books";
import { useLibraryData } from "@/hooks/use-library-data";

const categories = [
  "All",
  "Fiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Non-Fiction",
  "Biography",
  "History",
];

const Books = () => {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { books: weeklyTrendingBooks, loading: loadingTrending, refreshBooks } = useWeeklyTrendingBooks(20);
  const { books: userBooks, getBookReadingStatus, refetchBooks: refetchUserBooks } = useLibraryData();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const enrichBooksWithReadingStatus = (bookList: Book[]): Book[] => {
      return bookList.map(book => {
        if (book.isbn) {
          const readingStatus = getBookReadingStatus(book.isbn);
          if (readingStatus) {
            return {
              ...book,
              readingStatus: {
                ...book.readingStatus,
                status: readingStatus
              }
            };
          }
        }
        return book;
      });
    };

    if (weeklyTrendingBooks.length > 0 && !loadingTrending) {
      console.log("Setting trending books from hook:", weeklyTrendingBooks.length);
      const enrichedBooks = enrichBooksWithReadingStatus(weeklyTrendingBooks);
      setBooks(enrichedBooks);
      setIsLoading(false);
    } else if (!loadingTrending && weeklyTrendingBooks.length === 0) {
      console.log("No trending books loaded, attempting to refresh");
      refreshBooks();
    }
  }, [weeklyTrendingBooks, loadingTrending, refreshBooks, getBookReadingStatus]);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch && activeCategory === "All") {
        if (weeklyTrendingBooks.length > 0) {
          console.log("Using trending books as no search or category is active");
          const enrichedBooks = weeklyTrendingBooks.map(book => {
            if (book.isbn) {
              const readingStatus = getBookReadingStatus(book.isbn);
              if (readingStatus) {
                return {
                  ...book,
                  readingStatus: {
                    ...book.readingStatus,
                    status: readingStatus
                  }
                };
              }
            }
            return book;
          });
          
          setBooks(enrichedBooks);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        let results: Book[] = [];
        
        if (debouncedSearch) {
          console.log(`Searching for books with query: "${debouncedSearch}"`);
          results = await searchBooks(debouncedSearch, 20);
        } else if (activeCategory !== "All") {
          console.log(`Searching for books in category: "${activeCategory}"`);
          results = await searchBooksByGenre(activeCategory, 20);
        }
        
        console.log(`Search returned ${results.length} results`);
        
        // Enrich search results with user's reading status
        const enrichedResults = results.map(book => {
          if (book.isbn) {
            const readingStatus = getBookReadingStatus(book.isbn);
            if (readingStatus) {
              return {
                ...book,
                readingStatus: {
                  ...book.readingStatus,
                  status: readingStatus
                }
              };
            }
          }
          return book;
        });
        
        setBooks(enrichedResults);
      } catch (error) {
        console.error("Error searching books:", error);
        toast({
          title: "Error searching",
          description: "There was a problem with your search. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearch, activeCategory, toast, weeklyTrendingBooks, getBookReadingStatus]);

  const handleCategoryChange = (category: string) => {
    console.log(`Changing category to: ${category}`);
    setActiveCategory(category);
    if (searchQuery) {
      setSearchQuery("");
      setDebouncedSearch("");
    }
  };

  const handleBookUpdate = () => {
    console.log("Book updated, refreshing search results");
    refetchUserBooks();
    
    if (debouncedSearch || activeCategory !== "All") {
      const currentSearch = debouncedSearch;
      setDebouncedSearch("");
      setTimeout(() => setDebouncedSearch(currentSearch), 10);
    } else {
      refreshBooks();
    }
  };

  return (
    <Layout>
      <div className="container px-4 md:px-6 py-8">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-serif text-bookverse-ink mb-2">Discover Books</h1>
            <p className="text-muted-foreground">
              Explore our curated collection and find your next favorite read
            </p>
          </div>

          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 md:flex-none">
              <Tabs defaultValue="all" className="w-full md:w-auto">
                <TabsList className="w-full md:w-auto overflow-x-auto flex flex-nowrap justify-start px-1 h-auto py-1">
                  {categories.slice(0, 6).map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category.toLowerCase()}
                      className="whitespace-nowrap text-xs md:text-sm"
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {isLoading || loadingTrending ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-bookverse-accent" />
              <span className="ml-2 text-bookverse-ink">Loading books...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.length > 0 ? (
                books.map((book) => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    showDescription={false}
                    size="medium"
                    onUpdate={handleBookUpdate}
                  />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <BookIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No books found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Books;
