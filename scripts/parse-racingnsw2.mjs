import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/useco/Projects/sportsbetalizer/data/racingnsw_sample.html', 'utf8');

// Look for time patterns
const timeP = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/g;
let m;
const times = [];
while ((m = timeP.exec(html)) !== null) times.push(m[1]);
console.log('Times found:', [...new Set(times)]);

// Look for race distance
const distP = /(\d{3,4})m(?:etres)?/g;
const dists = [];
while ((m = distP.exec(html)) !== null) dists.push(m[1]);
console.log('Distances:', [...new Set(dists)].slice(0, 10));

// Count the race strips (each strip = one race)
const strips = html.match(/class="OddsBet-EvensBet race-strip-fields"/g);
console.log('Number of races on page:', strips?.length || 0);

// Look for race condition text near each race strip
const raceInfoP = /<div[^>]*class="[^"]*race-strip-header[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
while ((m = raceInfoP.exec(html)) !== null) {
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('Race info:', text.substring(0, 150));
}

// Look for h3/h4 headers that might contain race names
const headerP = /<h[34][^>]*>([\s\S]*?)<\/h[34]>/g;
while ((m = headerP.exec(html)) !== null) {
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > 5 && text.length < 150) {
    console.log('Header:', text);
  }
}

// Look for anchor-based race tabs
const raceTabP = /id="race-tab-(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
while ((m = raceTabP.exec(html)) !== null) {
  const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('Race tab', m[1], ':', text);
}

// Look for "Race X" text
const raceXP = /Race\s+(\d+)/g;
const raceNums = new Set();
while ((m = raceXP.exec(html)) !== null) raceNums.add(m[1]);
console.log('Race numbers:', [...raceNums]);
