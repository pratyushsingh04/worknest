// Creates server/.env from .env.example (with a fresh JWT secret) if it doesn't exist yet.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env')) {
  console.log('.env already exists, leaving it alone');
} else {
  copyFileSync('.env.example', '.env');
  const env = readFileSync('.env', 'utf8').replace('change-me-to-a-long-random-string', randomBytes(32).toString('hex'));
  writeFileSync('.env', env);
  console.log('Created server/.env');
}
