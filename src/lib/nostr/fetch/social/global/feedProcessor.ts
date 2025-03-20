
import { type Event } from "nostr-tools";
import { SocialActivity, NOSTR_KINDS, Book } from "../../../types";
import { extractISBNFromTags, extractRatingFromTags, extractUniquePubkeys } from "../../../utils/eventUtils";
import { getBooksByISBN } from "@/lib/openlibrary";
import { fetchUserProfiles } from "../../../profile";

/**
 * Process feed events into SocialActivity objects
 */
export async function processFeedEvents(events: Event[], limit: number): Promise<SocialActivity[]> {
  // Filter events to only include valid ones with either k=isbn or t=bookstr
  const filteredEvents = events.filter(event => {
    const hasIsbnTag = event.tags.some(tag => tag[0] === 'k' && tag[1] === 'isbn');
    const hasBookstrTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'bookstr');
    return hasIsbnTag || hasBookstrTag;
  });
  
  // Limit the number of events to process
  const eventsToProcess = filteredEvents.slice(0, limit);
  
  // If no events found, return empty array
  if (eventsToProcess.length === 0) {
    console.log("No valid events found for global feed");
    return [];
  }
  
  // Get all unique pubkeys to fetch profiles in one batch
  const uniquePubkeys = extractUniquePubkeys(eventsToProcess);
  
  // Fetch profiles for these pubkeys with error handling
  let profiles = [];
  try {
    profiles = await fetchUserProfiles(uniquePubkeys);
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    // Continue with empty profiles rather than failing completely
  }
  
  // Create a map of pubkey to profile data for faster lookups
  const profileMap = new Map();
  profiles.forEach(profile => {
    profileMap.set(profile.pubkey, {
      name: profile.name || profile.display_name,
      picture: profile.picture,
      npub: profile.pubkey
    });
  });
  
  // Extract all ISBNs to fetch book details in one batch
  const isbns = eventsToProcess
    .map(event => extractISBNFromTags(event))
    .filter((isbn): isbn is string => isbn !== null);
  
  // Fetch book details with error handling
  let books = [];
  try {
    if (isbns.length > 0) {
      books = await getBooksByISBN([...new Set(isbns)]);
    }
  } catch (error) {
    console.error("Error fetching book details:", error);
    // Continue with empty books rather than failing completely
  }
  
  // Create a map of ISBN to book details for faster lookups
  const bookMap = new Map<string, Book>();
  books.forEach(book => {
    if (book.isbn) {
      bookMap.set(book.isbn, book);
    }
  });
  
  return createSocialActivities(eventsToProcess, bookMap, profileMap);
}

/**
 * Convert filtered events to SocialActivity objects
 */
function createSocialActivities(
  events: Event[], 
  bookMap: Map<string, Book>, 
  profileMap: Map<string, any>
): SocialActivity[] {
  const socialFeed: SocialActivity[] = [];
  
  for (const event of events) {
    try {
      const isbn = extractISBNFromTags(event);
      
      // Get book details from the map or create a basic book object
      let book: Book;
      
      if (isbn) {
        book = bookMap.get(isbn) || {
          id: `isbn:${isbn}`,
          title: "Unknown Book",
          author: "Unknown Author",
          isbn,
          coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        };
      } else {
        // For posts without ISBN but with bookstr tag, create a generic book object
        book = {
          id: "generic",
          title: "Book Discussion",
          author: "",
          isbn: "",
          coverUrl: ""
        };
      }
      
      // Determine activity type based on event kind
      let activityType: 'review' | 'rating' | 'tbr' | 'reading' | 'finished' | 'post';
      
      switch (event.kind) {
        case NOSTR_KINDS.REVIEW:
          activityType = 'review';
          break;
        case NOSTR_KINDS.BOOK_RATING:
          activityType = 'rating';
          break;
        case NOSTR_KINDS.BOOK_TBR:
          activityType = 'tbr';
          break;
        case NOSTR_KINDS.BOOK_READING:
          activityType = 'reading';
          break;
        case NOSTR_KINDS.BOOK_READ:
          activityType = 'finished';
          break;
        case NOSTR_KINDS.TEXT_NOTE:
          activityType = 'post';
          break;
        default:
          continue; // Skip unknown event kinds
      }
      
      // Find media tags for posts
      const mediaTag = event.tags.find(tag => tag[0] === 'media');
      const spoilerTag = event.tags.find(tag => tag[0] === 'spoiler');
      
      // Create social activity object
      const activity: SocialActivity = {
        id: event.id,
        pubkey: event.pubkey,
        type: activityType,
        book,
        content: event.content,
        rating: extractRatingFromTags(event),
        createdAt: event.created_at * 1000,
        author: profileMap.get(event.pubkey),
        reactions: {
          count: 0,
          userReacted: false
        },
        mediaUrl: mediaTag ? mediaTag[2] : undefined,
        mediaType: mediaTag ? (mediaTag[1] as "image" | "video") : undefined,
        isSpoiler: !!spoilerTag && spoilerTag[1] === "true"
      };
      
      socialFeed.push(activity);
    } catch (error) {
      console.error("Error processing event:", event.id, error);
      // Skip this event but continue processing others
    }
  }
  
  // Sort by creation date, newest first
  return socialFeed.sort((a, b) => b.createdAt - a.createdAt);
}
