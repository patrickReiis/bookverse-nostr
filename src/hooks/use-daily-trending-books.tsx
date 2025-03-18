
import { useState, useEffect, useCallback } from "react";
import { Book } from "@/lib/nostr/types";
import { getDailyTrendingBooks } from "@/lib/openlibrary";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export function useDailyTrendingBooks(limit: number = 3) {
  const { toast } = useToast();

  const { 
    data: books = [], 
    isLoading: loading, 
    refetch, 
    error 
  } = useQuery({
    queryKey: ['dailyTrendingBooks', limit],
    queryFn: () => getDailyTrendingBooks(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Handle errors outside the query config
  useEffect(() => {
    if (error) {
      console.error("Error loading trending books:", error);
      toast({
        title: "Error loading books",
        description: "There was a problem fetching trending books.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const refreshBooks = useCallback(() => {
    refetch();
  }, [refetch]);

  return { books, loading, refreshBooks };
}
