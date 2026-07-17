/**
 * lib/stellar.ts — Stellar SDK integration stubs.
 *
 * Placeholder structure for future Stellar transaction functions.
 * These will be filled in during the Stellar integration sprint.
 * All network config is read from lib/config.ts — never hardcoded here.
 */

import { STELLAR_NETWORK, STELLAR_HORIZON_URL } from './config';

/** The active Stellar network passphrase (testnet or mainnet) */
export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

/** Horizon server URL for the active network */
export const HORIZON_URL = STELLAR_HORIZON_URL;

// ---------------------------------------------------------------------------
// Future transaction helpers — not yet implemented
// ---------------------------------------------------------------------------

export interface SendPaymentParams {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  asset?: string; // defaults to XLM
  memo?: string;
}

/**
 * sendPayment — builds and returns an unsigned payment transaction.
 * The caller is responsible for signing via the connected wallet.
 * @throws Not yet implemented
 */
export async function sendPayment(_params: SendPaymentParams): Promise<never> {
  throw new Error('sendPayment: not yet implemented');
}

export interface SignTransactionParams {
  xdr: string; // base64-encoded transaction envelope XDR
  publicKey: string;
}

/**
 * signTransaction — sends XDR to the connected wallet for signing,
 * then returns the signed XDR envelope.
 * @throws Not yet implemented
 */
export async function signTransaction(_params: SignTransactionParams): Promise<never> {
  throw new Error('signTransaction: not yet implemented');
}

/**
 * submitTransaction — submits a signed XDR envelope to Horizon.
 * @throws Not yet implemented
 */
export async function submitTransaction(_signedXdr: string): Promise<never> {
  throw new Error('submitTransaction: not yet implemented');
}
