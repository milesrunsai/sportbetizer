import { readFileSync } from 'fs';

const html = readFileSync('C:/Users/useco/Projects/sportsbetalizer/data/racingnsw_sample.html', 'utf8');

let m;

// Horse names
const nameP = /class="horse-name"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const names = [];
while ((m = nameP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) names.push(clean);
}
console.log('Names:', names.slice(0, 15));

// Horse numbers
const numP = /class="horse-number"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const nums = [];
while ((m = numP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) nums.push(clean);
}
console.log('Numbers:', nums.slice(0, 15));

// Jockeys
const jockP = /class="jockey"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const jockeys = [];
while ((m = jockP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) jockeys.push(clean);
}
console.log('Jockeys:', jockeys.slice(0, 15));

// Trainers
const trainP = /class="trainer"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const trainers = [];
while ((m = trainP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) trainers.push(clean);
}
console.log('Trainers:', trainers.slice(0, 15));

// Barriers
const barrP = /class="barrier"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const barriers = [];
while ((m = barrP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) barriers.push(clean);
}
console.log('Barriers:', barriers.slice(0, 15));

// Weights
const weightP = /class="weight"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const weights = [];
while ((m = weightP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) weights.push(clean);
}
console.log('Weights:', weights.slice(0, 15));

// Horse form (last starts)
const formP = /class="horse-last-start"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const forms = [];
while ((m = formP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) forms.push(clean);
}
console.log('Forms:', forms.slice(0, 15));

// Race title
const titleM = html.match(/<title>([^<]+)/);
console.log('Title:', titleM?.[1]);

// Race time - look for time patterns
const timeM = html.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
console.log('Time:', timeM?.[1]);

// Look for race strip/runner rows
const stripP = /class="[^"]*race-strip-fields[^"]*"([\s\S]*?)(?=class="[^"]*race-strip-fields|<\/table)/g;
const strips = [];
while ((m = stripP.exec(html)) !== null) {
  strips.push(m[0].substring(0, 200));
}
console.log('Strips found:', strips.length);
if (strips.length > 0) console.log('First strip preview:', strips[0]);

// Check for OddsBet patterns
const oddsP = /class="[^"]*OddsBet[^"]*"[^>]*>([\s\S]*?)<\/(?:td|div|span)/g;
const odds = [];
while ((m = oddsP.exec(html)) !== null) {
  const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean) odds.push(clean);
}
console.log('Odds:', odds.slice(0, 15));
