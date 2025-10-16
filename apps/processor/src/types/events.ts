import { ParsedTransactionWithMeta } from '@solana/web3.js';

// Base event data from Solana
export interface SolanaEventData {
  signature: string;
  slot: number;
  instructionIndex: number;
  innerInstructionIndex: number;
  blockTime: Date;
}

// Event names matching the database schema
export enum EventName {
  PoolRegistered = 'poolRegisteredEvent',
  PoolManagerUpdated = 'poolManagerUpdatedEvent',
  PoolAccumulatedAmountUpdated = 'poolAccumulatedAmountUpdatedEvent',
  PoolAccumulatedAmountReleased = 'poolAccumulatedAmountReleasedEvent',
  QkWithConfigRegistered = 'qkWithConfigRegisteredEvent',
  FeeCharged = 'feeChargedEvent',
  TrialRegistered = 'trialRegisteredEvent',
  TrialResolved = 'trialResolvedEvent',
}

// Specific event data types
export interface PoolRegisteredEventData extends SolanaEventData {
  poolAddress: string;
  managerAddress: string;
  feePlayMultiplier: bigint;
  feeLossMultiplier: bigint;
  feeMintMultiplier: bigint;
  feeHostPercent: bigint;
  feePoolPercent: bigint;
  minLimitForTicket: bigint;
  probability: bigint;
}

export interface PoolManagerUpdatedEventData extends SolanaEventData {
  poolAddress: string;
  newPoolManagerAddress: string;
}

export interface PoolAccumulatedAmountUpdatedEventData extends SolanaEventData {
  poolAddress: string;
  trialId: string;
  newAccumulatedAmount: bigint;
}

export interface PoolAccumulatedAmountReleasedEventData extends SolanaEventData {
  poolAddress: string;
  trialId: string;
  receiver: string;
  releasedAmount: bigint;
}

export interface QkWithConfigRegisteredEventData extends SolanaEventData {
  qkWithConfigHash: string;
  q: bigint[];
  k: bigint[];
  feeLossMultiplier: bigint;
  feeMintMultiplier: bigint;
  effectiveEv: bigint;
}

export interface FeeChargedEventData extends SolanaEventData {
  feeType: 'FeePlay' | 'FeeLoss' | 'FeeMint';
  poolAddress: string;
  trialId: string;
  feeAmount: bigint;
}

export interface TrialRegisteredEventData extends SolanaEventData {
  trialId: string;
  who: string;
  poolAddress: string;
  multiplier: bigint;
  qkWithConfigHash: string;
  vrfCostInFare: bigint;
  extraDataHash: string;
}

export interface TrialResolvedEventData extends SolanaEventData {
  trialId: string;
  resultIndex: number;
  randomness: bigint;
}

// Union type for all event data
export type BlockchainEventData =
  | PoolRegisteredEventData
  | PoolManagerUpdatedEventData
  | PoolAccumulatedAmountUpdatedEventData
  | PoolAccumulatedAmountReleasedEventData
  | QkWithConfigRegisteredEventData
  | FeeChargedEventData
  | TrialRegisteredEventData
  | TrialResolvedEventData;

// Job data for processing
export interface BlockchainEventJob {
  eventName: EventName;
  eventData: BlockchainEventData;
}

export interface EventInterpretationJob {
  eventName: EventName;
  eventData: BlockchainEventData;
}

// Transaction parsing result
export interface ParsedEvent {
  eventName: EventName;
  eventData: BlockchainEventData;
}

// Helper to calculate order index (slot * 1e12 + instructionIndex * 1e6 + innerInstructionIndex)
export function calculateOrderIndex(
  slot: number,
  instructionIndex: number,
  innerInstructionIndex: number
): bigint {
  return (
    BigInt(slot) * BigInt(1e12) +
    BigInt(instructionIndex) * BigInt(1e6) +
    BigInt(innerInstructionIndex)
  );
}

