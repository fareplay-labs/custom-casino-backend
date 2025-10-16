import { PublicKey } from '@solana/web3.js';
import { createLogger } from '@fareplay/utils';
import bs58 from 'bs58';
import * as borsh from '@coral-xyz/borsh';

const logger = createLogger('solana:fare-vault-parser');

// Fare Vault Program ID
export const FARE_VAULT_PROGRAM_ID = 'FAREvmepkHArRWwLjHmwPQGL9Byg8iKF3hu1vewxTSXe';

// Instruction discriminators (from IDL)
const DISCRIMINATORS = {
  INITIALIZE: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  POOL_REGISTER: Buffer.from([46, 254, 199, 174, 177, 152, 139, 204]),
  TRIAL_REGISTER: Buffer.from([212, 33, 155, 17, 177, 86, 161, 221]),
  TRIAL_RESOLVE_RAND: Buffer.from([130, 235, 124, 151, 81, 25, 16, 192]),
  UPDATE_VAULT_STATE: Buffer.from([6, 239, 235, 198, 248, 227, 17, 41]),
};

// Event discriminators (from IDL)
const EVENT_DISCRIMINATORS = {
  POOL_REGISTERED: Buffer.from([77, 114, 165, 230, 33, 230, 135, 215]),
  TRIAL_REGISTERED: Buffer.from([182, 0, 212, 203, 142, 87, 214, 221]),
  TRIAL_RESOLVED: Buffer.from([196, 198, 203, 60, 5, 136, 167, 206]),
  FEE_CHARGED: Buffer.from([10, 15, 44, 253, 165, 0, 86, 248]),
};

export class FareVaultParser {
  private programId: PublicKey;

  constructor(programId: string) {
    this.programId = new PublicKey(programId);
  }

  /**
   * Parse a Fare Vault transaction
   */
  parseTransaction(transaction: any): ParsedFareTransaction | null {
    try {
      const { message } = transaction.transaction;
      
      logger.debug({ 
        instructionCount: message.instructions.length,
        accountKeysCount: message.accountKeys.length,
      }, 'Parsing transaction');
      
      // Find the instruction for your program
      const instruction = message.instructions.find((ix: any) => {
        // Parsed transactions have programId directly on the instruction
        if (ix.programId) {
          return ix.programId.toString() === this.programId.toString();
        }
        // Fallback: unparsed transactions use programIdIndex
        if (ix.programIdIndex !== undefined) {
          const accountKey = message.accountKeys[ix.programIdIndex];
          const programIdStr = accountKey?.pubkey?.toString() || accountKey?.toString();
          return programIdStr === this.programId.toString();
        }
        return false;
      });

      if (!instruction) {
        logger.debug({ 
          programId: this.programId.toString(),
          accountKeysFormat: typeof message.accountKeys[0],
          firstAccountKey: message.accountKeys[0]?.toString?.() || 'unknown',
        }, 'No Fare Vault instruction found');
        return null;
      }
      
      logger.debug({ 
        accounts: instruction.accounts.length,
        dataLength: instruction.data?.length || 0,
      }, 'Found Fare Vault instruction');

      // Get instruction data as buffer
      const data = Buffer.from(bs58.decode(instruction.data));
      
      // Extract discriminator (first 8 bytes)
      const discriminator = data.slice(0, 8);

      // Determine instruction type by discriminator
      let instructionName = this.getInstructionName(discriminator);
      
      if (!instructionName) {
        logger.debug({ discriminator: discriminator.toString('hex') }, 'Unknown instruction discriminator');
        return null;
      }

      // Extract accounts
      // Parsed transactions have accounts as PublicKey objects directly
      const accounts = instruction.accounts.map((account: any) => {
        if (typeof account === 'object' && account.pubkey) {
          return account.pubkey.toString();
        }
        if (typeof account === 'number') {
          // It's an index into accountKeys
          const key = message.accountKeys[account];
          return key?.pubkey?.toString() || key?.toString();
        }
        return account.toString();
      });

      // Parse based on instruction type (data after discriminator)
      const instructionData = Buffer.from(data.slice(8));
      
      return this.parseInstruction(instructionName, instructionData, accounts, transaction);

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error parsing Fare Vault transaction');
      return null;
    }
  }

