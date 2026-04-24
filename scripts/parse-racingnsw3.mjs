import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/useco/Projects/sportsbetalizer/data/racingnsw_sample.html', 'utf8');

// Find anchor race-tab links with time info
const anchorP = /StageMeeting\.aspx\?Key=[^&]+&racenumber=(\d+)[^>]*>([^<]+)/g;
let m;
while ((m = anchorP.exec(html)) !== null) {
  console.log('Tab race', m[1], ':', m[2].trim());
}

// Look for race number + time in the same text block
const raceTimeP = /Race\s+(\d+)[^]*?(\d{1,2}:\d{2}\s*(?:AM|PM))/g;
while ((m = raceTimeP.exec(html.substring(0, 5000))) !== null) {
  console.log('Race time match:', m[1], m[2]);
}

// Look for the race strip structure - find race header divs
const stripHeaderP = /class="race-strip"[^>]*>([\s\S]{0,500})/g;
while ((m = stripHeaderP.exec(html)) !== null) {
  const text = m[1].replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').trim();
  console.log('Strip header:', text.substring(0, 200));
}

// Find specific race time display elements
const raceInfoP = /class="[^"]*race-info[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|td)/g;
while ((m = raceInfoP.exec(html)) !== null) {
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > 3) console.log('Race info:', text.substring(0, 150));
}

// Find h2 headers (often contain race titles)
const h2P = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
while ((m = h2P.exec(html)) !== null) {
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > 5) console.log('h2:', text.substring(0, 150));
}

// Search for time near Race 1 text
const raceIdx = html.indexOf('Race 1');
if (raceIdx > 0) {
  const nearby = html.substring(Math.max(0, raceIdx - 200), raceIdx + 500);
  const times = nearby.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/g);
  console.log('\nTimes near Race 1:', times);
  console.log('Text near Race 1:', nearby.replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').trim().substring(0, 300));
}
