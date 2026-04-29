const fs = require('fs');

// Update library page to add image display
const libraryPath = './src/app/library/page.tsx';
let libraryContent = fs.readFileSync(libraryPath, 'utf-8');

// Find and replace: insert image section before the Header comment
const libraryReplace = libraryContent.replace(
  /(\{selected && \(\s*<div className="space-y-6">\s*\{\s*\/\* Header \*\/)/,
  `$1
           {/* Image */}
           <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border bg-bg-card sm:h-80">
             <img
               src={selected.imageUrl}
               alt={selected.name}
               className="h-full w-full object-cover"
               onError={(e) => {
                 (e.currentTarget as HTMLImageElement).style.display = "none";
               }}
             />
           </div>

           {/* Header */}`
);

if (libraryReplace !== libraryContent) {
  fs.writeFileSync(libraryPath, libraryReplace, 'utf-8');
  console.log('Updated library page');
} else {
  console.log('Library page: No changes made (pattern not found)');
}

// Update search results grid to show images
const searchGridReplace = libraryContent.replace(
  /<button\s+key={plant\.id}\s+type="button"\s+onClick={\(\) => selectPlant\(plant\)}\s+className="flex flex-col items-start gap-1 rounded-lg border border-border bg-bg-card p-4 text-left transition-all hover:border-primary hover:bg-hover"\s+>\s+<div className="flex items-center gap-2">/,
  `<button
                   key={plant.id}
                   type="button"
                   onClick={() => selectPlant(plant)}
                   className="group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border border-border bg-bg-card p-4 text-left transition-all hover:border-primary hover:bg-hover"
                 >
                   <img
                     src={plant.imageUrl}
                     alt=""
                     className="absolute inset-0 h-full w-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                   />
                   <div className="relative flex items-center gap-2">`
);

if (searchGridReplace !== libraryContent) {
  fs.writeFileSync(libraryPath, searchGridReplace, 'utf-8');
  console.log('Updated search results grid');
} else {
  console.log('Search grid: Already updated or pattern not found');
}

console.log('Library page updates complete');
