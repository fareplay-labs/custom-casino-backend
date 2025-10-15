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

export interface Config {
  // Solana (global - shared by all casinos on this backend)
  network: 'devnet' | 'mainnet';
  programId: string;
  solanaRpcUrl: string;

  // Database
  databaseUrl: string;

  // Alchemy API Key
  alchemyApiKey: string;

  // Redis
  redisUrl: string;

  // Discovery
  discoveryUrl: string;
  discoveryApiKey?: string;

  // API
  apiPort: number;
  apiHost: string;

  // WebSocket
  wsPort: number;
  wsHost: string;

  // Security
  jwtSecret: string;

  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;
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
    // Solana
    network: getOptionalEnv('NETWORK', 'devnet') as 'devnet' | 'mainnet',
    programId: getRequiredEnv('PROGRAM_ID'),
    solanaRpcUrl: getOptionalEnv('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),

    // Database
    databaseUrl: getRequiredEnv('DATABASE_URL'),

    // Alchemy API Key
    alchemyApiKey: getRequiredEnv('ALCHEMY_API_KEY'),

    // Redis
    redisUrl: getOptionalEnv('REDIS_URL', 'redis://localhost:6379'),

    // Discovery
    discoveryUrl: getOptionalEnv('DISCOVERY_URL', 'https://discover.fareplay.io'),
    discoveryApiKey: process.env.DISCOVERY_API_KEY,

    // API
    apiPort: parseInt(getOptionalEnv('API_PORT', '3000'), 10),
    apiHost: getOptionalEnv('API_HOST', '0.0.0.0'),

    // WebSocket
    wsPort: parseInt(getOptionalEnv('WS_PORT', '3001'), 10),
    wsHost: getOptionalEnv('WS_HOST', '0.0.0.0'),

    // Security
    jwtSecret: getRequiredEnv('JWT_SECRET'),

    // Environment
    nodeEnv: getOptionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
  };
}

export const config = loadConfig();

