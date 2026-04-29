const fs = require('fs');

// Read the plant library file
const filePath = './src/lib/plant-library.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Find all plant IDs and check which ones have imageUrl
const plantIds = [];
const idMatches = content.matchAll(/id:\s*["']([^"']+)["']/g);
for (const match of idMatches) {
  plantIds.push(match[1]);
}

console.log(`Total plant IDs found: ${plantIds.length}`);

// Find all imageUrl entries
const imageUrlCount = (content.match(/imageUrl:/g) || []).length;
console.log(`Total imageUrl entries found: ${imageUrlCount}`);

// Now add missing imageUrl entries
// Strategy: For each plant ID, check if there's already an imageUrl after its description
// If not, add one

let offset = 0;
const additions = [];

for (let i = 0; i < plantIds.length; i++) {
  const plantId = plantIds[i];
  
  // Find the pattern: id: "plantId" ... followed by the description field
  // Then check if imageUrl is present after the description
  
  // Simple regex to find this specific plant's section
  const plantPattern = new RegExp(
    `id:\\s*["']${plantId.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')}["']\\s*,.*?description:\\s*["\']([^"']*(?:\\\\.[^"']*)*?)["\']\\s*,`,
    's'
  );
  
  const match = plantPattern.exec(content);
  if (!match) {
    console.log(`Could not find pattern for plant: ${plantId}`);
    continue;
  }
  
  // Check if imageUrl is present right after the closing quote of description
  const posAfterDescription = match.index + match[0].length;
  const nextSection = content.substring(posAfterDescription, posAfterDescription + 200);
  
  if (nextSection.includes('imageUrl:')) {
    // Already has imageUrl
    continue;
  }
  
  // Need to add imageUrl
  const insertUrl = `https://picsum.photos/400/300?random=${plantId}`;
  const insertText = `\n    imageUrl: "${insertUrl}",`;
  
  content = content.slice(0, posAfterDescription) + insertText + content.slice(posAfterDescription);
  additions.push(plantId);
  offset += insertText.length;
}

console.log(`Added imageUrl to ${additions.length} plants: ${additions.join(', ')}`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('File updated successfully');

// Verify
const finalImageUrlCount = (content.match(/imageUrl:/g) || []).length;
console.log(`Final imageUrl count: ${finalImageUrlCount}`);
