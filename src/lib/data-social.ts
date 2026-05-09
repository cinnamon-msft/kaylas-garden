import { db } from "./db";
import { schema } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { Plant, PlantEntry, PlantCareInfo, WateringEvent, UserSettings, FrostDates } from "./types";
import { DEFAULT_GARDEN_ICON, normalizeGardenIcon } from "./garden-icons";

// ─── Helper: Convert DB plant row to API Plant type ──────────────────────────

function toPlantApi(row: typeof schema.plants.$inferSelect & {
  entries?: (typeof schema.plantEntries.$inferSelect)[];
  wateringHistory?: (typeof schema.wateringEvents.$inferSelect)[];
}): Plant {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname || undefined,
    species: row.species,
    dateAdded: row.dateAdded.toISOString(),
    thumbnailImage: row.thumbnailImage || "",
    careInfo: (row.careInfo as PlantCareInfo) || {
      sunlight: "",
      wateringSchedule: "",
      soilType: "",
      hardinessZone: "",
      companionPlants: [],
      commonPests: [],
      generalNotes: "",
    },
    entries: (row.entries || []).map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      note: e.note,
      images: e.images || [],
    })),
    wateringIntervalDays: row.wateringIntervalDays,
    wateringHistory: (row.wateringHistory || []).map((w) => ({
      id: w.id,
      date: w.date.toISOString(),
      note: w.note,
    })),
  };
}

// ─── Plants ──────────────────────────────────────────────────────────────────

export async function getPlants(userId: string): Promise<Plant[]> {
  const rows = await db.query.plants.findMany({
    where: eq(schema.plants.userId, userId),
    orderBy: desc(schema.plants.dateAdded),
  });

  // Fetch entries and watering history for all plants
  const plantIds = rows.map((r) => r.id);
  if (plantIds.length === 0) return [];

  const entries = await db.query.plantEntries.findMany({
    where: inArray(schema.plantEntries.plantId, plantIds),
    orderBy: desc(schema.plantEntries.date),
  });

  const waterings = await db.query.wateringEvents.findMany({
    where: inArray(schema.wateringEvents.plantId, plantIds),
    orderBy: desc(schema.wateringEvents.date),
  });

  const entriesByPlant = new Map<string, (typeof entries)[number][]>();
  for (const entry of entries) {
    const list = entriesByPlant.get(entry.plantId) || [];
    list.push(entry);
    entriesByPlant.set(entry.plantId, list);
  }

  const wateringsByPlant = new Map<string, (typeof waterings)[number][]>();
  for (const w of waterings) {
    const list = wateringsByPlant.get(w.plantId) || [];
    list.push(w);
    wateringsByPlant.set(w.plantId, list);
  }

  return rows.map((row) =>
    toPlantApi({
      ...row,
      entries: entriesByPlant.get(row.id) || [],
      wateringHistory: wateringsByPlant.get(row.id) || [],
    })
  );
}

export async function getPlant(userId: string, plantId: string): Promise<Plant | undefined> {
  const row = await db.query.plants.findFirst({
    where: and(eq(schema.plants.id, plantId), eq(schema.plants.userId, userId)),
  });
  if (!row) return undefined;

  const entries = await db.query.plantEntries.findMany({
    where: eq(schema.plantEntries.plantId, plantId),
    orderBy: desc(schema.plantEntries.date),
  });

  const waterings = await db.query.wateringEvents.findMany({
    where: eq(schema.wateringEvents.plantId, plantId),
    orderBy: desc(schema.wateringEvents.date),
  });

  return toPlantApi({ ...row, entries, wateringHistory: waterings });
}

export async function createPlant(
  userId: string,
  plant: Omit<Plant, "id" | "dateAdded" | "entries" | "wateringHistory">
): Promise<Plant> {
  const [row] = await db.insert(schema.plants).values({
    userId,
    name: plant.name,
    nickname: plant.nickname?.trim() || null,
    species: plant.species,
    thumbnailImage: plant.thumbnailImage || null,
    careInfo: plant.careInfo,
    wateringIntervalDays: plant.wateringIntervalDays,
  }).returning();

  // Create feed item
  await db.insert(schema.feedItems).values({
    userId,
    type: "plant_added",
    plantId: row.id,
  });

  return toPlantApi({ ...row, entries: [], wateringHistory: [] });
}

