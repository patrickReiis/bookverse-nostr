
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
  
  // Create filter for query
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
    console.log("Using cached events for global feed, count:", cachedEvents.length);
    return cachedEvents;
  }
  
  // Execute query with timeout
  try {
    console.log(`Querying ${relays.length} relays for global feed events...`);
    
    // Get the pool for querying
    const pool = getSharedPool();
    if (!pool) {
      console.error("Failed to get shared pool for event fetching");
      return [];
    }
    
    // Execute the query without a catch block to allow errors to bubble up
    const events = await pool.querySync(relays, combinedFilter);
    console.log(`Received ${events.length} raw events from relays`);
    
    // Cache the result for future use
    if (events && events.length > 0) {
      cacheQueryResult(cacheKey, events);
      console.log(`Cached ${events.length} events for future use`);
    }
    
    return events || [];
  } catch (error) {
    console.error("Error fetching global events:", error);
    // Return empty array to allow graceful fallback
    return [];
  }
}
