import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolved workspace root directory.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pre-emptively load the environment variables from the centralized root .env
 * at ES module initialization time.
 * 
 * Why? ESM loads static imports before running any local file execution statements.
 * Importing this file first guarantees process.env is populated before subsequent
 * modules validate configuration parameters on boot.
 */
dotenv.config({ path: resolve(__dirname, '../../../.env') });