export async function updatePlant(
  userId: string,
  plantId: string,
  updates: Partial<Pick<Plant, "name" | "nickname" | "species" | "thumbnailImage" | "careInfo" | "wateringIntervalDays">>
): Promise<Plant> {
  const existing = await db.query.plants.findFirst({
    where: and(eq(schema.plants.id, plantId), eq(schema.plants.userId, userId)),
  });
  if (!existing) throw new Error(`Plant with id "${plantId}" not found`);

  const updateValues: Record<string, unknown> = {};
  if (updates.name !== undefined) updateValues.name = updates.name;
  if (updates.nickname !== undefined) updateValues.nickname = updates.nickname.trim() || null;
  if (updates.species !== undefined) updateValues.species = updates.species;
  if (updates.thumbnailImage !== undefined) updateValues.thumbnailImage = updates.thumbnailImage;
  if (updates.careInfo !== undefined) updateValues.careInfo = updates.careInfo;
  if (updates.wateringIntervalDays !== undefined) updateValues.wateringIntervalDays = updates.wateringIntervalDays;

  if (Object.keys(updateValues).length > 0) {
    await db.update(schema.plants).set(updateValues).where(eq(schema.plants.id, plantId));
  }

  return (await getPlant(userId, plantId))!;
}

export async function deletePlant(userId: string, plantId: string): Promise<void> {
  const existing = await db.query.plants.findFirst({
    where: and(eq(schema.plants.id, plantId), eq(schema.plants.userId, userId)),
  });
  if (!existing) throw new Error(`Plant with id "${plantId}" not found`);

  await db.delete(schema.plants).where(eq(schema.plants.id, plantId));
}

export async function addPlantEntry(
  userId: string,
  plantId: string,
  entry: Omit<PlantEntry, "id">
): Promise<PlantEntry> {
  // Verify ownership
  const plant = await db.query.plants.findFirst({
    where: and(eq(schema.plants.id, plantId), eq(schema.plants.userId, userId)),
  });
  if (!plant) throw new Error(`Plant with id "${plantId}" not found`);

  const [row] = await db.insert(schema.plantEntries).values({
    plantId,
    date: new Date(entry.date),
    note: entry.note,
    images: entry.images,
  }).returning();

  // Create feed item
  await db.insert(schema.feedItems).values({
    userId,
    type: "entry_added",
    plantId,
    entryId: row.id,
  });

  return {
    id: row.id,
    date: row.date.toISOString(),
    note: row.note,
    images: row.images || [],
  };
}

// ─── Watering ────────────────────────────────────────────────────────────────

export async function waterPlant(
  userId: string,
  plantId: string,
  event: Omit<WateringEvent, "id">
): Promise<WateringEvent> {
  // Verify ownership
  const plant = await db.query.plants.findFirst({
    where: and(eq(schema.plants.id, plantId), eq(schema.plants.userId, userId)),
  });
  if (!plant) throw new Error(`Plant with id "${plantId}" not found`);

  const [row] = await db.insert(schema.wateringEvents).values({
    plantId,
    date: new Date(event.date),
    note: event.note,
  }).returning();

  // Create feed item
  await db.insert(schema.feedItems).values({
    userId,
    type: "watered",
    plantId,
    wateringEventId: row.id,
  });

  return {
    id: row.id,
    date: row.date.toISOString(),
    note: row.note,
  };
}

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  location: "",
  gardenName: "My Garden",
  gardenIcon: DEFAULT_GARDEN_ICON,
  theme: "green",
  frostDates: null,
};

export async function getSettings(userId: string): Promise<UserSettings> {
  const row = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  });
  if (!row) return DEFAULT_SETTINGS;
  return {
    location: row.location || "",
    gardenName: row.gardenName || "My Garden",
    gardenIcon: normalizeGardenIcon(row.gardenIcon),
    theme: row.theme,
    frostDates: row.frostDates as FrostDates | null,
  };
}

