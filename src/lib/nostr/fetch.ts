
// Re-export all fetch functions

// Book fetch functions
import { 
  fetchUserBooks, 
  fetchBooksByISBN, 
  fetchBookByISBN,
  ensureBookMetadata
} from './fetch/bookFetch';

// Review fetch functions
import {
  fetchBookReviews,
  fetchBookRatings,
  fetchUserReviews
} from './fetch/reviewFetch';

// Profile fetch functions
import {
  fetchFollowingList,
  fetchUserProfile
} from './fetch/profileFetch';

// Social fetch functions
import {
  fetchSocialFeed,
  fetchGlobalSocialFeed,
  fetchBookPosts,
  fetchBookActivity
} from './fetch/social';

// Event fetch function
import { fetchEventById } from './fetch/social/fetchEvent';

export {
  // Book functions
  fetchUserBooks,
  fetchBooksByISBN,
  fetchBookByISBN,
  ensureBookMetadata,
  
  // Review functions
  fetchBookReviews,
  fetchBookRatings,
  fetchUserReviews,
  
  // Profile functions
  fetchFollowingList,
  fetchUserProfile,
  
  // Social functions
  fetchSocialFeed,
  fetchGlobalSocialFeed,
  fetchBookPosts,
  fetchBookActivity,
  
  // Event function
  fetchEventById
};