  /**
   * Get instruction name from discriminator
   */
  private getInstructionName(discriminator: Buffer): string | null {
    if (discriminator.equals(DISCRIMINATORS.TRIAL_REGISTER)) {
      return 'trial_register';
    }
    if (discriminator.equals(DISCRIMINATORS.TRIAL_RESOLVE_RAND)) {
      return 'trial_resolve_rand';
    }
    if (discriminator.equals(DISCRIMINATORS.POOL_REGISTER)) {
      return 'pool_register';
    }
    if (discriminator.equals(DISCRIMINATORS.INITIALIZE)) {
      return 'initialize';
    }
    if (discriminator.equals(DISCRIMINATORS.UPDATE_VAULT_STATE)) {
      return 'update_vault_state';
    }
    return null;
  }

  /**
   * Parse specific instruction types
   */
  private parseInstruction(
    name: string,
    instructionData: Buffer,
    accounts: string[],
    transaction: any
  ): ParsedFareTransaction | null {
    
    switch (name) {
      case 'trial_register':
        return this.parseTrialRegister(instructionData, accounts, transaction);
      
      case 'trial_resolve_rand':
        return this.parseTrialResolve(instructionData, accounts, transaction);
      
      case 'pool_register':
        return this.parsePoolRegister(instructionData, accounts, transaction);
      
      case 'initialize':
      case 'update_vault_state':
        // Skip non-essential transactions
        logger.debug({ name }, 'Skipping management transaction');
        return null;
      
      default:
        logger.debug({ name }, 'Unknown instruction type');
        return null;
    }
  }

  /**
   * Parse trial_register (place bet)
   * Accounts: [vault_state, payer, trial, pool, net_token, host_token, mint, payer_token, token_program, system_program]
   * Args: { qk_actual: QK, mult: f64, extra_data_hash: string }
   * For now, we'll extract data from parsed transaction and event logs
   */
  private parseTrialRegister(
    instructionData: Buffer,
    accounts: string[],
    transaction: any
  ): ParsedFareTransaction {
    const player = accounts[1]; // payer
    const trialAccount = accounts[2];
    const poolId = accounts[3];
    
    // Try to extract wager amount from token transfer
    let amount = BigInt(0);
    const tokenTransfer = this.findTokenTransfer(transaction, player);
    if (tokenTransfer) {
      amount = tokenTransfer;
    }

    // Extract full TrialRegistered event data (includes Q/K arrays)
    const trialEventData = this.parseTrialRegisteredEvent(transaction);
    
    // Parse extra_data_hash to extract game type
    const gameType = this.extractGameTypeFromHash(trialEventData.extraDataHash);

    return {
      type: 'trial_register',
      player,
      amount,
      multiplier: trialEventData.multiplier,
      gameType,
      metadata: {
        accounts,
        trialAccount,
        poolId,
        extraDataHash: trialEventData.extraDataHash,
        q: trialEventData.q,
        k: trialEventData.k,
        qkWithConfigHash: trialEventData.qkWithConfigHash,
        instructionData: instructionData.toString('hex'),
        transaction,
      },
    };
  }

  /**
   * Parse trial_resolve_rand (settle bet)
   * Accounts: [user, vault_state, trial, pool, net_token, host_token, mint, user_token, multisig_authority, vault_mint_signer, token_program, resolver]
   * Args: { randomness: [u8; 64] }
   */
  private parseTrialResolve(
    instructionData: Buffer,
    accounts: string[],
    transaction: any
  ): ParsedFareTransaction {
    const player = accounts[0]; // user
    const trialAccount = accounts[2];
    const poolId = accounts[3];
    
    // Look for token transfer OUT (payout)
    let payout = BigInt(0);
    let won = false;
    
    const tokenTransfer = this.findTokenTransferTo(transaction, player);
    if (tokenTransfer && tokenTransfer > BigInt(0)) {
      payout = tokenTransfer;
      won = true;
    }

    return {
      type: 'trial_resolve',
      player,
      amount: BigInt(0), // Will need to fetch from trial account
      payout,
      won,
      gameType: 'unknown', // Will need to fetch from trial account
      metadata: {
        accounts,
        trialAccount,
        poolId,
        instructionData: instructionData.toString('hex'),
        transaction,
      },
    };
  }

