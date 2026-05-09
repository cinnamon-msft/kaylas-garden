"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Droplet, MessageCircle, Search, X } from "lucide-react";
import Link from "next/link";

interface FeedItem {
  id: string;
  type: "plant_added" | "entry_added" | "watered";
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
  gardenName: string | null;
  plant: { id: string; name: string; nickname?: string; species: string; thumbnailImage: string | null } | null;
  entry: {
    note: string;
    plantingLocation?: string;
    images: Array<{ id: string; filename: string; caption: string; uploadedAt: string }>;
  } | null;
  wateringEvent: { note: string } | null;
  waterCount: number;
  commentCount: number;
  wateredByMe: boolean;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
}

interface UserSearchResult {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  following: boolean;
}

interface ImageViewerState {
  url: string;
  isOpen: boolean;
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

function getActivityText(type: FeedItem["type"], plant: FeedItem["plant"]): string {
  const plantDisplay = plant?.nickname ? `"${plant.nickname}"` : plant?.name ? plant.name : "a plant";
  switch (type) {
    case "plant_added":
      return `welcomed ${plantDisplay} to the garden!`;
    case "entry_added":
      return `had a moment with ${plantDisplay}`;
    case "watered":
      return `gave ${plantDisplay} some love`;
    default:
      return "updated their garden";
  }
}

function ImageViewer({ imageUrl, isOpen, onClose }: { imageUrl: string; isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
        title="Close (ESC)"
      >
        <X size={24} />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl w-full">
        <Image
          src={imageUrl}
          alt="Full size image"
          width={1600}
          height={1600}
          className="w-full h-auto rounded-lg"
        />
      </div>
    </div>
  );
}

function FeedCard({ item, onWaterToggle }: { readonly item: FeedItem; readonly onWaterToggle: (id: string, watered: boolean) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [imageViewer, setImageViewer] = useState<ImageViewerState>({ url: "", isOpen: false });

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
      <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
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
              <p className="text-sm text-text-primary font-body">
                <a href={`/users/${item.user?.id}`} className="font-semibold hover:underline">
                  {item.user?.name || "Unknown"}
                </a>{" "}
                <span className="text-text-secondary">{getActivityText(item.type, item.plant)}</span>
              </p>
              <p className="text-xs text-text-secondary font-body">{formatTimeAgo(item.createdAt)}</p>
            </div>
          </div>
          {item.gardenName && (
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-primary font-title">🌱 {item.gardenName}</p>
            </div>
          )}
        </div>

      {/* Plant info and entry content together - only when there's both */}
      {item.plant && item.entry && (
        <div className="mb-3 flex flex-col lg:flex-row gap-3">
          {/* Plant info and note on left */}
          <div className="flex-1">
            <div className="rounded-lg border border-border/50 bg-bg-page p-3 mb-3">
              <p className="text-base font-semibold text-text-primary font-title">
                {item.plant.nickname ? `"${item.plant.nickname}"` : item.plant.name}
              </p>
              {item.plant.nickname && (
                <p className="text-xs text-text-secondary italic font-body">{item.plant.name}</p>
              )}
              <p className="text-xs text-text-secondary mt-1 font-body">{item.plant.species}</p>
            </div>
            {item.entry && item.entry.note && (
              <p className="text-sm text-text-primary bg-bg-page rounded-lg p-3 italic font-body">
                "{item.entry.note}"
              </p>
            )}
            {item.entry?.plantingLocation && (
              <p className="mt-2 inline-flex rounded-full border border-border bg-bg-card px-2 py-0.5 text-xs text-text-secondary">
                📍 {item.entry.plantingLocation}
              </p>
            )}
          </div>
          {/* Images on right */}
          {item.entry && item.entry.images && item.entry.images.length > 0 && (
            <div className={`flex-shrink-0 w-full lg:w-48 grid gap-2 ${item.entry.images.length === 1 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-1"}`}>
              {item.entry.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setImageViewer({ url: `/api/uploads/${img.filename}`, isOpen: true })}
                  className="relative group cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Image
                    src={`/api/uploads/${img.filename}`}
                    alt=""
                    width={200}
                    height={200}
                    className="rounded-lg w-full object-cover aspect-square"
                  />
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100">View</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plant info card - when there's no entry (just plant_added or watered) */}
      {item.plant && !item.entry && (
        <div className="mb-3 rounded-lg border border-border/50 bg-bg-page p-3">
          <div className="flex gap-3">
            {item.plant.thumbnailImage && (
              <div className="shrink-0">
                <Image
                  src={`/api/uploads/${item.plant.thumbnailImage}`}
                  alt={item.plant.name}
                  width={80}
                  height={80}
                  className="rounded-lg w-20 h-20 object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-text-primary font-title">
                {item.plant.nickname ? `"${item.plant.nickname}"` : item.plant.name}
              </p>
              {item.plant.nickname && (
                <p className="text-xs text-text-secondary italic font-body">{item.plant.name}</p>
              )}
              <p className="text-xs text-text-secondary mt-1 font-body">{item.plant.species}</p>
            </div>
          </div>
        </div>
      )}

      {/* Entry content and images */}
      {item.entry && !item.plant && (
        <div className="mb-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Note and content on left, takes remaining space */}
            <div className="flex-1">
              {item.entry.note && (
                <p className="text-sm text-text-primary bg-bg-page rounded-lg p-3 italic font-body">
                  "{item.entry.note}"
                </p>
              )}
              {item.entry.plantingLocation && (
                <p className="mt-2 inline-flex rounded-full border border-border bg-bg-card px-2 py-0.5 text-xs text-text-secondary">
                  📍 {item.entry.plantingLocation}
                </p>
              )}
            </div>
            {/* Images sidebar on right, fixed width on desktop */}
            {item.entry.images && item.entry.images.length > 0 && (
              <div className={`flex-shrink-0 w-full lg:w-48 grid gap-2 ${item.entry.images.length === 1 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-1"}`}>
                {item.entry.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setImageViewer({ url: `/api/uploads/${img.filename}`, isOpen: true })}
                    className="relative group cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={`/api/uploads/${img.filename}`}
                      alt=""
                      width={200}
                      height={200}
                      className="rounded-lg w-full object-cover aspect-square"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100">View</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watering notes */}
      {item.wateringEvent && item.wateringEvent.note && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1 font-title">💧 Watering note:</p>
          <p className="text-sm text-blue-900 font-body">{item.wateringEvent.note}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-border pt-3">
        <button
          onClick={() => onWaterToggle(item.id, item.wateredByMe)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            item.wateredByMe ? "text-blue-500 font-medium" : "text-text-secondary hover:text-blue-500"
          }`}
          title="Sprinkle some love!"
        >
          <Droplet
            size={18}
            className={item.wateredByMe ? "fill-blue-500" : ""}
          />
          {item.waterCount}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"
        >
          <MessageCircle size={18} />
          {item.commentCount}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 border-t border-border pt-3">
          {loadingComments && <p className="text-xs text-text-secondary font-body">Loading comments...</p>}
          {!loadingComments && comments.length === 0 && (
            <p className="text-xs text-text-secondary font-body">No comments yet. Be the first!</p>
          )}
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.user?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-body">
                    <span className="font-semibold">{c.user?.name}</span>{" "}
                    <span className="text-text-secondary">{c.text}</span>
                  </p>
                  <p className="text-xs text-text-secondary font-body">{formatTimeAgo(c.createdAt)}</p>
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
              className="flex-1 rounded-lg border border-border bg-bg-page px-3 py-1.5 text-sm focus:border-primary focus:outline-none font-body"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-on-primary disabled:opacity-50 font-title"
            >
              Post
            </button>
          </form>
        </div>
      )}

      <ImageViewer
        imageUrl={imageViewer.url}
        isOpen={imageViewer.isOpen}
        onClose={() => setImageViewer({ ...imageViewer, isOpen: false })}
      />
    </article>
  );
}

function SeederSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim() });
      const res = await fetch(`/api/users/search?${params}`);
      if (res.ok) {
        setResults(await res.json());
        setShowResults(true);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const handleToggleFollow = async (userId: string, isFollowing: boolean) => {
    const method = isFollowing ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      setResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, following: !u.following } : u))
      );
    }
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <label className="sr-only" htmlFor="seeder-search">
          Find seeders to follow
        </label>
        <div className="flex items-center gap-2 border border-border bg-bg-card rounded-lg px-3 py-2">
          <Search size={18} className="text-text-secondary" />
          <input
            id="seeder-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              void handleSearch(e.target.value);
            }}
            placeholder="Search seeders to follow…"
            className="flex-1 bg-transparent text-text-primary placeholder-text-secondary focus:outline-none font-body"
          />
        </div>

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 border border-border bg-bg-card rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-page/50"
              >
                <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {user.image ? (
                    <Image src={user.image} alt="" width={40} height={40} className="rounded-full shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary font-title truncate">{user.name}</p>
                    {user.username && (
                      <p className="text-xs text-text-secondary font-body truncate">@{user.username}</p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleToggleFollow(user.id, user.following)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors font-title ${
                    user.following
                      ? "bg-bg-page text-text-primary hover:bg-red-100 hover:text-red-700"
                      : "bg-primary text-text-on-primary hover:bg-primary-dark"
                  }`}
                >
                  {user.following ? "Unfollow" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        )}

        {showResults && searching && (
          <div className="absolute top-full left-0 right-0 mt-2 border border-border bg-bg-card rounded-lg p-3 z-10">
            <p className="text-sm text-text-secondary text-center font-body">Searching…</p>
          </div>
        )}

        {showResults && !searching && results.length === 0 && query.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 border border-border bg-bg-card rounded-lg p-3 z-10">
            <p className="text-sm text-text-secondary text-center font-body">No seeders found</p>
          </div>
        )}
      </div>
    </div>
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

  const handleWaterToggle = async (feedItemId: string, currentlyWatered: boolean) => {
    // Optimistic update
    setFeed((prev) =>
      prev.map((item) =>
        item.id === feedItemId
          ? {
              ...item,
              wateredByMe: !currentlyWatered,
              waterCount: item.waterCount + (currentlyWatered ? -1 : 1),
            }
          : item
      )
    );

    const method = currentlyWatered ? "DELETE" : "POST";
    await fetch(`/api/feed/${feedItemId}/water`, { method });
  };

  return (
    <>
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary font-title">
          <span aria-hidden="true">📰</span> Feed
        </h2>
        <p className="mt-1 text-sm text-text-secondary font-body">
          See what your gardening friends are up to
        </p>
      </section>

      <SeederSearch />

      {loading && (
        <div className="flex justify-center py-20 text-text-secondary">
          <span className="animate-pulse text-lg font-body">Loading feed…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 font-body">
          {error}
        </div>
      )}

      {!loading && !error && feed.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg-card py-20 text-center">
          <span className="text-5xl">🌿</span>
          <p className="text-lg text-text-secondary font-body">
            Your feed is empty! Follow some friends to fertilize your feed.
          </p>
          <a
            href="/users/search"
            className="rounded-lg bg-primary px-5 py-2.5 font-medium text-text-on-primary hover:bg-primary-dark font-title"
          >
            Find Seeders
          </a>
        </div>
      )}

      {!loading && !error && feed.length > 0 && (
        <div className="space-y-4">
          {feed.map((item) => (
            <FeedCard key={item.id} item={item} onWaterToggle={handleWaterToggle} />
          ))}
        </div>
      )}
    </>
  );
}
