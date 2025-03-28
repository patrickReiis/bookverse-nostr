import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Post, SocialActivity } from "@/lib/nostr/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookCover } from "@/components/book/BookCover";
import { formatPubkey } from "@/lib/utils/format";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, BookOpen, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { reactToContent } from "@/lib/nostr";
import { RepliesSection } from "@/components/social/RepliesSection";

interface PostCardProps {
  post: Post | SocialActivity;
  onReaction?: (postId: string) => void;
}

export function PostCard({ post, onReaction }: PostCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  const isSocialActivity = 'type' in post && post.type === 'post';
  const postData = isSocialActivity 
    ? {
        id: post.id,
        content: post.content || "",
        pubkey: post.pubkey,
        author: post.author,
        createdAt: post.createdAt,
        taggedBook: post.book.isbn ? {
          isbn: post.book.isbn,
          title: post.book.title,
          coverUrl: post.book.coverUrl
        } : undefined,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        isSpoiler: post.isSpoiler,
        reactions: post.reactions,
        replies: post.replies
      }
    : post as Post;
  
  const authorName = postData.author?.name || formatPubkey(postData.pubkey);
  const timeAgo = formatDistanceToNow(new Date(postData.createdAt), { addSuffix: true });
  
  const handleRevealSpoiler = () => {
    setSpoilerRevealed(true);
  };
  
  const handleReaction = async () => {
    if (onReaction) {
      onReaction(postData.id);
    } else {
      try {
        await reactToContent(postData.id);
        toast({
          title: "Reaction sent",
          description: "You've reacted to this post"
        });
      } catch (error) {
        console.error("Error reacting to post:", error);
        toast({
          title: "Error",
          description: "Could not send reaction",
          variant: "destructive"
        });
      }
    }
  };

  const handleImageError = (url: string) => {
    console.log(`Error loading image: ${url}`);
    setImageErrors(prev => ({ ...prev, [url]: true }));
  };

  const detectAndRenderMediaUrls = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov|webm))/gi;
    const urlMatches = content.match(urlRegex);
    
    if (!urlMatches) return null;
    
    return urlMatches.map((url, index) => {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      const isVideo = /\.(mp4|mov|webm)$/i.test(url);
      
      if (isImage && !imageErrors[url]) {
        return (
          <div key={index} className="mt-3">
            <img 
              src={url} 
              alt="Media from post content" 
              className="rounded-md max-h-80 object-contain mx-auto" 
              loading="lazy"
              onError={() => handleImageError(url)}
            />
          </div>
        );
      } else if (isVideo) {
        return (
          <div key={index} className="mt-3">
            <video 
              src={url} 
              controls 
              className="rounded-md w-full max-h-80" 
              onError={(e) => {
                console.log(`Error loading embedded video: ${url}`);
                (e.target as HTMLVideoElement).style.display = 'none';
              }}
            />
          </div>
        );
      }
      
      return null;
    }).filter(Boolean);
  };

  const renderBookInfo = () => {
    if (!postData.taggedBook) return null;
    
    return (
      <Link to={`/book/${postData.taggedBook.isbn}`} className="block">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 rounded-lg mt-3 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-100 dark:border-indigo-900">
          <div className="flex-shrink-0 w-12 h-18 relative">
            <BookCover 
              coverUrl={postData.taggedBook.coverUrl} 
              title={postData.taggedBook.title} 
              size="xsmall" 
            />
            <div className="absolute -bottom-1 -right-1 bg-indigo-100 dark:bg-indigo-800 rounded-full p-1 shadow-sm">
              <BookOpen className="h-3.5 w-3.5 text-indigo-700 dark:text-indigo-300" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-0.5 flex items-center">
              Tagged Book
            </div>
            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{postData.taggedBook.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ISBN: {postData.taggedBook.isbn}</p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link to={`/user/${postData.pubkey}`}>
              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80">
                <AvatarImage src={postData.author?.picture} />
                <AvatarFallback>{authorName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link 
                to={`/user/${postData.pubkey}`} 
                className="font-medium hover:underline"
              >
                {authorName}
              </Link>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          
          {postData.isSpoiler && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full text-xs border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3 w-3" />
              <span>Spoiler</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="py-2">
        {postData.isSpoiler && !spoilerRevealed ? (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 rounded-md text-center">
              <p className="text-amber-700 dark:text-amber-400 mb-2">
                This post contains spoilers
                {postData.taggedBook && ` for "${postData.taggedBook.title}"`}
              </p>
              <Button variant="outline" size="sm" onClick={handleRevealSpoiler} 
                className="bg-white dark:bg-transparent hover:bg-amber-50 dark:hover:bg-amber-900/30 border-amber-300 dark:border-amber-700">
                <Eye className="mr-1 h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">Reveal Content</span>
              </Button>
            </div>
            
            {renderBookInfo()}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap break-words overflow-hidden">{postData.content}</p>
            
            {postData.mediaUrl && postData.mediaType === 'image' && !imageErrors[postData.mediaUrl] && (
              <div className="mt-3">
                <img 
                  src={postData.mediaUrl} 
                  alt="Post media" 
                  className="rounded-md max-h-80 mx-auto object-contain shadow-sm" 
                  loading="lazy"
                  onError={() => handleImageError(postData.mediaUrl!)}
                />
              </div>
            )}
            
            {postData.mediaUrl && postData.mediaType === 'video' && (
              <div className="mt-3 rounded-md overflow-hidden shadow-sm">
                <video 
                  src={postData.mediaUrl} 
                  controls 
                  className="rounded-md w-full max-h-80" 
                  onError={(e) => {
                    console.log(`Error loading video: ${postData.mediaUrl}`);
                    (e.target as HTMLVideoElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {detectAndRenderMediaUrls(postData.content)}
            
            {postData.taggedBook && renderBookInfo()}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 py-2 flex-col items-start">
        <RepliesSection 
          eventId={postData.id}
          authorPubkey={postData.pubkey}
          initialReplies={postData.replies}
          buttonLayout="horizontal"
          onReaction={handleReaction}
          reactionCount={postData.reactions?.count}
          userReacted={postData.reactions?.userReacted}
        />
      </CardFooter>
    </Card>
  );
}