  /**
   * Parse pool_register (register a new pool)
   * Accounts: [vault_state, pool, manager, system_program, ...]
   * Args: Pool configuration data
   */
  private parsePoolRegister(
    instructionData: Buffer,
    accounts: string[],
    transaction: any
  ): ParsedFareTransaction {
    const poolAccount = accounts[1]; // Pool account being registered
    const manager = accounts[2]; // Pool manager

    // Extract event data from logs
    const eventData = this.parseEventFromLogs(transaction, EVENT_DISCRIMINATORS.POOL_REGISTERED);
    let poolEventData: any = {};
    
    if (eventData) {
      try {
        // PoolRegistered event structure (all f64 = 8 bytes each):
        // pool_id: pubkey (32), manager: pubkey (32), fee_play_mult: f64, fee_loss_mult: f64,
        // fee_mint_mult: f64, fee_host_pct: f64, fee_pool_pct: f64, min_limit: f64, probability: f64
        let offset = 64; // Skip pool_id and manager (32 bytes each)
        
        poolEventData = {
          feePlayMultiplier: eventData.readDoubleLE(offset), // f64 = double
          feeLossMultiplier: eventData.readDoubleLE(offset + 8),
          feeMintMultiplier: eventData.readDoubleLE(offset + 16),
          feeHostPercent: eventData.readDoubleLE(offset + 24),
          feePoolPercent: eventData.readDoubleLE(offset + 32),
          minLimitForTicket: eventData.readDoubleLE(offset + 40),
          probability: eventData.readDoubleLE(offset + 48),
        };
      } catch (error) {
        logger.error({ error }, 'Error deserializing PoolRegistered event');
      }
    }

    return {
      type: 'pool_register',
      player: manager,
      amount: BigInt(0),
      gameType: 'pool_management',
      metadata: {
        accounts,
        poolAccount,
        managerAddress: manager,
        instructionData: instructionData.toString('hex'),
        transaction,
        ...poolEventData, // Include parsed event data
      },
    };
  }

