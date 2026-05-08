"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { getPlantDisplayName, getPlantIdentityLine } from "@/lib/plant-display";

interface FeedItem {
  id: string;
  type: "plant_added" | "entry_added" | "watered";
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
  plant: { id: string; name: string; nickname?: string; species: string; thumbnailImage: string | null } | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getActivityText(type: FeedItem["type"], plantName: string): string {
  switch (type) {
    case "plant_added":
      return `added a new plant: ${plantName}`;
    case "entry_added":
      return `posted an update on ${plantName}`;
    case "watered":
      return `watered ${plantName}`;
  }
}

function getActivityEmoji(type: FeedItem["type"]): string {
  switch (type) {
    case "plant_added": return "🌱";
    case "entry_added": return "📝";
    case "watered": return "💧";
  }
}

function FeedCard({ item, onLikeToggle }: { readonly item: FeedItem; readonly onLikeToggle: (id: string, liked: boolean) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const plantName = item.plant ? getPlantDisplayName(item.plant) : "a plant";
  const plantIdentity = item.plant ? getPlantIdentityLine(item.plant) : "";

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/feed/${item.id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      void loadComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await fetch(`/api/feed/${item.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      void loadComments();
    }
  };

  return (
    <article className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href={`/users/${item.user?.id}`} className="shrink-0">
          {item.user?.image ? (
            <Image src={item.user.image} alt="" width={40} height={40} className="rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {item.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">
            <a href={`/users/${item.user?.id}`} className="font-semibold hover:underline">
              {item.user?.name || "Unknown"}
            </a>{" "}
            {getActivityText(item.type, plantName)}
          </p>
          <p className="text-xs text-text-secondary">{formatTimeAgo(item.createdAt)}</p>
          {plantIdentity && (
            <p className="text-xs italic text-text-secondary">{plantIdentity}</p>
          )}
        </div>
        <span className="text-2xl" aria-hidden="true">{getActivityEmoji(item.type)}</span>
      </div>

      {/* Plant preview */}
      {item.plant?.thumbnailImage && (
        <div className="mt-3 overflow-hidden rounded-lg">
          <Image
            src={`/api/uploads/${item.plant.thumbnailImage}`}
            alt={plantName}
            width={600}
            height={300}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
        <button
          onClick={() => onLikeToggle(item.id, item.likedByMe)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            item.likedByMe ? "text-red-500 font-medium" : "text-text-secondary hover:text-red-500"
          }`}
        >
          {item.likedByMe ? "❤️" : "🤍"} {item.likeCount}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"
        >
          💬 {item.commentCount}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 border-t border-border pt-3">
          {loadingComments && <p className="text-xs text-text-secondary">Loading comments...</p>}
          {!loadingComments && comments.length === 0 && (
            <p className="text-xs text-text-secondary">No comments yet. Be the first!</p>
          )}
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.user?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{c.user?.name}</span>{" "}
                    <span className="text-text-secondary">{c.text}</span>
                  </p>
                  <p className="text-xs text-text-secondary">{formatTimeAgo(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmitComment} className="mt-2 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-lg border border-border bg-bg-page px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-on-primary disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Failed to load feed");
      setFeed(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const handleLikeToggle = async (feedItemId: string, currentlyLiked: boolean) => {
    // Optimistic update
    setFeed((prev) =>
      prev.map((item) =>
        item.id === feedItemId
          ? {
              ...item,
              likedByMe: !currentlyLiked,
              likeCount: item.likeCount + (currentlyLiked ? -1 : 1),
            }
          : item
      )
    );

    const method = currentlyLiked ? "DELETE" : "POST";
    await fetch(`/api/feed/${feedItemId}/like`, { method });
  };

  return (
    <>
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          <span aria-hidden="true">📰</span> Feed
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          See what your gardening friends are up to
        </p>
      </section>

      {loading && (
        <div className="flex justify-center py-20 text-text-secondary">
          <span className="animate-pulse text-lg">Loading feed…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && feed.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg-card py-20 text-center">
          <span className="text-5xl">🌿</span>
          <p className="text-lg text-text-secondary">
            Your feed is empty! Follow some friends to fertilize your feed.
          </p>
          <a
            href="/users/search"
            className="rounded-lg bg-primary px-5 py-2.5 font-medium text-text-on-primary hover:bg-primary-dark"
          >
            Find Seeders
          </a>
        </div>
      )}

      {!loading && !error && feed.length > 0 && (
        <div className="space-y-4">
          {feed.map((item) => (
            <FeedCard key={item.id} item={item} onLikeToggle={handleLikeToggle} />
          ))}
        </div>
      )}
    </>
  );
}
