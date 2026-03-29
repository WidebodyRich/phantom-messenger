/**
 * Signal Protocol wrapper
 * Phase 1: Uses simplified AES-GCM encryption
 * Phase 2: TODO - Full Signal Protocol with X3DH + Double Ratchet
 *
 * This module provides a unified interface that can be swapped out
 * when upgrading to the full Signal Protocol implementation.
 */

import { generateRegistrationKeys } from './keyGeneration';
import { createSession, encryptMessage, decryptMessage, hasSession } from './sessionManager';

export { generateRegistrationKeys, createSession, encryptMessage, decryptMessage, hasSession };

/**
 * Initialize encryption for a new user.
 * Called during registration.
 * @returns {Object} Public keys to upload to server + private keys to store locally
 */
export async function initializeEncryption() {
  return generateRegistrationKeys();
}

/**
 * Start an encrypted session with another user.
 * In Phase 2, this will perform X3DH key exchange.
 * @param {string} userId - The recipient's user ID
 * @param {Object} keyBundle - Their public key bundle from the server
 */
export async function startSession(userId, keyBundle) {
  if (keyBundle?.identityKeyPublic) {
    return createSession(userId, keyBundle.identityKeyPublic);
  }
  // Fallback: create a session without proper key exchange
  return createSession(userId, null);
}

/**
 * Encrypt a message for a user.
 * @param {string} userId - Recipient user ID
 * @param {string} plaintext - Message to encrypt
 * @returns {string} Encrypted ciphertext (base64)
 */
export async function encrypt(userId, plaintext) {
  return encryptMessage(userId, plaintext);
}

/**
 * Decrypt a message from a user.
 * @param {string} userId - Sender user ID
 * @param {string} ciphertext - Encrypted message (base64)
 * @returns {string} Decrypted plaintext
 */
export async function decrypt(userId, ciphertext) {
  return decryptMessage(userId, ciphertext);
}
