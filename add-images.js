const fs = require('fs');

// Read the plant library file
const filePath = './src/lib/plant-library.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Find all plant IDs to generate unique image URLs
const plantIds = [];
const idMatches = content.matchAll(/id:\s*["']([^"']+)["']/g);
for (const match of idMatches) {
  plantIds.push(match[1]);
}

console.log(`Found ${plantIds.length} plants`);

// Add imageUrl after description field for each plant
let offset = 0;
const descriptionRegex = /description:\s*["']([^"']*(?:\\.[^"']*)*?(?:(?!["'])[^"'])*?)["'],/g;
const descriptionMatches = Array.from(content.matchAll(descriptionRegex));

console.log(`Found ${descriptionMatches.length} descriptions`);

descriptionMatches.forEach((match, index) => {
  // Find the position of the comma after description
  const position = match.index + match[0].length + offset;
  
  // Generate a unique imageUrl using the plant ID
  const plantId = plantIds[index] || 'plant' + index;
  const imageUrl = 'https://picsum.photos/400/300?random=' + plantId;
  const insertText = '\n    imageUrl: "' + imageUrl + '",';
  
  // Insert the imageUrl field
  content = content.slice(0, position) + insertText + content.slice(position);
  offset += insertText.length;
});

console.log(`Added imageUrl to ${descriptionMatches.length} plants`);

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('File updated successfully');
