import { PublicKey } from '@solana/web3.js';
import { createLogger } from '@fareplay/utils';
import bs58 from 'bs58';

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
        const accountKey = message.accountKeys[ix.programIdIndex];
        // Handle both formats: { pubkey: PublicKey } and just PublicKey
        const programIdStr = accountKey?.pubkey?.toString() || accountKey?.toString();
        return programIdStr === this.programId.toString();
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
      const accounts = instruction.accounts.map((idx: number) => 
        message.accountKeys[idx].pubkey.toString()
      );

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
      case 'initialize':
      case 'update_vault_state':
        // Skip non-bet transactions
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

    // Try to extract multiplier and extra_data_hash from logs
    const { multiplier, extraDataHash } = this.extractFromLogs(transaction);
    
    // Parse extra_data_hash to extract game type
    const gameType = this.extractGameTypeFromHash(extraDataHash);

    return {
      type: 'trial_register',
      player,
      amount,
      multiplier,
      gameType,
      metadata: {
        accounts,
        trialAccount,
        poolId,
        extraDataHash,
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
   * Extract multiplier and extra_data_hash from event logs
   */
  private extractFromLogs(transaction: any): { multiplier: number; extraDataHash: string } {
    try {
      // Look for TrialRegistered event in logs
      const logs = transaction.meta?.logMessages || [];
      
      for (const log of logs) {
        // Event logs contain base64 encoded data
        // Look for patterns that might indicate multiplier or hash
        // TODO: Parse actual event data from logs
      }
      
      return { multiplier: 0, extraDataHash: '' };
    } catch (error) {
      return { multiplier: 0, extraDataHash: '' };
    }
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
    qk?: any;
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

