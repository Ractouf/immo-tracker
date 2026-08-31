import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Listing } from './listing.model';

const DATA_DIR = join(__dirname, '..', '..', 'data');
const DATA_FILE = join(DATA_DIR, 'listings.json');

@Injectable()
export class ListingsStore {
  async readAll(): Promise<Listing[]> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as Listing[];
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      await this.writeAll([]);
      return [];
    }
  }

  async writeAll(listings: Listing[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(listings, null, 2), 'utf-8');
  }
}
