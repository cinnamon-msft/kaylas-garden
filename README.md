# 🌱 Kayla's Garden

A personal plant-tracking website to catalog plants, upload progress photos, track frost dates, and browse a curated plant library.

## Features

- **🌿 Plant Dashboard** — View all your tracked plants as cards with thumbnails, species info, and progress counts
- **📸 Progress Tracking** — Add timeline entries with notes and photos to track each plant's growth
- **📋 Care Information** — Store and edit care details: sunlight, watering, soil, hardiness zone, companion plants, pests
- **📚 Plant Library** — Browse a curated collection of plants with growing guidelines, care tips, and planting info, and add them straight to your garden
- **🥶 Frost Date Tracker** — Set your location to see frost date alerts and know when to plant
- **🎨 Multiple Themes** — Switch between Green 🌿, Earth 🌾, and Ocean 🌊 color themes

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** with CSS custom properties for theming
- Static, type-safe plant library bundled with the app
- File-based JSON storage (no external database required)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/cinnamon-msft/kaylas-garden.git
cd kaylas-garden
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Aspire

```bash
npm run aspire:start
```

This starts the Next.js app through the Aspire AppHost. For local development, use the **Dev login** command in the `web` resource action menu to sign in as `dev-feeder` without configuring GitHub OAuth. Use the **Seed dev gardens** command in the `gardendb` resource action menu to create/update the dev login users and add sample plants for both dev profiles.

To switch a browser back to the normal GitHub OAuth flow, use the **GitHub auth** command in the `web` resource action menu. To hide the dev-auth endpoint entirely, restart Aspire with dev auth disabled:

```powershell
$env:DEV_AUTH_ENABLED = "false"
npm run aspire:start
```

Set `DEV_AUTH_ENABLED` back to `true` or remove the environment variable before restarting if you want the dev-auth commands to work again.

To share the running web app from another device or with a friend, start the Aspire **devtunnel-web** resource from the dashboard or run:

```bash
aspire resource devtunnel-web start
```

The tunnel uses anonymous access for ad-hoc development testing, so only start it when you intend to expose your local app. GitHub OAuth callbacks are still configured for localhost during development, so remote browsers should use the dev-only login instead.

After **devtunnel-web** is running, use its **Show tunnel URLs** command from the resource action menu to get the public app URL and a ready-to-copy `remote-feeder` login URL. This gives you two dev identities for testing social/feed interactions: local `dev-feeder` and remote `remote-feeder`.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/              # Next.js App Router pages & API routes
    api/plants/     # Plant CRUD endpoints
    api/library/    # Static plant library endpoint
    api/frost-dates/# Frost date lookup
    api/settings/   # User settings
    api/upload/     # Image upload
    library/        # Plant Library page
    plants/[id]/    # Plant detail page
    settings/       # Settings page
  components/       # Shared UI components
  lib/              # Types, data access layer, static plant library
data/               # JSON data storage (plants, settings)
public/uploads/     # Uploaded plant images
```

## License

MIT
