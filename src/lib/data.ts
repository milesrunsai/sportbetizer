import { promises as fs } from 'fs';
import path from 'path';
import type { BankrollData, ResultEntry } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function getBankroll(): Promise<BankrollData> {
  const raw = await fs.readFile(path.join(DATA_DIR, 'bankroll.json'), 'utf-8');
  return JSON.parse(raw);
}

export async function saveBankroll(data: BankrollData): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, 'bankroll.json'), JSON.stringify(data, null, 2));
}

export async function getResults(): Promise<ResultEntry[]> {
  const raw = await fs.readFile(path.join(DATA_DIR, 'results.json'), 'utf-8');
  return JSON.parse(raw);
}

export async function saveResults(data: ResultEntry[]): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, 'results.json'), JSON.stringify(data, null, 2));
}

export async function getTodayAnalysis() {
  const raw = await fs.readFile(path.join(DATA_DIR, 'today-analysis.json'), 'utf-8');
  return JSON.parse(raw);
}

export async function saveTodayAnalysis(data: unknown): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, 'today-analysis.json'), JSON.stringify(data, null, 2));
}
