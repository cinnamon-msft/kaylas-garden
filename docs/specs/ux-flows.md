# UX Flows

This document describes broader user experience flows for The Seed Feed as the app exists today. These flows are intentionally less granular than the E2E test inventory and are meant to help reason about journeys, intent, entry points, and cross-feature continuity.

## Area tags

- `auth`: Sign-in, sign-out, sessions, and protected-route access.
- `shell`: Global navigation, header, theme switcher, and app orientation.
- `garden`: My Garden, plant cards, plant creation, plant detail, and plant deletion.
- `library`: Plant Library browsing, search, plant details, and library-to-garden actions.
- `care`: Care information, watering cadence, watering events, and progress tracking.
- `settings`: Garden name, location, frost dates, and personalization.
- `social`: Seeder discovery, following, profiles, feed, likes, and comments.
- `safety`: Validation, destructive confirmations, upload constraints, and error states.

## UXF-001: First authenticated visit and orientation

**Areas:** `auth`, `shell`, `garden`, `settings`

**User intent:** Get into the app, understand what it is for, and know where to start.

**Entry points:** Protected route redirect, login page, successful GitHub or dev-auth session.

**Flow:**

1. The user lands on login when unauthenticated.
2. The user signs in and arrives at My Garden.
3. The header establishes the main product areas: My Garden, Feed, Plant Library, and Settings.
4. The garden banner explains the primary purpose: track plants, upload photos, and watch them grow.
5. If frost dates are missing, the user is nudged toward Settings.
6. If plants are missing, the user is nudged toward adding the first plant.

**Successful outcome:** The user understands that their garden is the home base and sees a clear next action.

## UXF-002: Build out my garden

**Areas:** `garden`, `library`

**User intent:** Add plants so the app reflects what the user is growing.

**Entry points:** My Garden add button, empty-state CTA, Plant Library "Add to My Garden" action.

**Flow:**

1. The user starts from My Garden or Plant Library.
2. The user chooses between a library-backed plant and a custom plant.
3. Library-backed plants provide care defaults automatically and can be personalized with an optional nickname.
4. If the user already has a selected library plant, the app frames the add action as tracking another specimen rather than blocking the duplicate.
5. Custom plants let the user capture personal or non-library plants, with the custom submit action disabled until a name is present.
6. After creation, the user sees post-add actions to view the plant, add another, or return to the garden.
7. The plant appears as a card in My Garden with a nickname-aware display name, identity line, category-aware visual, watering status, date added, and progress count.

**Successful outcome:** The user has one or more plants represented in My Garden and can open each plant for deeper tracking.

## UXF-003: Learn before adding

**Areas:** `library`, `garden`

**User intent:** Browse and compare plants before deciding what belongs in the garden.

**Entry points:** Plant Library navigation, popular plant chips, library search.

**Flow:**

1. The user opens Plant Library.
2. The user either selects a popular plant or searches by common name, scientific name, or category.
3. The user reviews plant details: description, sunlight, watering, soil, days to harvest, hardiness zones, planting guidance, companions, pests, and growing tips.
4. The user can add the selected plant directly to My Garden, optionally nickname that plant instance, and then jump to the new plant or back to My Garden.

**Successful outcome:** The user can make an informed add/no-add decision from a single plant detail surface.

## UXF-004: Maintain a plant over time

**Areas:** `garden`, `care`, `social`

**User intent:** Keep plant care information current and log day-to-day maintenance.

**Entry points:** Plant card from My Garden, public profile garden card for read-only discovery, direct plant detail URL for owned plants.

**Flow:**

1. The user opens a plant detail page.
2. The user can add, edit, or clear an optional nickname without losing the plant's common name and species identity.
3. The user can update the plant display photo by uploading a new image or reusing the latest progress photo.
4. The user reviews care details and updates them when their understanding changes.
5. The user reviews watering status: last watered, interval, and next watering.
6. The user updates the watering interval when the plant's needs change.
7. The user logs watering with an optional note.
8. The app updates watering history and creates a social feed activity for followers.

**Successful outcome:** The plant detail page becomes the source of truth for ongoing plant care and recent maintenance.

## UXF-005: Document growth progress

**Areas:** `garden`, `care`, `social`

**User intent:** Capture observations and photos to build a timeline of plant growth.

**Entry points:** Plant detail progress timeline.

**Flow:**

1. The user opens a plant detail page.
2. The user adds a dated progress note.
3. The user optionally attaches one or more images.
4. The app uploads images, creates the progress entry, and refreshes the timeline.
5. Existing timeline entries remain visible with dates, notes, and image access.
6. The app creates a social feed activity for followers.

