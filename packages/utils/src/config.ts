import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Find project root by looking for package.json with workspaces
function findProjectRoot(startPath: string): string {
  let currentPath = startPath;
  
  while (currentPath !== dirname(currentPath)) {
    const packageJsonPath = join(currentPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      const pkg = require(packageJsonPath);
      // If this package.json has workspaces, it's the root
      if (pkg.workspaces) {
        return currentPath;
      }
    }
    currentPath = dirname(currentPath);
  }
  
  // Fallback to cwd
  return process.cwd();
}

// Load environment variables from project root
const projectRoot = findProjectRoot(__dirname);
const envPath = join(projectRoot, '.env');
dotenvConfig({ path: envPath });

// Fare Vault Program ID (hardcoded infrastructure constant)
export const FARE_VAULT_PROGRAM_ID = 'FAREvmepkHArRWwLjHmwPQGL9Byg8iKF3hu1vewxTSXe';

// Solana network (hardcoded to mainnet-beta)
export const SOLANA_NETWORK = 'mainnet-beta' as const;
export type SolanaNetwork = typeof SOLANA_NETWORK;

export interface Config {
  // Owner
  ownerWallet: string;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;

  // Processor/Backfill
  backfillEnabled: boolean;
  backfillLimit: number;
  backfillRpcUrl?: string;

  // Security
  jwtSecret: string;

  // Solana (hardcoded, not configurable)
  readonly network: SolanaNetwork;
  readonly fareVaultProgramId: string;
  readonly solanaRpcUrl: string;

  // Server (sensible defaults, not required in env)
  readonly apiPort: number;
  readonly apiHost: string;
  readonly wsPort: number;
  readonly wsHost: string;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly logLevel: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  return {
    // Required: User-configurable
    ownerWallet: getRequiredEnv('OWNER_WALLET'),
    databaseUrl: getRequiredEnv('DATABASE_URL'),
    redisUrl: getRequiredEnv('REDIS_URL'),
    jwtSecret: getRequiredEnv('JWT_SECRET'),

    // Backfill configuration
    backfillEnabled: getOptionalEnv('BACKFILL_ENABLED', 'true') === 'true',
    backfillLimit: parseInt(getOptionalEnv('BACKFILL_LIMIT', '1000'), 10),
    backfillRpcUrl: process.env.BACKFILL_RPC_URL,

    // Hardcoded: Solana infrastructure
    network: SOLANA_NETWORK,
    fareVaultProgramId: FARE_VAULT_PROGRAM_ID,
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',

    // Sensible defaults: Server configuration
    apiPort: parseInt(getOptionalEnv('API_PORT', '3000'), 10),
    apiHost: getOptionalEnv('API_HOST', '0.0.0.0'),
    wsPort: parseInt(getOptionalEnv('WS_PORT', '3001'), 10),
    wsHost: getOptionalEnv('WS_HOST', '0.0.0.0'),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
  };
}

export const config = loadConfig();

/**
 * Get the Fare Vault program ID (always returns mainnet program ID)
 */
export function getFareVaultProgramId(): string {
  return FARE_VAULT_PROGRAM_ID;
}

