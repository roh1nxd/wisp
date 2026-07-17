/**
 * lib/config.ts — single source of truth for all environment-derived constants.
 *
 * Every credential is read ONCE from process.env here.
 * Import from this file throughout the codebase — never reference
 * process.env.VARIABLE_NAME directly in component or hook files.
 * To rotate a credential, only .env.local needs to change.
 */


/** Stellar network identifier: "testnet" | "mainnet" */
export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';

/** Stellar Horizon RPC endpoint */
export const STELLAR_HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
