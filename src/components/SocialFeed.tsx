import React, { useState, useEffect } from "react";
import { SocialActivity } from "@/lib/nostr/types";
import { 
  fetchSocialFeed, 
  fetchGlobalSocialFeed, 
  isLoggedIn,
  reactToContent
} from "@/lib/nostr";
import { useToast } from "@/hooks/use-toast";
import { ActivityCard } from "./social/ActivityCard";
import { EmptyFeedState } from "./social/EmptyFeedState";
import { FeedLoadingState } from "./social/FeedLoadingState";
import { Card } from "@/components/ui/card";
import { PostCard } from "./post/PostCard";

interface SocialFeedProps {
  activities?: SocialActivity[];
  type?: "followers" | "global";
  useMockData?: boolean;
  maxItems?: number;
}

export function SocialFeed({ activities, type = "followers", useMockData = false, maxItems }: SocialFeedProps) {
  const [localActivities, setLocalActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (activities) {
      setLocalActivities(activities);
      setLoading(false);
      return;
    }

    const loadSocialFeed = async () => {
      setLoading(true);
      try {
        if (useMockData) {
          console.log("Using mock data for social feed");
          
          setTimeout(() => {
            setLocalActivities([]);
            setLoading(false);
          }, 800);
        } else {
          console.log(`Fetching ${type} feed from Nostr network`);
          
          let feed: SocialActivity[] = [];
          
          if (type === "followers") {
            feed = await fetchSocialFeed(maxItems || 20);
          } else {
            feed = await fetchGlobalSocialFeed(maxItems || 30);
          }
          
          console.log(`Received ${feed.length} activities from Nostr network`);
          
          if (maxItems && feed.length > maxItems) {
            feed = feed.slice(0, maxItems);
          }
          
          setLocalActivities(feed);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading social feed:", error);
        setLoading(false);
        
        toast({
          title: "Error loading feed",
          description: "Could not load activities from the Nostr network. Check your connection.",
          variant: "destructive"
        });
      }
    };

    loadSocialFeed();
  }, [activities, type, useMockData, toast, maxItems]);

  const handleReact = async (activityId: string) => {
    if (!isLoggedIn()) {
      toast({
        title: "Login required",
        description: "Please sign in to react to posts",
        variant: "destructive"
      });
      return;
    }

    try {
      await reactToContent(activityId);
      toast({
        title: "Reaction sent",
        description: "You've reacted to this post"
      });
      
      setLocalActivities(prevActivities => 
        prevActivities.map(activity => {
          if (activity.id === activityId) {
            return {
              ...activity,
              reactions: {
                count: (activity.reactions?.count || 0) + 1,
                userReacted: true
              }
            };
          }
          return activity;
        })
      );
    } catch (error) {
      console.error("Error reacting to post:", error);
      toast({
        title: "Error",
        description: "Could not send reaction",
        variant: "destructive"
      });
    }
  };

  const handleFindFriends = () => {
    const findFriendsTab = document.querySelector('[value="find-friends"]');
    if (findFriendsTab && findFriendsTab instanceof HTMLElement) {
      findFriendsTab.click();
    }
  };

  if (loading) {
    return <FeedLoadingState />;
  }

  if (!isLoggedIn() && type === "followers") {
    return (
      <Card className="text-center p-6">
        <p className="text-muted-foreground mb-4">
          Sign in to see updates from people you follow
        </p>
      </Card>
    );
  }

  if (localActivities.length === 0) {
    return <EmptyFeedState type={type} onFindFriends={handleFindFriends} />;
  }

  return (
    <div className="space-y-4">
      {localActivities.map((activity) => {
        if (activity.type === 'post') {
          return (
            <PostCard
              key={activity.id}
              post={activity}
              onReaction={handleReact}
            />
          );
        }
        return (
          <ActivityCard 
            key={activity.id} 
            activity={activity} 
            onReaction={handleReact} 
          />
        );
      })}
    </div>
  );
}
