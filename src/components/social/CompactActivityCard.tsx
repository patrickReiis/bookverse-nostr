
import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SocialActivity } from "@/lib/nostr/types";
import { Button } from "@/components/ui/button";
import { nip19 } from "nostr-tools";

interface CompactActivityCardProps {
  activity: SocialActivity;
  onReaction: (activityId: string) => void;
}

export function CompactActivityCard({ activity, onReaction }: CompactActivityCardProps) {
  const formatPubkey = (pubkey: string): string => {
    try {
      const npub = nip19.npubEncode(pubkey);
      return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
    } catch {
      return `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;
    }
  };

  const renderActivityContent = () => {
    const userName = activity.author?.name || formatPubkey(activity.pubkey);
    const bookTitle = activity.book.title;
    
    switch (activity.type) {
      case 'tbr':
        return <span>added <strong>{bookTitle}</strong> to TBR</span>;
      case 'reading':
        return <span>started <strong>{bookTitle}</strong></span>;
      case 'finished':
        return <span>finished <strong>{bookTitle}</strong></span>;
      case 'rating':
        return <span>rated <strong>{bookTitle}</strong> ({activity.rating}★)</span>;
      case 'review':
        return <span>reviewed <strong>{bookTitle}</strong></span>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={activity.author?.picture} />
            <AvatarFallback>{activity.author?.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 items-center text-sm">
            <Link 
              to={`/user/${activity.pubkey}`} 
              className="font-medium hover:underline mr-1"
            >
              {activity.author?.name || formatPubkey(activity.pubkey)}
            </Link>
            <span className="text-muted-foreground">{renderActivityContent()}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground h-6 px-2 ml-auto"
            onClick={() => onReaction(activity.id)}
          >
            <Heart className={`h-3 w-3 ${activity.reactions?.userReacted ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