**Successful outcome:** The user can look back at the plant's growth history and followers can discover meaningful updates.

## UXF-006: Personalize garden context

**Areas:** `settings`, `garden`, `shell`

**User intent:** Make the app feel like the user's garden and get location-aware guidance.

**Entry points:** Settings navigation, frost-date prompt on My Garden, theme switcher in the header.

**Flow:**

1. The user opens Settings.
2. The user renames their garden and picks a garden icon from curated options.
3. The new garden name and icon appear on My Garden, while The Seed Feed header keeps its consistent app brand icon.
4. The user enters a city or ZIP-like location and looks up frost dates.
5. Settings displays last spring frost, first fall frost, and growing season length.
6. My Garden displays a season-aware frost or growing-season banner.
7. The user can change visual theme from Settings or the header.

**Successful outcome:** The app reflects the user's garden identity, preferred visual theme, and rough planting-season context.

## UXF-007: Discover and follow other seeders

**Areas:** `social`

**User intent:** Find other gardeners whose activity should appear in the feed.

**Entry points:** Feed empty-state CTA, direct `/users/search` route, profile links from feed items.

**Flow:**

1. The user opens Find Seeders.
2. The app shows discoverable seeders excluding the current user.
3. The user searches by name, username, or email.
4. The user follows or unfollows people from search results.
5. The user can open another seeder's profile for more context before deciding.

**Successful outcome:** The user controls whose gardening activity populates their feed.

## UXF-008: Understand another gardener

**Areas:** `social`, `garden`

**User intent:** See who another seeder is and what they are growing.

**Entry points:** Feed item author link, Find Seeders result, direct profile URL.

**Flow:**

1. The user opens another seeder's profile.
2. The profile shows name, username, follower count, following count, and plant count.
3. The profile shows the seeder's public garden as read-only plant cards with nickname-aware display names and identity context.
4. The user follows or unfollows that seeder from the profile.

**Successful outcome:** The user can evaluate a seeder's garden and manage the relationship from the profile page.

## UXF-009: Consume and participate in the feed

**Areas:** `social`

**User intent:** See what followed seeders are doing and respond socially.

**Entry points:** Feed navigation, feed empty-state CTA to find seeders.

**Flow:**

1. The user opens Feed.
2. If the user follows nobody or no activity exists, the app prompts them to find seeders.
3. If activity exists, the user sees activity cards from followed seeders.
4. Feed cards communicate the activity type: plant added, progress update, or watering, using plant nicknames where available while retaining identity context.
5. The user can open author profiles.
6. The user can like or unlike an activity.
7. The user can open comments, read existing comments, and post a non-empty comment.

**Successful outcome:** The feed becomes a social layer over garden activity rather than a separate content creation surface.

## UXF-010: Manage destructive and failure-prone actions safely

**Areas:** `safety`, `garden`, `care`

**User intent:** Avoid accidental loss and understand when something goes wrong.

**Entry points:** Plant detail delete action, upload flow, network-backed save actions.

**Flow:**

1. The user initiates a destructive plant delete action.
2. The app asks for confirmation and offers cancel.
3. The app prevents invalid or incomplete form submissions where possible.
4. Upload rejects unsupported image types and files over 10 MB.
5. Network-backed actions expose an error state when they fail.

**Successful outcome:** Risky actions are gated, recoverable, and understandable.

## Journey map summary

| Journey | Areas | Primary surfaces | Related E2E coverage |
| --- | --- | --- | --- |
| Get oriented | `auth`, `shell`, `garden`, `settings` | Login, header, My Garden | E2E-001 through E2E-008 |
| Build garden | `garden`, `library` | My Garden, add modal, Plant Library | E2E-009 through E2E-013, E2E-025 through E2E-028 |
| Maintain plants | `garden`, `care`, `social` | Plant detail, care card, watering card | E2E-014 through E2E-019 |
| Track growth | `garden`, `care`, `social` | Plant detail, progress timeline, upload | E2E-020 through E2E-023 |
| Personalize context | `settings`, `garden`, `shell` | Settings, frost banner, theme switcher | E2E-005, E2E-029 through E2E-033 |
| Build social graph | `social` | Find Seeders, user profiles | E2E-034 through E2E-038 |
| Participate socially | `social` | Feed, likes, comments, profile links | E2E-039 through E2E-046 |
| Stay safe | `safety`, `garden`, `care` | Confirmation, validation, error states | E2E-012, E2E-022, E2E-024, E2E-045, E2E-048 |
