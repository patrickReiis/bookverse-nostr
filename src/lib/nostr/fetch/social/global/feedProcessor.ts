import { type Event } from "nostr-tools";
import { SocialActivity, NOSTR_KINDS, Book } from "../../../types";
import { extractISBNFromTags, extractAllISBNsFromTags, extractRatingFromTags, extractUniquePubkeys } from "../../../utils/eventUtils";
import { getBooksByISBN } from "@/lib/openlibrary";
import { fetchUserProfiles } from "../../../profile";

/**
 * Process feed events into SocialActivity objects
 */
export async function processFeedEvents(events: Event[], limit: number): Promise<SocialActivity[]> {
  console.log(`Processing ${events.length} events into social activities`);
  
  if (!events || events.length === 0) {
    console.log("No events to process for global feed");
    return [];
  }
  
  // Filter to only include reading status events
  const filteredEvents = events.filter(event => {
    const isReadingStatusKind = [
      NOSTR_KINDS.BOOK_TBR,     // 10075
      NOSTR_KINDS.BOOK_READING, // 10074
      NOSTR_KINDS.BOOK_READ     // 10073
    ].includes(event.kind);
    
    return isReadingStatusKind;
  });
  
  console.log(`Filtered down to ${filteredEvents.length} valid events`);
  
  // Limit the number of events to process
  const eventsToProcess = filteredEvents.slice(0, limit);
  
  // If no events found, return empty array
  if (eventsToProcess.length === 0) {
    console.log("No valid events found for global feed");
    return [];
  }
  
  // Get all unique pubkeys to fetch profiles in one batch
  const uniquePubkeys = extractUniquePubkeys(eventsToProcess);
  console.log(`Fetching profiles for ${uniquePubkeys.length} unique pubkeys`);
  
  // Fetch profiles for these pubkeys with error handling
  let profiles = [];
  try {
    profiles = await fetchUserProfiles(uniquePubkeys);
    console.log(`Received ${profiles.length} user profiles`);
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    // Continue with empty profiles rather than failing completely
  }
  
  // Create a map of pubkey to profile data for faster lookups
  const profileMap = new Map();
  profiles.forEach(profile => {
    if (profile && profile.pubkey) {
      profileMap.set(profile.pubkey, {
        name: profile.name || profile.display_name,
        picture: profile.picture,
        npub: profile.pubkey
      });
    }
  });
  
  // Extract all ISBNs to fetch book details in one batch
  const allIsbns: string[] = [];
  
  eventsToProcess.forEach(event => {
    // Get all ISBNs from the event
    const eventIsbns = extractAllISBNsFromTags(event);
    if (eventIsbns.length > 0) {
      allIsbns.push(...eventIsbns);
    } else {
      // Fallback to single ISBN if no multiple ISBNs found
      const singleIsbn = extractISBNFromTags(event);
      if (singleIsbn) {
        allIsbns.push(singleIsbn);
      }
    }
  });
  
  // Filter out duplicates
  const uniqueIsbns = [...new Set(allIsbns)];
  console.log(`Fetching details for ${uniqueIsbns.length} unique books`);
  
  // Fetch book details with error handling
  let books = [];
  try {
    if (uniqueIsbns.length > 0) {
      books = await getBooksByISBN(uniqueIsbns);
      console.log(`Received ${books.length} book details`);
    }
  } catch (error) {
    console.error("Error fetching book details:", error);
    // Continue with empty books rather than failing completely
  }
  
  // Create a map of ISBN to book details for faster lookups
  const bookMap = new Map<string, Book>();
  books.forEach(book => {
    if (book && book.isbn) {
      bookMap.set(book.isbn, book);
    }
  });
  
  const activities = createSocialActivities(eventsToProcess, bookMap, profileMap);
  console.log(`Created ${activities.length} social activities`);
  return activities;
}

/**
 * Convert filtered events to SocialActivity objects
 * Now supports multiple books per event
 */
function createSocialActivities(
  events: Event[], 
  bookMap: Map<string, Book>, 
  profileMap: Map<string, any>
): SocialActivity[] {
  const socialFeed: SocialActivity[] = [];
  
  for (const event of events) {
    try {
      // Get all ISBNs from the event
      const allIsbns = extractAllISBNsFromTags(event);
      
      // If we have multiple ISBNs, create one activity per ISBN
      if (allIsbns.length > 1) {
        for (const isbn of allIsbns) {
          const activity = createSingleActivity(event, isbn, bookMap, profileMap);
          if (activity) {
            socialFeed.push(activity);
          }
        }
      } else {
        // Otherwise handle as a single book activity
        const isbn = allIsbns[0] || extractISBNFromTags(event);
        const activity = createSingleActivity(event, isbn, bookMap, profileMap);
        if (activity) {
          socialFeed.push(activity);
        }
      }
    } catch (error) {
      console.error("Error processing event:", error);
      // Skip this event but continue processing others
    }
  }
  
  // Sort by creation date, newest first
  return socialFeed.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Create a single activity for a book
 */
function createSingleActivity(
  event: Event,
  isbn: string | null,
  bookMap: Map<string, Book>,
  profileMap: Map<string, any>
): SocialActivity | null {
  // Skip if no ISBN
  if (!isbn) {
    return null;
  }
  
  // Get book details from the map or create a basic book object
  let book: Book = bookMap.get(isbn) || {
    id: `isbn:${isbn}`,
    title: "Unknown Book",
    author: "Unknown Author",
    isbn,
    coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  };
  
  // Determine activity type based on event kind
  let activityType: 'review' | 'rating' | 'tbr' | 'reading' | 'finished' | 'post';
  
  switch (event.kind) {
    case NOSTR_KINDS.BOOK_TBR:
      activityType = 'tbr';
      break;
    case NOSTR_KINDS.BOOK_READING:
      activityType = 'reading';
      break;
    case NOSTR_KINDS.BOOK_READ:
      activityType = 'finished';
      break;
    default:
      // Return null for unsupported event kinds
      return null;
  }
  
  // Find media tags for posts
  const mediaTag = event.tags.find(tag => tag[0] === 'media');
  const spoilerTag = event.tags.find(tag => tag[0] === 'spoiler');
  
  // Create social activity object
  const activity: SocialActivity = {
    id: `${event.id}-${isbn}`, // Ensure unique ID for multi-book events
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
  
  return activity;
}
