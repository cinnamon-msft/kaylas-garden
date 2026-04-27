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

This starts the Next.js app through the Aspire AppHost.

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
