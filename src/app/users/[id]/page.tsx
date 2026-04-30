"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import type { Plant } from "@/lib/types";
import { useSession } from "next-auth/react";

interface UserProfile {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  plantCount: number;
  plants: Plant[];
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const isOwnProfile = session?.user?.id === userId;

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        setProfile(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const checkFollowing = useCallback(async () => {
    if (isOwnProfile) return;
    const res = await fetch(`/api/users/${userId}/follow`);
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    void fetchProfile();
    void checkFollowing();
  }, [fetchProfile, checkFollowing]);

  const handleFollowToggle = async () => {
    const method = following ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      setFollowing(!following);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: prev.followerCount + (following ? -1 : 1),
            }
          : prev
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-text-secondary">
        <span className="animate-pulse text-lg">Loading profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
        User not found
      </div>
    );
  }

  return (
    <>
      {/* Profile header */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {profile.image ? (
            <Image
              src={profile.image}
              alt=""
              width={80}
              height={80}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
              {profile.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-text-primary">
              {profile.name || "Unnamed Seeder"}
            </h1>
            {profile.username && (
              <p className="text-sm text-text-secondary">@{profile.username}</p>
            )}
            <div className="mt-2 flex justify-center gap-6 text-sm text-text-secondary sm:justify-start">
              <span><strong className="text-text-primary">{profile.plantCount}</strong> plants</span>
              <span><strong className="text-text-primary">{profile.followerCount}</strong> seeders</span>
              <span><strong className="text-text-primary">{profile.followingCount}</strong> seeding</span>
            </div>
          </div>
          {!isOwnProfile && (
            <button
              onClick={handleFollowToggle}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                following
                  ? "border border-border bg-bg-page text-text-primary hover:bg-hover"
                  : "bg-primary text-text-on-primary hover:bg-primary-dark"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </section>

      {/* Their garden */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {isOwnProfile ? "Your" : `${profile.name || "Their"}'s`} Garden
        </h2>
        {profile.plants.length === 0 ? (
          <p className="text-text-secondary">No plants yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.plants.map((plant) => (
              <article
                key={plant.id}
                className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm"
              >
                <div className="relative h-32 bg-hover">
                  {plant.thumbnailImage ? (
                    <Image
                      src={`/api/uploads/${plant.thumbnailImage}`}
                      alt={plant.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">🌿</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-text-primary">{plant.name}</h3>
                  {plant.species && (
                    <p className="text-xs italic text-text-secondary">{plant.species}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
