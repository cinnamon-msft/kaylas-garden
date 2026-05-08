# E2E Tests

This inventory captures end-to-end user scenarios that are implemented in the app today. The scenarios are intentionally test-case oriented so they can be tracked, prioritized, and converted into automated coverage.

## Priority guide

- **P0**: Core product behavior or critical cross-feature integration.
- **P1**: Important supporting behavior, edge state, or secondary path.

## Scenario inventory

| ID | Area | User scenario / job to be done | Priority |
| --- | --- | --- | --- |
| E2E-001 | Auth | As a visitor, I am redirected to login when opening protected app routes without a session. | P0 |
| E2E-002 | Auth | As a visitor, I can start GitHub sign-in from the login page and preserve the callback URL. | P0 |
| E2E-003 | Auth | As a signed-in user, I can open the user menu, navigate to my profile, and sign out. | P0 |
| E2E-004 | Navigation | As a signed-in user, I can navigate between My Garden, Feed, Plant Library, Settings, and Profile from the header. | P0 |
| E2E-005 | Theme | As a user, I can switch between Garden, Earth, Ocean, and Space themes from the header and settings. | P1 |
| E2E-006 | My Garden | As a gardener, I can see my garden name, frost-date banner state, plant count, and plant cards. | P0 |
| E2E-007 | My Garden | As a gardener with no plants, I see an empty state with a clear "add first plant" action. | P1 |
| E2E-008 | My Garden | As a gardener, I can review each plant card's name, species, watering status, date added, entry count, and last-entry date. | P0 |
| E2E-009 | Add Plant | As a gardener, I can add a plant from the library picker modal with prefilled care information. | P0 |
| E2E-010 | Add Plant | As a gardener, I can search/filter the library inside the add-plant modal before selecting a plant. | P1 |
| E2E-011 | Add Plant | As a gardener, I can add a custom plant with name, species, sunlight, watering schedule, soil type, and notes. | P0 |
| E2E-012 | Add Plant | As a gardener, I am prevented from submitting the library add flow without selecting a plant and the custom flow without a name. | P1 |
| E2E-013 | Plant Detail | As a gardener, I can open a plant detail page from My Garden and return back to My Garden. | P0 |
| E2E-014 | Plant Care | As a gardener, I can view care info: sunlight, watering, soil, hardiness zone, companion plants, pests, and general notes. | P0 |
| E2E-015 | Plant Care | As a gardener, I can edit care info, save changes, or cancel without saving. | P0 |
| E2E-016 | Watering | As a gardener, I can see watering status: last watered, interval, and next watering. | P0 |
| E2E-017 | Watering | As a gardener, I can change a plant's watering interval and see future watering status update. | P0 |
| E2E-018 | Watering | As a gardener, I can log "Water Now" with an optional note, creating watering history and a feed activity. | P0 |
| E2E-019 | Watering | As a gardener, I can reveal recent watering history after water events exist. | P1 |
| E2E-020 | Progress | As a gardener, I can add a progress entry with date and required note. | P0 |
| E2E-021 | Progress | As a gardener, I can attach one or more progress photos to an entry. | P0 |
| E2E-022 | Progress | As a gardener, I am blocked or shown an error when uploading an unsupported image type or a file over 10 MB. | P1 |
| E2E-023 | Progress | As a gardener, I can see progress entries in the timeline with dates, notes, thumbnails, and full-size image viewing. | P0 |
| E2E-024 | Plant Delete | As a gardener, I can start plant deletion, see a destructive confirmation, cancel it, or confirm deletion. | P0 |
| E2E-025 | Library | As a gardener, I can browse popular plants in the Plant Library. | P1 |
| E2E-026 | Library | As a gardener, I can search plants by name, scientific name, or category and see result counts/no-match states. | P0 |
| E2E-027 | Library | As a gardener, I can select a library plant and view detailed growing information. | P0 |
| E2E-028 | Library | As a gardener, I can add a selected library plant directly to My Garden from the library detail view. | P0 |
| E2E-029 | Settings | As a gardener, I can rename my garden and see the new name reflected on My Garden. | P0 |
| E2E-030 | Settings | As a gardener, I can set a location or ZIP and look up frost dates. | P0 |
| E2E-031 | Settings | As a gardener, I can see last spring frost, first fall frost, growing season length, and explanatory planting guidance. | P1 |
| E2E-032 | Frost Banner | As a gardener, I see a prompt to set location when frost dates are missing. | P1 |
| E2E-033 | Frost Banner | As a gardener with frost dates, I see season-aware frost/growing-season messaging on My Garden. | P1 |
| E2E-034 | Social Discovery | As a gardener, I can search for other seeders by name, username, or email. | P0 |
| E2E-035 | Social Discovery | As a gardener, I can follow or unfollow another seeder from search results. | P0 |
| E2E-036 | Profile | As a gardener, I can view my own profile with counts and my public garden. | P1 |
| E2E-037 | Profile | As a gardener, I can view another seeder's profile, counts, follow state, and public garden. | P0 |
| E2E-038 | Profile | As a gardener, I can follow or unfollow another seeder from their profile. | P0 |
| E2E-039 | Feed | As a gardener following people, I can see feed activity from followed seeders. | P0 |
| E2E-040 | Feed | As a gardener following nobody, I see an empty feed state with a "Find Seeders" CTA. | P1 |
| E2E-041 | Feed | As a gardener, I can understand feed item type: plant added, progress entry added, or watered. | P0 |
| E2E-042 | Feed | As a gardener, I can like and unlike a feed item and see the count/state update. | P0 |
| E2E-043 | Feed | As a gardener, I can open comments for a feed item and see existing comments. | P0 |
| E2E-044 | Feed | As a gardener, I can post a non-empty comment and see it appear in the comments list. | P0 |
| E2E-045 | Feed | As a gardener, I am prevented from posting an empty comment. | P1 |
| E2E-046 | Social Side Effects | As a gardener, when I add a plant, add an entry, or water a plant, followers can later see that activity in their feed. | P0 |
| E2E-047 | Data Ownership | As a signed-in user, I only see and mutate my own private garden plants, while public profiles expose read-only garden cards. | P0 |
| E2E-048 | Error States | As a user, I see meaningful error states when plants, settings, feed, search, profile, upload, or comments fail to load/save. | P1 |

## Suggested automation groups

| Group | Scenarios |
| --- | --- |
| Auth and shell | E2E-001, E2E-002, E2E-003, E2E-004, E2E-005 |
| Garden management | E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011, E2E-012, E2E-024 |
| Plant detail, care, watering, and progress | E2E-013 through E2E-023 |
| Library | E2E-025, E2E-026, E2E-027, E2E-028 |
| Settings and frost dates | E2E-029, E2E-030, E2E-031, E2E-032, E2E-033 |
| Social, profile, and feed | E2E-034 through E2E-047 |
| Errors and resilience | E2E-022, E2E-045, E2E-048 |

## Recommended first P0 pack

Start with these to cover the highest-value product loops:

E2E-001, E2E-003, E2E-006, E2E-009, E2E-011, E2E-013, E2E-015, E2E-017, E2E-018, E2E-020, E2E-021, E2E-024, E2E-026, E2E-028, E2E-029, E2E-030, E2E-034, E2E-035, E2E-037, E2E-039, E2E-042, E2E-044, E2E-046, E2E-047.
