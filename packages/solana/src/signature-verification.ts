import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('solana:signature-verification');

export interface SignatureVerificationPayload {
  message: string;
  signature: string;
  publicKey: string;
}

/**
 * Verifies a Solana wallet signature
 * @param payload The signature verification payload
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(payload: SignatureVerificationPayload): boolean {
  try {
    const { message, signature, publicKey } = payload;

    // Decode the public key
    const pubKey = new PublicKey(publicKey);
    
    // Convert message to Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    
    // Decode the signature from base58
    const signatureBytes = bs58.decode(signature);

    // Verify the signature
    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubKey.toBytes()
    );

    if (verified) {
      logger.info({ publicKey }, 'Signature verified successfully');
    } else {
      logger.warn({ publicKey }, 'Signature verification failed');
    }

    return verified;
  } catch (error) {
    logger.error({ error, payload }, 'Error verifying signature');
    return false;
  }
}

/**
 * Creates a message for signing
 * @param walletAddress The wallet address
 * @param timestamp The timestamp (defaults to current time)
 * @returns The message to sign
 */
export function createSignInMessage(walletAddress: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `Sign in to FarePlay Casino\n\nWallet: ${walletAddress}\nTimestamp: ${ts}`;
}

/**
 * Validates that a signature timestamp is recent (within 5 minutes)
 * @param message The signed message
 * @returns true if timestamp is valid
 */
export function validateSignatureTimestamp(message: string): boolean {
  try {
    const match = message.match(/Timestamp: (\d+)/);
    if (!match) {
      return false;
    }

    const timestamp = parseInt(match[1], 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Check if timestamp is within 5 minutes
    return Math.abs(now - timestamp) < fiveMinutes;
  } catch (error) {
    logger.error({ error }, 'Error validating timestamp');
    return false;
  }
}


