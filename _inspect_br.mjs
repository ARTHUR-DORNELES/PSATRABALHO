import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(new URL('./_br.json', import.meta.url), 'utf-8'));
console.log('features:', d.features.length);
console.log('first props:', JSON.stringify(d.features[0].properties));
console.log('keys:', Object.keys(d.features[0].properties));
console.log('all states:');
d.features.forEach(f => console.log(' -', JSON.stringify(f.properties)));
