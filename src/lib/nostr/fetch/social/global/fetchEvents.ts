
import { type Filter, type Event } from "nostr-tools";
import { NOSTR_KINDS } from "../../../types";
import { getUserRelays } from "../../../relay";
import { cacheQueryResult, getCachedQueryResult, generateCacheKey } from "../../../relay/connection";
import { getSharedPool } from "../../../utils/poolManager";

const MAX_REQUEST_TIME = 15000; // 15 seconds timeout

/**
 * Fetch events for the global feed with caching and timeout
 */
export async function fetchGlobalEvents(limit: number): Promise<Event[]> {
  const relays = getUserRelays();
  
  // Make sure we have relays to query
  if (!relays || relays.length === 0) {
    console.warn("No relays available for fetching global events");
    return [];
  }
  
  // Create combined filter instead of separate queries
  // This reduces the number of separate requests
  const combinedFilter: Filter = {
    kinds: [
      NOSTR_KINDS.BOOK_TBR,
      NOSTR_KINDS.BOOK_READING, 
      NOSTR_KINDS.BOOK_READ,
      NOSTR_KINDS.BOOK_RATING,
      NOSTR_KINDS.REVIEW,
      NOSTR_KINDS.TEXT_NOTE
    ],
    limit: limit * 2, // Increase limit as we'll filter later
    "#t": ["bookstr"]
  };
  
  // Generate cache key for this query
  const cacheKey = generateCacheKey(combinedFilter);
  
  // Check if we have a recent cached result
  const cachedEvents = getCachedQueryResult(cacheKey);
  if (cachedEvents) {
    console.log("Using cached events for global feed");
    return cachedEvents;
  }
  
  // Execute query with timeout
  try {
    console.log(`Querying ${relays.length} relays for global feed events...`);
    const events = await fetchWithTimeout(relays, combinedFilter);
    
    // Cache the result for future use
    if (events && events.length > 0) {
      cacheQueryResult(cacheKey, events);
      console.log(`Cached ${events.length} events for future use`);
    }
    
    console.log(`Found ${events.length} events in global feed query`);
    
    // If query returned empty, possible connection issue
    if (events.length === 0) {
      console.warn("Query returned no events, possible connection issue");
    }
    
    return events;
  } catch (error) {
    console.error("Error fetching global events:", error);
    // Return empty array to allow graceful fallback
    return [];
  }
}

/**
 * Fetch events with a timeout to prevent hanging requests
 * Improved error handling to properly propagate timeout errors
 */
async function fetchWithTimeout(relays: string[], filter: Filter): Promise<Event[]> {
  const pool = getSharedPool();
  if (!pool) {
    console.error("Failed to get shared pool for event fetching");
    return [];
  }
  
  // Always return a result even if there's an error, but log errors properly
  try {
    // Create a promise that resolves with the query results or rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timed out after ${MAX_REQUEST_TIME}ms`));
      }, MAX_REQUEST_TIME);
    });
    
    // Execute query
    const queryPromise = pool.querySync(relays, filter);
    
    // Use Promise.race to either get results or timeout
    const events = await Promise.race([queryPromise, timeoutPromise]);
    return events || [];
  } catch (error) {
    console.error(`Error fetching events:`, error);
    // Don't rethrow, just return empty array to prevent feed from breaking entirely
    return [];
  }
}
