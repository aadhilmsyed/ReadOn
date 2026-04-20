import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `microservices/phonics-service` root, stable regardless of `process.cwd()`. */
export function phonicsServiceRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}

export function pathToInitMigrationSql(): string {
  return join(phonicsServiceRoot(), 'db', 'migrations', '001_init_phonics.sql');
}

export function pathToResetMigrationSql(): string {
  return join(phonicsServiceRoot(), 'db', 'migrations', '000_reset_phonics.sql');
}
