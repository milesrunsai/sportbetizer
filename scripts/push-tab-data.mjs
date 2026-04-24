import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env.local
try {
  const envContent = readFileSync(resolve(root, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const sql = neon(process.env.DATABASE_URL);
const today = new Date().toISOString().split('T')[0];

const events = [
  {id:'horse-racing-tam-r8',sport:'Horse Racing',event:'TAMWORTH R8 MCDONALDS TAMWORTH - COUNTRY MAGIC',teams:['JASON DARREN','ZOUCRATIC','YANABAH','BALMIERRO','DUNQUIN','OVERZONE','SAINTLY SANDS','WHITTELLO SUN','OUR BOY TOM','PROCLIVITY','HINTO','BLAZED PRINCE','DARTBROOK','DAYU'],odds:{'JASON DARREN':5,'ZOUCRATIC':10,'YANABAH':17,'BALMIERRO':51,'DUNQUIN':9.5,'OVERZONE':3.4,'SAINTLY SANDS':5.5,'WHITTELLO SUN':7,'OUR BOY TOM':34,'PROCLIVITY':18,'HINTO':23,'BLAZED PRINCE':81,'DARTBROOK':41,'DAYU':126},startTime:'2026-04-24T06:55:00.000Z',venue:'TAMWORTH (NSW)',runners:[{name:'JASON DARREN',number:1,barrier:5,jockey:'G Johnston',trainer:'J Bannister',weight:60,form:'x3522',career:'',winOdds:5},{name:'ZOUCRATIC',number:2,barrier:7,jockey:'B Looker',trainer:'T Howlett',weight:59.5,form:'36x56',career:'',winOdds:10},{name:'OVERZONE',number:6,barrier:13,jockey:'M Weir',trainer:'W Wilkes',weight:57.5,form:'f12',career:'',winOdds:3.4},{name:'SAINTLY SANDS',number:7,barrier:4,jockey:'R Jones',trainer:'R Northam',weight:56.5,form:'2233x',career:'',winOdds:5.5},{name:'WHITTELLO SUN',number:8,barrier:12,jockey:'M Bell',trainer:'S Casey',weight:56.5,form:'36x31',career:'',winOdds:7},{name:'DUNQUIN',number:5,barrier:14,jockey:'C Schofield',trainer:'L Ruddy',weight:57.5,form:'f3431',career:'',winOdds:9.5}]},
  {id:'horse-racing-wrb-r8',sport:'Horse Racing',event:'WERRIBEE R8 CORIO WASTE MANAGEMENT BM62 HANDICAP',teams:['NASRAAWY','TESORO MIO','MOSQUITO AWARD','SEVEN OCEANS','STEAMY MIST'],odds:{'NASRAAWY':3.6,'TESORO MIO':6.5,'MOSQUITO AWARD':4.4,'SEVEN OCEANS':3.6,'STEAMY MIST':6.5},startTime:'2026-04-24T07:05:00.000Z',venue:'WERRIBEE (VIC)',runners:[{name:'NASRAAWY',number:2,barrier:3,jockey:'J Bowditch',trainer:'G Bedggood',weight:60.5,form:'2875x',career:'',winOdds:3.6},{name:'TESORO MIO',number:4,barrier:4,jockey:'J Hill',trainer:'T Fitzsimmons',weight:58.5,form:'013x1',career:'',winOdds:6.5},{name:'MOSQUITO AWARD',number:5,barrier:8,jockey:'F Kersley',trainer:'L Smith',weight:58,form:'f21x',career:'',winOdds:4.4},{name:'SEVEN OCEANS',number:7,barrier:5,jockey:'D Bates',trainer:'M Walker',weight:57.5,form:'7228x',career:'',winOdds:3.6},{name:'STEAMY MIST',number:11,barrier:6,jockey:'P Moloney',trainer:'M Laurie',weight:56.5,form:'9x634',career:'',winOdds:6.5}]},
  {id:'horse-racing-crb-r1',sport:'Horse Racing',event:'CRANBOURNE R1 LADBROKES POPULAR SRM MAIDEN PLATE',teams:['AUTUMN DIAMONDS','KADDARI','RANSELOT','TISSEYRE','ZEPHARTIE','ZEYNO'],odds:{'AUTUMN DIAMONDS':7,'KADDARI':9,'RANSELOT':9.5,'TISSEYRE':1.6,'ZEPHARTIE':17,'ZEYNO':4.6},startTime:'2026-04-24T07:15:00.000Z',venue:'CRANBOURNE (VIC)',runners:[{name:'AUTUMN DIAMONDS',number:1,barrier:6,jockey:'J Beriman',trainer:'R Schiffer',weight:58,form:'x40x3',career:'',winOdds:7},{name:'KADDARI',number:3,barrier:1,jockey:'Z Spain',trainer:'B Dunn',weight:58,form:'33576',career:'',winOdds:9},{name:'RANSELOT',number:4,barrier:2,jockey:'E Pozman',trainer:'B Dunn',weight:58,form:'9432x',career:'',winOdds:9.5},{name:'TISSEYRE',number:5,barrier:4,jockey:'L Currie',trainer:'Ken & K Keys',weight:57.5,form:'50x35',career:'',winOdds:1.6},{name:'ZEPHARTIE',number:6,barrier:3,jockey:'L Cartwright',trainer:'R Archard',weight:57.5,form:'90753',career:'',winOdds:17},{name:'ZEYNO',number:7,barrier:5,jockey:'J Noonan',trainer:'J Sandhu',weight:57.5,form:'',career:'',winOdds:4.6}]},
  {id:'horse-racing-gaw-r7',sport:'Horse Racing',event:'GAWLER R7 CONTRACT ENGINEERING BM62 HANDICAP',teams:['STOKOMO','BRAVE STAR','PHINEAS','JOVIALE','MRS SECOMBE','IN THAT MODE','SIR RANDOLPH'],odds:{'STOKOMO':16,'BRAVE STAR':5.5,'PHINEAS':5,'JOVIALE':5.5,'MRS SECOMBE':4.8,'IN THAT MODE':9,'SIR RANDOLPH':9.5},startTime:'2026-04-24T07:25:00.000Z',venue:'GAWLER (SA)',runners:[{name:'STOKOMO',number:1,barrier:9,jockey:'J Gutte',trainer:'A Bain & N Taylor',weight:63.5,form:'22251',career:'',winOdds:16},{name:'BRAVE STAR',number:2,barrier:1,jockey:'J Opperman',trainer:'P Stokes',weight:62.5,form:'5x885',career:'',winOdds:5.5},{name:'PHINEAS',number:5,barrier:4,jockey:'C Rawiller',trainer:'C Bieg',weight:61.5,form:'13126',career:'',winOdds:5},{name:'JOVIALE',number:6,barrier:10,jockey:'R Milnes',trainer:'S Padman',weight:59,form:'15313',career:'',winOdds:5.5},{name:'MRS SECOMBE',number:9,barrier:11,jockey:'J Toeroek',trainer:'C Bieg',weight:58,form:'lx523',career:'',winOdds:4.8},{name:'IN THAT MODE',number:10,barrier:2,jockey:'J Murphy',trainer:'L O\'Connor',weight:57.5,form:'88841',career:'',winOdds:9},{name:'SIR RANDOLPH',number:11,barrier:3,jockey:'A Warren',trainer:'A Clarken',weight:57.5,form:'84476',career:'',winOdds:9.5}]},
  {id:'horse-racing-crb-r2',sport:'Horse Racing',event:'CRANBOURNE R2 MINUTEMAN PRESS NARRE WARREN HANDICAP',teams:['GOLDEN SPRITZ','QUEBECK','MAMUNO','YEAH RIGHT','NEW YORK SCANDAL'],odds:{'GOLDEN SPRITZ':2,'QUEBECK':2.8,'MAMUNO':6,'YEAH RIGHT':9,'NEW YORK SCANDAL':12},startTime:'2026-04-24T07:45:00.000Z',venue:'CRANBOURNE (VIC)',runners:[{name:'GOLDEN SPRITZ',number:2,barrier:5,jockey:'B Mertens',trainer:'J Sandhu',weight:59,form:'3213x',career:'',winOdds:2},{name:'QUEBECK',number:3,barrier:3,jockey:'J Stanley',trainer:'N Dunn',weight:58.5,form:'x57x4',career:'',winOdds:2.8},{name:'MAMUNO',number:4,barrier:4,jockey:'L Neindorf',trainer:'C Brown',weight:58,form:'1346x',career:'',winOdds:6},{name:'YEAH RIGHT',number:5,barrier:1,jockey:'L Cartwright',trainer:'L Tolson & L Proctor',weight:56.5,form:'1x664',career:'',winOdds:9},{name:'NEW YORK SCANDAL',number:7,barrier:2,jockey:'L Wood',trainer:'A Laing',weight:55,form:'2275x',career:'',winOdds:12}]}
];

const payload = JSON.stringify({events, scrapedAt: new Date().toISOString(), count: events.length, source: 'tab'});
// Check table structure first
const cols = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'races' ORDER BY ordinal_position`;
console.log('races table columns:', cols);

// Delete old and insert fresh
await sql`DELETE FROM races WHERE race_date = ${today}`;

// Use gen_random_uuid() or a serial id
await sql`INSERT INTO races (id, race_date, data) VALUES (gen_random_uuid(), ${today}, ${payload}::jsonb)`;
await sql`DELETE FROM today_analysis WHERE date = ${today}`;
console.log(`Done: ${events.length} races saved to DB for ${today}`);
