const fs = require('fs');

// Update AddPlantModal to show image thumbnails
const path = './src/components/AddPlantModal.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Replace the emoji span with an image thumbnail div
const oldPattern = `<span
                               aria-hidden="true"
                               className="text-xl leading-none"
                             >
                               {CATEGORY_EMOJI[plant.category] ?? "🌱"}
                             </span>`;

const newPattern = `<div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden border border-border bg-hover">
                               <img
                                 src={plant.imageUrl}
                                 alt=""
                                 className="h-full w-full object-cover"
                                 onError={(e) => {
                                   (e.currentTarget as HTMLImageElement).style.display = "none";
                                 }}
                               />
                               <span
                                 aria-hidden="true"
                                 className="absolute inset-0 flex items-center justify-center text-lg leading-none"
                               >
                                 {CATEGORY_EMOJI[plant.category] ?? "🌱"}
                               </span>
                             </div>`;

const updated = content.replace(oldPattern, newPattern);

if (updated !== content) {
  fs.writeFileSync(path, updated, 'utf-8');
  console.log('Successfully updated AddPlantModal');
} else {
  console.log('Pattern not found in AddPlantModal');
  // Try finding the pattern with less strict spacing
  const flexibleSearch = /(<span\s+aria-hidden="true"\s+className="text-xl leading-none"\s+>\s+\{CATEGORY_EMOJI\[plant\.category\]\s+\?\? "🌱"\}\s+<\/span>)/;
  if (flexibleSearch.test(content)) {
    console.log('Found with flexible pattern, attempting replace...');
    const updated2 = content.replace(flexibleSearch, newPattern);
    fs.writeFileSync(path, updated2, 'utf-8');
    console.log('Updated with flexible pattern');
  } else {
    console.log('Could not find pattern with flexible search either');
    // Just show what we're looking for
    const idx = content.indexOf('CATEGORY_EMOJI[plant.category]');
    if (idx > 0) {
      console.log('Context around CATEGORY_EMOJI:');
      console.log(content.substring(idx - 100, idx + 100));
    }
  }
}