  /**
   * Extract event data from transaction logs
   * Anchor programs emit events as "Program data: <base64>" in logMessages
   */
  private parseEventFromLogs(transaction: any, eventDiscriminator: Buffer): any | null {
    try {
      const logs = transaction.meta?.logMessages || [];
      
      for (const log of logs) {
        // Look for "Program data:" logs which contain base64 encoded events
        if (log.startsWith('Program data: ')) {
          const base64Data = log.replace('Program data: ', '');
          const data = Buffer.from(base64Data, 'base64');
          
          // Check if discriminator matches
          const disc = data.slice(0, 8);
          if (disc.equals(eventDiscriminator)) {
            return data.slice(8); // Return data after discriminator
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, 'Error parsing event from logs');
      return null;
    }
  }
  
  /**
   * Parse TrialRegistered event from logs to extract Q/K arrays and other data
   * Event structure: { trial_id, who, pool_id, multiplier, qk: [[q1,k1], [q2,k2], ...], extra_data_hash }
   */
  private parseTrialRegisteredEvent(transaction: any): {
    multiplier: number;
    extraDataHash: string;
    q: bigint[];
    k: bigint[];
    qkWithConfigHash: string;
  } {
    try {
      const eventData = this.parseEventFromLogs(transaction, EVENT_DISCRIMINATORS.TRIAL_REGISTERED);
      if (!eventData) {
        return { multiplier: 0, extraDataHash: '', q: [], k: [], qkWithConfigHash: '' };
      }

      // Deserialize TrialRegistered event
      // Format: trial_id (32), who (32), pool_id (32), multiplier (8), qk (variable), extra_data_hash (variable)
      let offset = 0;
      
      // Skip trial_id, who, pool_id (32 bytes each = 96 bytes total)
      offset += 96;
      
      // Read multiplier (u64 = 8 bytes)
      const multiplier = Number(eventData.readBigUInt64LE(offset));
      offset += 8;
      
      // Read QK array (vec of [f64, f64] pairs)
      // First 4 bytes = length of vector
      const qkLength = eventData.readUInt32LE(offset);
      offset += 4;
      
      const q: bigint[] = [];
      const k: bigint[] = [];
      
      // Each pair is 16 bytes (2 f64 values)
      for (let i = 0; i < qkLength; i++) {
        const qValue = eventData.readDoubleLE(offset);
        offset += 8;
        const kValue = eventData.readDoubleLE(offset);
        offset += 8;
        
        // Convert f64 to BigInt (multiply by 1e18 for precision)
        q.push(BigInt(Math.floor(qValue * 1e18)));
        k.push(BigInt(Math.floor(kValue * 1e18)));
      }
      
      // Read extra_data_hash (string - 4 bytes length + utf8 data)
      const hashLength = eventData.readUInt32LE(offset);
      offset += 4;
      const extraDataHash = eventData.slice(offset, offset + hashLength).toString('utf8');
      
      // Compute qkWithConfigHash (similar to how Arbitrum does it)
      // For now, use a simple hash of the q+k arrays
      const qkStr = JSON.stringify({ q: q.map(String), k: k.map(String) });
      const qkWithConfigHash = `qk-${Buffer.from(qkStr).toString('hex').slice(0, 32)}`;
      
      return { multiplier, extraDataHash, q, k, qkWithConfigHash };
    } catch (error) {
      logger.error({ error }, 'Error parsing TrialRegistered event');
      return { multiplier: 0, extraDataHash: '', q: [], k: [], qkWithConfigHash: '' };
    }
  }
  
  /**
   * Extract multiplier and extra_data_hash from event logs
   * @deprecated Use parseTrialRegisteredEvent instead
   */
  private extractFromLogs(transaction: any): { multiplier: number; extraDataHash: string } {
    const data = this.parseTrialRegisteredEvent(transaction);
    return { multiplier: data.multiplier, extraDataHash: data.extraDataHash };
  }

  /**
   * Find token transfer amount from transaction
   */
  private findTokenTransfer(transaction: any, fromAddress: string): bigint {
    try {
      // Look for SPL token transfer instruction
      const instructions = transaction.transaction.message.instructions;
      
      for (const ix of instructions) {
        if (ix.parsed && ix.parsed.type === 'transfer') {
          const info = ix.parsed.info;
          if (info.source && info.source.toString() === fromAddress) {
            return BigInt(info.amount || 0);
          }
        }
      }
      
      return BigInt(0);
    } catch (error) {
      logger.error({ error }, 'Error finding token transfer');
      return BigInt(0);
    }
  }

  /**
   * Find token transfer TO an address (payout)
   */
  private findTokenTransferTo(transaction: any, toAddress: string): bigint {
    try {
      const instructions = transaction.transaction.message.instructions;
      
      for (const ix of instructions) {
        if (ix.parsed && ix.parsed.type === 'transfer') {
          const info = ix.parsed.info;
          if (info.destination && info.destination.toString() === toAddress) {
            return BigInt(info.amount || 0);
          }
        }
      }
      
      return BigInt(0);
    } catch (error) {
      logger.error({ error }, 'Error finding token transfer');
      return BigInt(0);
    }
  }

  /**
   * Extract game type from extra_data_hash
   * The hash may contain encoded game information
   */
  private extractGameTypeFromHash(hash: string): string {
    // TODO: Decode extra_data_hash to get game type
    // For now, return generic
    return 'casino_game';
  }
}

export interface ParsedFareTransaction {
  type: 'trial_register' | 'trial_resolve' | 'pool_register' | string;
  player: string;
  amount: bigint;
  payout?: bigint;
  won?: boolean;
  multiplier?: number;
  gameType: string;
  metadata: {
    accounts: string[];
    trialAccount?: string;
    poolId?: string;
    poolAccount?: string;
    managerAddress?: string;
    qk?: any;
    q?: bigint[]; // Q array from TrialRegistered event
    k?: bigint[]; // K array from TrialRegistered event
    qkWithConfigHash?: string; // Computed hash
    multiplier?: number; // Multiplier from event
    extraDataHash?: string;
    randomness?: number[];
    instructionData: any;
    transaction: any;
  };
}

/**
 * Helper to get trial account data
 * Decodes the TrialState account manually without Anchor
 */
export async function getTrialAccountData(
  connection: any,
  trialAccount: string
): Promise<TrialAccountData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(trialAccount));
    if (!accountInfo) {
      logger.warn({ trialAccount }, 'Trial account not found');
      return null;
    }

    // TODO: Manually decode TrialState using borsh layout
    // For now, return minimal data and fetch from blockchain events
    
    logger.debug({ trialAccount }, 'Trial account found, manual decoding needed');
    
    return {
      user: '',  // Will be extracted from transaction
      mult: BigInt(0),
      poolId: '',
      userToken: '',
      qk: null,
      extraDataHash: '',
      feeNetworkPct: 0,
    };
  } catch (error) {
    logger.error({ error, trialAccount }, 'Error fetching trial account data');
    return null;
  }
}

export interface TrialAccountData {
  user: string;
  mult: bigint;
  poolId: string;
  userToken: string;
  qk: any;
  extraDataHash: string;
  feeNetworkPct: number;
}