export async function updateSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  });

  if (existing) {
    const updateValues: Record<string, unknown> = {};
    if (settings.theme !== undefined) updateValues.theme = settings.theme;
    if (settings.location !== undefined) updateValues.location = settings.location;
    if (settings.gardenName !== undefined) updateValues.gardenName = settings.gardenName;
    if (settings.gardenIcon !== undefined) updateValues.gardenIcon = normalizeGardenIcon(settings.gardenIcon);
    if (settings.frostDates !== undefined) updateValues.frostDates = settings.frostDates;
    await db.update(schema.userSettings).set(updateValues).where(eq(schema.userSettings.userId, userId));
  } else {
    await db.insert(schema.userSettings).values({
      userId,
      theme: settings.theme || "green",
      gardenName: settings.gardenName || null,
      gardenIcon: normalizeGardenIcon(settings.gardenIcon),
      location: settings.location || null,
      frostDates: settings.frostDates || null,
    });
  }

  return getSettings(userId);
}

// ─── Social: Follows ─────────────────────────────────────────────────────────

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) throw new Error("Cannot follow yourself");
  await db.insert(schema.follows).values({ followerId, followingId }).onConflictDoNothing();
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await db.delete(schema.follows).where(
    and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId))
  );
}

export async function getFollowers(userId: string) {
  const rows = await db.query.follows.findMany({
    where: eq(schema.follows.followingId, userId),
  });
  if (rows.length === 0) return [];
  const userRows = await db.query.users.findMany({
    where: inArray(schema.users.id, rows.map((r) => r.followerId)),
  });
  return userRows.map((u) => ({ id: u.id, name: u.name, image: u.image, username: u.username }));
}

export async function getFollowing(userId: string) {
  const rows = await db.query.follows.findMany({
    where: eq(schema.follows.followerId, userId),
  });
  if (rows.length === 0) return [];
  const userRows = await db.query.users.findMany({
    where: inArray(schema.users.id, rows.map((r) => r.followingId)),
  });
  return userRows.map((u) => ({ id: u.id, name: u.name, image: u.image, username: u.username }));
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const row = await db.query.follows.findFirst({
    where: and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)),
  });
  return !!row;
}

// ─── Social: Feed ────────────────────────────────────────────────────────────

export async function getFeed(userId: string, limit = 50, offset = 0) {
  // Get users that the current user follows
  const followRows = await db.query.follows.findMany({
    where: eq(schema.follows.followerId, userId),
  });
  const followingIds = followRows.map((r) => r.followingId);

  if (followingIds.length === 0) return [];

  const items = await db.query.feedItems.findMany({
    where: inArray(schema.feedItems.userId, followingIds),
    orderBy: desc(schema.feedItems.createdAt),
    limit,
    offset,
  });

  // Enrich feed items with user, plant, and social data
  const userIds = [...new Set(items.map((i) => i.userId))];
  const plantIds = [...new Set(items.filter((i) => i.plantId).map((i) => i.plantId!))];
  const feedItemIds = items.map((i) => i.id);
  const entryIds = items.filter((i) => i.entryId).map((i) => i.entryId!);
  const wateringEventIds = items.filter((i) => i.wateringEventId).map((i) => i.wateringEventId!);

  const [feedUsers, feedPlants, feedLikes, feedComments, userSettingsList, feedEntries, feedWateringEvents] = await Promise.all([
    userIds.length > 0
      ? db.query.users.findMany({ where: inArray(schema.users.id, userIds) })
      : [],
    plantIds.length > 0
      ? db.query.plants.findMany({ where: inArray(schema.plants.id, plantIds) })
      : [],
    feedItemIds.length > 0
      ? db.query.likes.findMany({ where: inArray(schema.likes.feedItemId, feedItemIds) })
      : [],
    feedItemIds.length > 0
      ? db.query.comments.findMany({ where: inArray(schema.comments.feedItemId, feedItemIds) })
      : [],
    userIds.length > 0
      ? db.query.userSettings.findMany({ where: inArray(schema.userSettings.userId, userIds) })
      : [],
    entryIds.length > 0
      ? db.query.plantEntries.findMany({ where: inArray(schema.plantEntries.id, entryIds) })
      : [],
    wateringEventIds.length > 0
      ? db.query.wateringEvents.findMany({ where: inArray(schema.wateringEvents.id, wateringEventIds) })
      : [],
  ]);

  const usersMap = new Map(feedUsers.map((u) => [u.id, u]));
  const plantsMap = new Map(feedPlants.map((p) => [p.id, p]));
  const userSettingsMap = new Map(userSettingsList.map((s) => [s.userId, s]));
  const entriesMap = new Map(feedEntries.map((e) => [e.id, e]));
  const wateringEventsMap = new Map(feedWateringEvents.map((w) => [w.id, w]));

  return items.map((item) => {
    const user = usersMap.get(item.userId);
    const plant = item.plantId ? plantsMap.get(item.plantId) : null;
    const userSettings = userSettingsMap.get(item.userId);
    const entry = item.entryId ? entriesMap.get(item.entryId) : null;
    const wateringEvent = item.wateringEventId ? wateringEventsMap.get(item.wateringEventId) : null;
    const itemWaters = feedLikes.filter((l) => l.feedItemId === item.id);
    const itemComments = feedComments.filter((c) => c.feedItemId === item.id);

    return {
      id: item.id,
      type: item.type,
      createdAt: item.createdAt.toISOString(),
      user: user ? { id: user.id, name: user.name, image: user.image } : null,
      gardenName: userSettings?.gardenName || null,
      plant: plant ? { id: plant.id, name: plant.name, nickname: plant.nickname || undefined, species: plant.species, thumbnailImage: plant.thumbnailImage } : null,
      entry: entry ? { note: entry.note, images: entry.images || [] } : null,
      wateringEvent: wateringEvent ? { note: wateringEvent.note } : null,
      waterCount: itemWaters.length,
      commentCount: itemComments.length,
      wateredByMe: itemWaters.some((l) => l.userId === userId),
    };
  });
}

