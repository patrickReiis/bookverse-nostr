
import { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Book as BookIcon, Search, Loader2, TrendingUp } from "lucide-react";
import { Book } from "@/lib/nostr";
import { searchBooks, searchBooksByGenre, getDailyTrendingBooks } from "@/lib/openlibrary";
import { useToast } from "@/components/ui/use-toast";
import { BookCard } from "@/components/BookCard";
import { useDailyTrendingQuery } from "@/hooks/feed";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibraryData } from "@/hooks/use-library-data";
import { useRef } from "react";

const categories = ["All", "Fiction", "Fantasy", "Science Fiction", "Mystery", "Romance", "Non-Fiction", "Biography", "History"];

const Books = () => {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Use the trending books hook
  const {
    books: trendingBooks,
    isLoading: trendingLoading,
    isError: trendingError
  } = useDailyTrendingQuery(20);
  
  const { getBookReadingStatus, refetchBooks: refetchUserBooks } = useLibraryData();
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const initialRenderRef = useRef(true);
  const previousSearchRef = useRef({ query: "", category: "All" });
  const searchInProgressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedSearch(value);
      debounceTimerRef.current = null;
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const enrichBooksWithReadingStatus = useCallback((bookList: Book[]): Book[] => {
    return bookList.map(book => {
      if (book.isbn) {
        const readingStatus = getBookReadingStatus(book.isbn);
        if (readingStatus) {
          return {
            ...book,
            readingStatus: {
              ...book.readingStatus,
              status: readingStatus,
              dateAdded: Date.now()
            }
          };
        }
      }
      return book;
    }) as Book[];
  }, [getBookReadingStatus]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setSearchQuery("");
    setDebouncedSearch("");
    
    if (category === "All" && !debouncedSearch) {
      setBooks([]);
    }
  }, [debouncedSearch]);

  // Determine which books to display - either search results or trending books
  const displayedBooks = debouncedSearch || activeCategory !== "All" 
    ? books 
    : enrichBooksWithReadingStatus(trendingBooks);

  useEffect(() => {
    const performSearch = async () => {
      if (
        debouncedSearch === previousSearchRef.current.query &&
        activeCategory === previousSearchRef.current.category
      ) {
        console.log("Skipping duplicate search");
        return;
      }

      if (searchInProgressRef.current) {
        console.log("Search already in progress, skipping");
        return;
      }

      if (!debouncedSearch && activeCategory === "All") {
        if (isSearching) {
          setIsSearching(false);
        }
        
        setBooks([]);
        previousSearchRef.current = { query: debouncedSearch, category: activeCategory };
        return;
      }

      setIsSearching(true);
      if (books.length === 0) {
        setIsLoading(true);
      }

      searchInProgressRef.current = true;

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

        previousSearchRef.current = { query: debouncedSearch, category: activeCategory };

        if (results.length > 0) {
          const enrichedResults = enrichBooksWithReadingStatus(results);
          setBooks(enrichedResults);
        } else {
          setBooks([]);
        }
      } catch (error) {
        console.error("Error searching books:", error);
        toast({
          title: "Error searching",
          description: "There was a problem with your search. Please try again.",
          variant: "destructive"
        });
        setBooks([]);
      } finally {
        setIsLoading(false);
        searchInProgressRef.current = false;
      }
    };

    performSearch();
  }, [debouncedSearch, activeCategory, toast, enrichBooksWithReadingStatus]);

  const handleBookUpdate = () => {
    console.log("Book updated, refreshing search results");
    refetchUserBooks();

    if (debouncedSearch || activeCategory !== "All") {
      const currentSearch = debouncedSearch;
      setDebouncedSearch("");
      setTimeout(() => {
        previousSearchRef.current = { query: "", category: "" };
        setDebouncedSearch(currentSearch);
      }, 10);
    }
  };

  const shouldShowLoadingSkeleton = (isLoading || (trendingLoading && activeCategory === "All")) &&
    (displayedBooks.length === 0);

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
                onChange={(e) => handleSearchInput(e.target.value)}
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

          {shouldShowLoadingSkeleton ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-[220px] w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {displayedBooks.length > 0 ? (
                displayedBooks.map((book) => (
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
                  {activeCategory === "All" && !debouncedSearch ? (
                    <div className="animate-pulse flex flex-col items-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Loading trending books</h3>
                      <p className="text-muted-foreground">Please wait while we fetch popular books...</p>
                    </div>
                  ) : (
                    <>
                      <BookIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No books found</h3>
                      <p className="text-muted-foreground">
                        {activeCategory === "All" && !debouncedSearch 
                          ? "Select a category or search for books to browse our collection." 
                          : "Try adjusting your search or filters to find what you're looking for."}
                      </p>
                    </>
                  )}
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
