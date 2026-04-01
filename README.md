# 🌱 Kayla's Garden

A personal plant-tracking website to catalog plants, upload progress photos, track frost dates, and browse an AI-powered plant library.

## Features

- **🌿 Plant Dashboard** — View all your tracked plants as cards with thumbnails, species info, and progress counts
- **📸 Progress Tracking** — Add timeline entries with notes and photos to track each plant's growth
- **📋 Care Information** — Store and edit care details: sunlight, watering, soil, hardiness zone, companion plants, pests
- **🤖 AI Plant Library** — Search any plant and get AI-generated growing guidelines, care tips, and planting info
- **🥶 Frost Date Tracker** — Set your location to see frost date alerts and know when to plant
- **🎨 Multiple Themes** — Switch between Green 🌿, Earth 🌾, and Ocean 🌊 color themes

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** with CSS custom properties for theming
- **GitHub Models API** for AI-powered plant information
- File-based JSON storage (no external database required)

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A GitHub personal access token (for AI plant library features)

### Installation

```bash
git clone https://github.com/cinnamon-msft/kaylas-garden.git
cd kaylas-garden
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
GITHUB_TOKEN=your_github_personal_access_token
```

The `GITHUB_TOKEN` is used for the AI Plant Library feature (GitHub Models API).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
    api/library/    # AI plant library endpoint
    api/frost-dates/# Frost date lookup
    api/settings/   # User settings
    api/upload/     # Image upload
    library/        # Plant Library page
    plants/[id]/    # Plant detail page
    settings/       # Settings page
  components/       # Shared UI components
  lib/              # Types, data access layer
data/               # JSON data storage (plants, settings, cache)
public/uploads/     # Uploaded plant images
```

## License

MIT
