
import { SimplePool, type Filter } from "nostr-tools";
import { NostrProfile, FollowList, NOSTR_KINDS } from "../types";
import { getUserRelays } from "../relay";

/**
 * Get the list of users a person follows
 */
export async function fetchFollowingList(pubkey: string): Promise<FollowList> {
  const relays = getUserRelays();
  const pool = new SimplePool();
  
  try {
    const filter: Filter = {
      kinds: [NOSTR_KINDS.CONTACTS],
      authors: [pubkey]
    };
    
    const events = await pool.querySync(relays, filter);
    
    // Use the most recent CONTACTS event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    if (!latestEvent) {
      return { follows: [] };
    }
    
    // Extract followed pubkeys from p tags
    const follows = latestEvent.tags
      .filter(tag => tag[0] === 'p')
      .map(tag => tag[1]);
    
    return { follows };
  } catch (error) {
    console.error("Error fetching following list:", error);
    return { follows: [] };
  } finally {
    pool.close(relays);
  }
}

/**
 * Fetch profile for a user
 */
export async function fetchUserProfile(pubkey: string): Promise<NostrProfile | null> {
  const relays = getUserRelays();
  const pool = new SimplePool();
  
  try {
    const filter: Filter = {
      kinds: [NOSTR_KINDS.SET_METADATA],
      authors: [pubkey]
    };
    
    console.log(`Fetching profile for ${pubkey} from relays:`, relays);
    const events = await pool.querySync(relays, filter);
    console.log(`Received ${events.length} profile events for ${pubkey}`);
    
    // Use the most recent profile event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    if (!latestEvent) {
      console.log(`No profile events found for ${pubkey}`);
      // Return a minimal profile with just the pubkey
      return {
        npub: pubkey,
        pubkey: pubkey,
        name: "",
        relays: []
      };
    }
    
    try {
      const profileData = JSON.parse(latestEvent.content);
      console.log(`Parsed profile data for ${pubkey}:`, profileData);
      
      return {
        npub: pubkey, // This will be converted to npub format in the UI
        pubkey: pubkey,
        name: profileData.name,
        display_name: profileData.display_name,
        picture: profileData.picture,
        about: profileData.about,
        website: profileData.website,
        lud16: profileData.lud16,
        banner: profileData.banner,
        relays: []
      };
    } catch (error) {
      console.error("Error parsing profile data:", error);
      return {
        npub: pubkey,
        pubkey: pubkey,
        name: "",
        relays: []
      };
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return {
      npub: pubkey,
      pubkey: pubkey,
      name: "",
      relays: []
    };
  } finally {
    pool.close(relays);
  }
}
