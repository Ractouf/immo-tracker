import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '..', '..', 'data');
const TOKEN_FILE = join(DATA_DIR, 'share-token.json');

@Injectable()
export class ShareTokenStore {
  async getOrCreate(): Promise<string> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const raw = await fs.readFile(TOKEN_FILE, 'utf-8');
      return (JSON.parse(raw) as { token: string }).token;
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      return this.regenerate();
    }
  }

  async regenerate(): Promise<string> {
    const token = randomBytes(24).toString('hex');
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TOKEN_FILE, JSON.stringify({ token }, null, 2), 'utf-8');
    return token;
  }
}
