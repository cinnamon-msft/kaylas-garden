"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

interface UserSearchResult {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  following: boolean;
}

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const searchSeeders = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const res = await fetch(`/api/users/search${params.size ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("Failed to find seeders");
      setResults(await res.json());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void searchSeeders("");
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchSeeders(query);
  };

  const handleFollowToggle = async (user: UserSearchResult) => {
    setUpdatingUserId(user.id);

    try {
      const method = user.following ? "DELETE" : "POST";
      const res = await fetch(`/api/users/${user.id}/follow`, { method });
      if (!res.ok) throw new Error(user.following ? "Failed to unfollow seeder" : "Failed to follow seeder");

      setResults((current) =>
        current.map((result) =>
          result.id === user.id ? { ...result, following: !result.following } : result
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <>
      <section className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          <span aria-hidden="true">🌿</span> Find Seeders
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Discover other gardeners and follow them to fill your feed.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="seeder-search">
          Search seeders
        </label>
        <input
          id="seeder-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, username, or email"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-card px-4 py-2 text-text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-text-on-primary hover:bg-primary-dark disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div role="status" aria-live="polite" className="flex justify-center py-20 text-text-secondary">
          <span className="animate-pulse text-lg">Finding seeders...</span>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="rounded-2xl border border-border bg-bg-card py-20 text-center">
          <span aria-hidden="true" className="text-5xl">🌱</span>
          <p className="mt-4 text-lg text-text-secondary">No seeders found.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((user) => (
            <article
              key={user.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-bg-card p-4 shadow-sm"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/users/${user.id}`}
                  className="font-semibold text-text-primary hover:text-primary"
                >
                  {user.name || "Unnamed Seeder"}
                </Link>
                {user.username && (
                  <p className="truncate text-sm text-text-secondary">@{user.username}</p>
                )}
              </div>
              <button
                onClick={() => void handleFollowToggle(user)}
                disabled={updatingUserId === user.id}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
                  user.following
                    ? "border border-border bg-bg-page text-text-primary hover:bg-hover"
                    : "bg-primary text-text-on-primary hover:bg-primary-dark"
                }`}
              >
                {user.following ? "Following" : "Follow"}
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
