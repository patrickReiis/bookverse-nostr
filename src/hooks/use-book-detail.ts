
import { useBookData } from "./book/use-book-data";
import { useBookReviews } from "./book/use-book-reviews";
import { useBookActions } from "./book/use-book-actions";
import { useBookActivity } from "./book/use-book-activity";

export const useBookDetail = (isbn: string | undefined) => {
  const { 
    book, 
    loading, 
    isRead, 
    setIsRead 
  } = useBookData(isbn);

  const { 
    reviews, 
    ratings, 
    reviewText, 
    setReviewText, 
    submitting, 
    handleSubmitReview 
  } = useBookReviews(isbn);

  const { 
    pendingAction, 
    handleMarkAsRead: markAsRead, 
    handleAddBookToList, 
    handleReactToContent 
  } = useBookActions();

  const { 
    activeTab, 
    setActiveTab, 
    bookActivity, 
    loadingActivity,
    refreshTrigger
  } = useBookActivity(isbn);

  // Combine the hooks with book-specific wrappers
  const handleMarkAsRead = () => markAsRead(book, setIsRead);
  const handleSubmitReviewWrapper = () => handleSubmitReview(book);
  const handleReactToReview = (reviewId: string) => handleReactToContent(reviewId);
  const handleReactToActivity = (activityId: string) => handleReactToContent(activityId);

  return {
    book,
    loading,
    reviews,
    ratings,
    reviewText,
    setReviewText,
    submitting,
    pendingAction,
    isRead,
    activeTab,
    setActiveTab,
    bookActivity,
    loadingActivity,
    refreshTrigger,
    handleMarkAsRead,
    handleSubmitReview: handleSubmitReviewWrapper,
    handleReactToReview,
    handleReactToActivity,
    handleAddBookToList
  };
};
