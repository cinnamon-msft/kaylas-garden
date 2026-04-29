const fs = require('fs');

// Read the plant library file
const filePath = './src/lib/plant-library.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Split by plant objects (look for "id:" to identify each plant start)
// We need to find each plant object and ensure it has an imageUrl property right after description

// Strategy: Replace the pattern "description: "...", " with "description: "...", \n    imageUrl: "https://picsum.photos/400/300?random=PLANTID","
// where PLANTID comes from the most recently found "id:" field

const lines = content.split('\n');
const result = [];
let currentPlantId = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Extract plant ID when we see it
  const idMatch = line.match(/id:\s*["']([^"']+)["']/);
  if (idMatch) {
    currentPlantId = idMatch[1];
  }
  
  // Check if this line ends a description field
  if (line.match(/description:\s*\n/) || (line.match(/description:/) && line.match(/["'],\s*$/))) {
    // This is a multi-line or single-line description ending
    // Check if the next non-empty line after this is NOT an imageUrl
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') {
      result.push(lines[i + (j - i)]);
      j++;
    }
    
    result.push(line);
    i = j - 1;
    
    // Check if next line contains imageUrl
    if (j < lines.length && !lines[j].includes('imageUrl:')) {
      // Add imageUrl before the next property
      const indent = '    ';
      result.push(indent + 'imageUrl: "https://picsum.photos/400/300?random=' + currentPlantId + '",');
    }
    continue;
  }
  
  result.push(line);
}

const newContent = result.join('\n');
fs.writeFileSync(filePath, newContent, 'utf-8');

// Count results
const imageUrlCount = (newContent.match(/imageUrl:/g) || []).length;
console.log(`File now contains ${imageUrlCount} imageUrl entries`);
