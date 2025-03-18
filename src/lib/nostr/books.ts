
import { Book, NOSTR_KINDS, BookActionType, BookReview } from "./types";
import { publishToNostr } from "./publish";

/**
 * Add a book to the "TBR" list
 */
export async function addBookToTBR(book: Book): Promise<string | null> {
  console.log("==== Adding book to TBR ====");
  console.log("Book details:", book.title, book.author, book.isbn);
  
  if (!book.isbn) {
    console.error("Cannot add book to TBR: ISBN is missing");
    return null;
  }
  
  const event = {
    kind: NOSTR_KINDS.BOOK_TBR,
    tags: [
      ["i", `isbn:${book.isbn}`]
    ],
    content: ""
  };
  
  console.log("Publishing TBR event with tags:", event.tags);
  console.log("Event kind:", event.kind);
  
  try {
    const result = await publishToNostr(event);
    console.log("TBR publish result:", result);
    return result;
  } catch (error) {
    console.error("Error in addBookToTBR:", error);
    throw error;
  }
}

/**
 * Mark a book as currently reading
 */
export async function markBookAsReading(book: Book): Promise<string | null> {
  console.log("==== Marking book as reading ====");
  console.log("Book details:", book.title, book.author, book.isbn);
  
  if (!book.isbn) {
    console.error("Cannot mark book as reading: ISBN is missing");
    return null;
  }
  
  const event = {
    kind: NOSTR_KINDS.BOOK_READING,
    tags: [
      ["i", `isbn:${book.isbn}`]
    ],
    content: ""
  };
  
  console.log("Publishing reading event with tags:", event.tags);
  console.log("Event kind:", event.kind);
  
  try {
    const result = await publishToNostr(event);
    console.log("Reading publish result:", result);
    return result;
  } catch (error) {
    console.error("Error in markBookAsReading:", error);
    throw error;
  }
}

/**
 * Mark a book as read
 */
export async function markBookAsRead(book: Book, rating?: number): Promise<string | null> {
  console.log("==== Marking book as read ====");
  console.log("Book details:", book.title, book.author, book.isbn);
  
  if (!book.isbn) {
    console.error("Cannot mark book as read: ISBN is missing");
    return null;
  }
  
  const tags = [
    ["i", `isbn:${book.isbn}`]
  ];
  
  const event = {
    kind: NOSTR_KINDS.BOOK_READ,
    tags,
    content: ""
  };
  
  console.log("Publishing read event with tags:", event.tags);
  console.log("Event kind:", event.kind);
  
  try {
    const result = await publishToNostr(event);
    console.log("Read publish result:", result);
    return result;
  } catch (error) {
    console.error("Error in markBookAsRead:", error);
    throw error;
  }
}

/**
 * Rate a book separately
 */
export async function rateBook(book: Book, rating: number): Promise<string | null> {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  
  if (!book.isbn) {
    console.error("Cannot rate book: ISBN is missing");
    return null;
  }
  
  const event = {
    kind: NOSTR_KINDS.BOOK_RATING,
    tags: [
      ["i", `isbn:${book.isbn}`],
      ["rating", rating.toString()]
    ],
    content: ""
  };
  
  return publishToNostr(event);
}

/**
 * Post a review for a book
 */
export async function reviewBook(book: Book, reviewText: string, rating?: number): Promise<string | null> {
  if (!book.isbn) {
    console.error("Cannot review book: ISBN is missing");
    return null;
  }
  
  const tags = [
    ["i", `isbn:${book.isbn}`]
  ];
  
  // Add rating tag if provided
  if (rating !== undefined && rating >= 1 && rating <= 5) {
    tags.push(["rating", rating.toString()]);
  }
  
  const event = {
    kind: NOSTR_KINDS.REVIEW,
    tags,
    content: reviewText
  };
  
  return publishToNostr(event);
}

/**
 * React to content (review, rating, etc)
 */
export async function reactToContent(eventId: string): Promise<string | null> {
  const event = {
    kind: NOSTR_KINDS.REACTION,
    tags: [
      ["e", eventId]
    ],
    content: "+"
  };
  
  return publishToNostr(event);
}

/**
 * Reply to content (review, rating, etc)
 */
export async function replyToContent(eventId: string, pubkey: string, replyText: string): Promise<string | null> {
  const event = {
    kind: NOSTR_KINDS.REVIEW,
    tags: [
      ["e", eventId, "", "reply"],
      ["p", pubkey]
    ],
    content: replyText
  };
  
  return publishToNostr(event);
}

/**
 * Follow a user
 */
export async function followUser(pubkey: string): Promise<string | null> {
  if (!pubkey) {
    console.error("Cannot follow user: pubkey is missing");
    return null;
  }
  
  const event = {
    kind: NOSTR_KINDS.CONTACTS,
    tags: [
      ["p", pubkey]
    ],
    content: ""
  };
  
  return publishToNostr(event);
}

/**
 * Unified function to add a book to any of the reading lists
 */
export async function addBookToList(book: Book, listType: BookActionType): Promise<string | null> {
  console.log(`==== Adding book to ${listType} list ====`);
  
  if (!book.isbn) {
    console.error(`Cannot add book to ${listType} list: ISBN is missing`);
    return null;
  }
  
  switch (listType) {
    case 'tbr':
      return addBookToTBR(book);
    case 'reading':
      return markBookAsReading(book);
    case 'finished':
      return markBookAsRead(book);
    default:
      console.error(`Unknown list type: ${listType}`);
      return null;
  }
}
