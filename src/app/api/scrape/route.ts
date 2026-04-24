import { NextResponse } from 'next/server';
import type { SportEvent } from '@/lib/types';

// TODO: Replace this mock with real Sportsbet scraping using Playwright/Puppeteer
// Real implementation would:
// 1. Launch headless browser with Playwright
// 2. Navigate to sportsbet.com.au
// 3. Scrape odds for each sport category
// 4. Parse the DOM to extract event data
// 5. Return structured data
//
// Example:
// import { chromium } from 'playwright';
// const browser = await chromium.launch({ headless: true });
// const page = await browser.newPage();
// await page.goto('https://www.sportsbet.com.au/betting/australian-rules');
// const events = await page.$$eval('.market-coupon', elements => ...);

function getMockEvents(): SportEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fmt = (d: Date, h: number, m: number) => {
    const date = new Date(d);
    date.setHours(h, m, 0, 0);
    return date.toISOString();
  };

  return [
    // AFL
    {
      id: 'afl-001',
      sport: 'AFL',
      event: 'Sydney Swans vs Collingwood Magpies',
      teams: ['Sydney Swans', 'Collingwood Magpies'],
      odds: { 'Sydney Swans': 1.85, 'Collingwood Magpies': 1.95 },
      startTime: fmt(today, 19, 25),
      venue: 'SCG, Sydney',
    },
    {
      id: 'afl-002',
      sport: 'AFL',
      event: 'Geelong Cats vs Melbourne Demons',
      teams: ['Geelong Cats', 'Melbourne Demons'],
      odds: { 'Geelong Cats': 1.72, 'Melbourne Demons': 2.15 },
      startTime: fmt(today, 19, 50),
      venue: 'GMHBA Stadium, Geelong',
    },
    {
      id: 'afl-003',
      sport: 'AFL',
      event: 'Brisbane Lions vs Carlton Blues',
      teams: ['Brisbane Lions', 'Carlton Blues'],
      odds: { 'Brisbane Lions': 1.65, 'Carlton Blues': 2.25 },
      startTime: fmt(tomorrow, 16, 35),
      venue: 'The Gabba, Brisbane',
    },
    {
      id: 'afl-004',
      sport: 'AFL',
      event: 'Fremantle Dockers vs West Coast Eagles',
      teams: ['Fremantle Dockers', 'West Coast Eagles'],
      odds: { 'Fremantle Dockers': 1.38, 'West Coast Eagles': 3.05 },
      startTime: fmt(tomorrow, 18, 10),
      venue: 'Optus Stadium, Perth',
    },
    // NRL
    {
      id: 'nrl-001',
      sport: 'NRL',
      event: 'Penrith Panthers vs Melbourne Storm',
      teams: ['Penrith Panthers', 'Melbourne Storm'],
      odds: { 'Penrith Panthers': 1.75, 'Melbourne Storm': 2.10 },
      startTime: fmt(today, 20, 5),
      venue: 'BlueBet Stadium, Penrith',
    },
    {
      id: 'nrl-002',
      sport: 'NRL',
      event: 'South Sydney Rabbitohs vs Canterbury Bulldogs',
      teams: ['South Sydney Rabbitohs', 'Canterbury Bulldogs'],
      odds: { 'South Sydney Rabbitohs': 2.45, 'Canterbury Bulldogs': 1.55 },
      startTime: fmt(today, 16, 0),
      venue: 'Accor Stadium, Sydney',
    },
    {
      id: 'nrl-003',
      sport: 'NRL',
      event: 'North Queensland Cowboys vs Cronulla Sharks',
      teams: ['North Queensland Cowboys', 'Cronulla Sharks'],
      odds: { 'North Queensland Cowboys': 1.90, 'Cronulla Sharks': 1.92 },
      startTime: fmt(tomorrow, 18, 0),
      venue: 'Queensland Country Bank Stadium, Townsville',
    },
    // NBA
    {
      id: 'nba-001',
      sport: 'NBA',
      event: 'LA Lakers vs Boston Celtics',
      teams: ['LA Lakers', 'Boston Celtics'],
      odds: { 'LA Lakers': 2.55, 'Boston Celtics': 1.52 },
      startTime: fmt(today, 11, 30),
      venue: 'Crypto.com Arena, Los Angeles',
    },
    {
      id: 'nba-002',
      sport: 'NBA',
      event: 'Golden State Warriors vs Denver Nuggets',
      teams: ['Golden State Warriors', 'Denver Nuggets'],
      odds: { 'Golden State Warriors': 2.20, 'Denver Nuggets': 1.68 },
      startTime: fmt(today, 12, 0),
      venue: 'Chase Center, San Francisco',
    },
    {
      id: 'nba-003',
      sport: 'NBA',
      event: 'Milwaukee Bucks vs Oklahoma City Thunder',
      teams: ['Milwaukee Bucks', 'Oklahoma City Thunder'],
      odds: { 'Milwaukee Bucks': 1.95, 'Oklahoma City Thunder': 1.85 },
      startTime: fmt(tomorrow, 10, 0),
      venue: 'Fiserv Forum, Milwaukee',
    },
    // UFC
    {
      id: 'ufc-001',
      sport: 'UFC',
      event: 'Alexander Volkanovski vs Ilia Topuria',
      teams: ['Alexander Volkanovski', 'Ilia Topuria'],
      odds: { 'Alexander Volkanovski': 2.35, 'Ilia Topuria': 1.62 },
      startTime: fmt(tomorrow, 14, 0),
      venue: 'UFC Apex, Las Vegas',
    },
    {
      id: 'ufc-002',
      sport: 'UFC',
      event: 'Dricus du Plessis vs Sean Strickland',
      teams: ['Dricus du Plessis', 'Sean Strickland'],
      odds: { 'Dricus du Plessis': 1.80, 'Sean Strickland': 2.00 },
      startTime: fmt(tomorrow, 13, 0),
      venue: 'UFC Apex, Las Vegas',
    },
    // Horse Racing
    {
      id: 'race-001',
      sport: 'Horse Racing',
      event: 'Race 4 Flemington - Maiden Plate 1400m',
      teams: ['Starlight Express', 'Thunder Road', 'Coastal Storm', 'River King'],
      odds: { 'Starlight Express': 3.20, 'Thunder Road': 2.85, 'Coastal Storm': 4.50, 'River King': 5.00 },
      startTime: fmt(today, 14, 15),
      venue: 'Flemington, Melbourne',
    },
    {
      id: 'race-002',
      sport: 'Horse Racing',
      event: 'Race 6 Randwick - BM78 Handicap 1600m',
      teams: ['Midnight Shadow', 'Ocean Fury', 'Golden Mile', 'Desert Prince'],
      odds: { 'Midnight Shadow': 2.60, 'Ocean Fury': 3.45, 'Golden Mile': 4.20, 'Desert Prince': 6.50 },
      startTime: fmt(today, 15, 30),
      venue: 'Royal Randwick, Sydney',
    },
    {
      id: 'race-003',
      sport: 'Horse Racing',
      event: 'Race 3 Ascot - Class 3 1200m',
      teams: ['Lightning Bolt', 'Perth Glory', 'Western Wind'],
      odds: { 'Lightning Bolt': 1.95, 'Perth Glory': 3.80, 'Western Wind': 4.10 },
      startTime: fmt(today, 13, 45),
      venue: 'Ascot, Perth',
    },
    // Greyhounds
    {
      id: 'dogs-001',
      sport: 'Greyhounds',
      event: 'Race 5 Sandown Park - Grade 5 515m',
      teams: ['Flying Maggie', 'Black Tornado', 'Speed Demon', 'Lucky Charm'],
      odds: { 'Flying Maggie': 2.40, 'Black Tornado': 3.60, 'Speed Demon': 4.80, 'Lucky Charm': 7.50 },
      startTime: fmt(today, 19, 42),
      venue: 'Sandown Park, Melbourne',
    },
    {
      id: 'dogs-002',
      sport: 'Greyhounds',
      event: 'Race 8 Wentworth Park - Masters 520m',
      teams: ['Rapid Fire', 'Shadow Runner', 'Miss Swift'],
      odds: { 'Rapid Fire': 1.85, 'Shadow Runner': 3.25, 'Miss Swift': 5.50 },
      startTime: fmt(today, 21, 15),
      venue: 'Wentworth Park, Sydney',
    },
    // Soccer
    {
      id: 'soccer-001',
      sport: 'Soccer',
      event: 'Melbourne Victory vs Western Sydney Wanderers',
      teams: ['Melbourne Victory', 'Western Sydney Wanderers', 'Draw'],
      odds: { 'Melbourne Victory': 1.90, 'Draw': 3.45, 'Western Sydney Wanderers': 4.20 },
      startTime: fmt(today, 19, 45),
      venue: 'AAMI Park, Melbourne',
    },
    {
      id: 'soccer-002',
      sport: 'Soccer',
      event: 'Liverpool vs Manchester United',
      teams: ['Liverpool', 'Manchester United', 'Draw'],
      odds: { 'Liverpool': 1.55, 'Draw': 4.20, 'Manchester United': 5.50 },
      startTime: fmt(tomorrow, 4, 30),
      venue: 'Anfield, Liverpool',
    },
    {
      id: 'soccer-003',
      sport: 'Soccer',
      event: 'Real Madrid vs Barcelona',
      teams: ['Real Madrid', 'Barcelona', 'Draw'],
      odds: { 'Real Madrid': 2.30, 'Draw': 3.35, 'Barcelona': 2.95 },
      startTime: fmt(tomorrow, 5, 0),
      venue: 'Santiago Bernabeu, Madrid',
    },
    {
      id: 'soccer-004',
      sport: 'Soccer',
      event: 'Sydney FC vs Central Coast Mariners',
      teams: ['Sydney FC', 'Central Coast Mariners', 'Draw'],
      odds: { 'Sydney FC': 1.72, 'Draw': 3.80, 'Central Coast Mariners': 4.60 },
      startTime: fmt(today, 17, 35),
      venue: 'Allianz Stadium, Sydney',
    },
    // Extra Horse Racing
    {
      id: 'race-004',
      sport: 'Horse Racing',
      event: 'Race 7 Morphettville - Group 3 2000m',
      teams: ['Adelaide Star', 'Southern Cross', 'Hills Hero', 'Red Admiral'],
      odds: { 'Adelaide Star': 2.90, 'Southern Cross': 3.15, 'Hills Hero': 4.80, 'Red Admiral': 8.00 },
      startTime: fmt(today, 16, 20),
      venue: 'Morphettville, Adelaide',
    },
    // Extra NRL
    {
      id: 'nrl-004',
      sport: 'NRL',
      event: 'Brisbane Broncos vs Gold Coast Titans',
      teams: ['Brisbane Broncos', 'Gold Coast Titans'],
      odds: { 'Brisbane Broncos': 1.45, 'Gold Coast Titans': 2.75 },
      startTime: fmt(tomorrow, 16, 0),
      venue: 'Suncorp Stadium, Brisbane',
    },
  ];
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = getMockEvents();
  return NextResponse.json({ events, count: events.length, source: 'mock' });
}
