import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/useco/Projects/sportsbetalizer/data/racingnsw_sample.html', 'utf8');

// Find each race section: "Race N - HH:MMAM RACE NAME (DISTANCE METRES)"
const raceP = /Race\s+(\d+)\s*-\s*(\d{1,2}:\d{2}(?:AM|PM))\s+([^(]+)\((\d+)\s*METRES?\)/gi;
let m;
const races = [];
while ((m = raceP.exec(html)) !== null) {
  races.push({
    raceNum: parseInt(m[1]),
    time: m[2],
    name: m[3].trim(),
    distance: m[4] + 'm',
  });
}
console.log('Races found:');
races.forEach((r) => console.log(`  R${r.raceNum} ${r.time} - ${r.name} (${r.distance})`));

// Now parse runner data for each race
// The races are in order in the HTML, each in a table with class "OddsBet-EvensBet race-strip-fields"
const tableP = /class="OddsBet-EvensBet race-strip-fields">([\s\S]*?)<\/table>/g;
let tableIdx = 0;
while ((m = tableP.exec(html)) !== null) {
  if (tableIdx >= 2) break; // just show first 2 races
  const table = m[1];
  const rowP = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let row;
  const runners = [];
  while ((row = rowP.exec(table)) !== null) {
    const cells = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 6) continue;
    const getText = (cell) => cell.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const num = getText(cells[0]);
    const form = getText(cells[1]);
    const name = getText(cells[2]);
    const trainer = getText(cells[3]);
    const jockey = getText(cells[4]);
    const barrier = getText(cells[5]);
    const weight = cells[6] ? getText(cells[6]) : '';
    if (!isNaN(parseInt(num))) {
      runners.push({ num, form, name, trainer, jockey, barrier, weight });
    }
  }
  const race = races[tableIdx] || { raceNum: tableIdx + 1 };
  console.log(`\nRace ${race.raceNum} runners (${runners.length}):`);
  runners.forEach((r) =>
    console.log(`  #${r.num} ${r.name} | J: ${r.jockey} | T: ${r.trainer} | B: ${r.barrier} | W: ${r.weight} | Form: ${r.form}`)
  );
  tableIdx++;
}