// ─── Social: Waters ──────────────────────────────────────────────────────────

export async function waterFeedItem(userId: string, feedItemId: string): Promise<void> {
  await db.insert(schema.likes).values({ userId, feedItemId }).onConflictDoNothing();
}

export async function unwaterFeedItem(userId: string, feedItemId: string): Promise<void> {
  await db.delete(schema.likes).where(
    and(eq(schema.likes.userId, userId), eq(schema.likes.feedItemId, feedItemId))
  );
}

// Backwards compatibility aliases
export const likeFeedItem = waterFeedItem;
export const unlikeFeedItem = unwaterFeedItem;

// ─── Social: Comments ────────────────────────────────────────────────────────

export async function addComment(userId: string, feedItemId: string, text: string) {
  const [row] = await db.insert(schema.comments).values({
    userId,
    feedItemId,
    text,
  }).returning();
  return row;
}

export async function getComments(feedItemId: string) {
  const rows = await db.query.comments.findMany({
    where: eq(schema.comments.feedItemId, feedItemId),
    orderBy: schema.comments.createdAt,
  });

  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const commentUsers = await db.query.users.findMany({
    where: inArray(schema.users.id, userIds),
  });
  const usersMap = new Map(commentUsers.map((u) => [u.id, u]));

  return rows.map((r) => {
    const user = usersMap.get(r.userId);
    return {
      id: r.id,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      user: user ? { id: user.id, name: user.name, image: user.image } : null,
    };
  });
}

// ─── User Discovery ──────────────────────────────────────────────────────────

export async function searchUsers(query: string, currentUserId: string, limit = 20) {
  // Simple search by name - in production you'd use full-text search
  const [allUsers, followRows] = await Promise.all([
    db.query.users.findMany({ limit: 100 }),
    db.query.follows.findMany({ where: eq(schema.follows.followerId, currentUserId) }),
  ]);
  const followingIds = new Set(followRows.map((row) => row.followingId));
  const q = query.trim().toLowerCase();
  return allUsers
    .filter((u) => {
      if (u.id === currentUserId) return false;
      if (!q) return true;

      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    })
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      username: u.username,
      following: followingIds.has(u.id),
    }));
}

export async function getUserProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  if (!user) return null;

  const [followerCount, followingCount, plantCount] = await Promise.all([
    db.query.follows.findMany({ where: eq(schema.follows.followingId, userId) }).then((r) => r.length),
    db.query.follows.findMany({ where: eq(schema.follows.followerId, userId) }).then((r) => r.length),
    db.query.plants.findMany({ where: eq(schema.plants.userId, userId) }).then((r) => r.length),
  ]);

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    username: user.username,
    createdAt: user.createdAt.toISOString(),
    followerCount,
    followingCount,
    plantCount,
  };
}
