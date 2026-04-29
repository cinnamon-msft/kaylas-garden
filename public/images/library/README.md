# Plant Library Images

This directory is prepared for storing local sample images of library plants.

## Future Usage

As the project grows, high-quality plant images can be added here instead of relying on external services:

- Place plant images in this directory (e.g., 	omato.jpg, asil.jpg)
- Update the imageUrl in src/lib/plant-library.ts from external URLs to local paths (e.g., /images/library/tomato.jpg)
- No code changes required other than updating the URLs

## Current Implementation

Currently, imageUrl properties reference external placeholder services (picsum.photos) for quick setup and zero image file management overhead.

## Image Guidelines

- Recommended size: 400x300px or larger
- Format: JPG, PNG, or WebP
- Quality: High-quality photos showing mature plants
- Licensing: Must be freely usable (CC0, CC-BY, public domain, or custom rights)
