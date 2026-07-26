import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import Base64 from 'crypto-js/enc-base64';
import Hex from 'crypto-js/enc-hex';
import PBKDF2 from 'crypto-js/pbkdf2';
import CryptoJS from 'crypto-js';
import WordArray from 'crypto-js/lib-typedarrays';

/**
 * Password-protected backups. A backup holds a full financial history, so
 * once it leaves the app it should not be readable by whoever ends up with
 * the file.
 *
 * AES-256-CBC with a PBKDF2-derived key. Iterations are kept modest because
 * the derivation runs in JavaScript on a phone — this protects a file
 * against casual reading, not against a determined offline attacker with a
 * weak password, so the UI asks for a real passphrase.
 */
const ENVELOPE_TAG = 'budgetting-app-encrypted';
const ITERATIONS = 20_000;
const KEY_SIZE_WORDS = 8; // 8 * 32 bits = 256-bit key

export interface EncryptedEnvelope {
  app: typeof ENVELOPE_TAG;
  version: 1;
  kdf: { name: 'PBKDF2-SHA256'; iterations: number; salt: string };
  iv: string;
  ciphertext: string;
}

export function isEncryptedBackup(text: string): boolean {
  try {
    return JSON.parse(text)?.app === ENVELOPE_TAG;
  } catch {
    return false;
  }
}

function deriveKey(password: string, saltHex: string) {
  return PBKDF2(password, Hex.parse(saltHex), {
    keySize: KEY_SIZE_WORDS,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

export function encryptBackup(plaintext: string, password: string): string {
  const salt = WordArray.random(16);
  const iv = WordArray.random(16);
  const saltHex = salt.toString(Hex);
  const key = deriveKey(password, saltHex);
  const encrypted = AES.encrypt(plaintext, key, { iv });
  const envelope: EncryptedEnvelope = {
    app: ENVELOPE_TAG,
    version: 1,
    kdf: { name: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: saltHex },
    iv: iv.toString(Hex),
    ciphertext: encrypted.ciphertext.toString(Base64),
  };
  return JSON.stringify(envelope);
}

/** Returns the plaintext, or null when the password is wrong or the file is corrupt */
export function decryptBackup(text: string, password: string): string | null {
  try {
    const envelope = JSON.parse(text) as EncryptedEnvelope;
    if (envelope?.app !== ENVELOPE_TAG) return null;
    const key = deriveKey(password, envelope.kdf.salt);
    const decrypted = AES.decrypt(
      { ciphertext: Base64.parse(envelope.ciphertext) } as never,
      key,
      { iv: Hex.parse(envelope.iv) },
    );
    // A wrong key yields garbage bytes, which fail UTF-8 decoding or parse
    const plaintext = decrypted.toString(Utf8);
    return plaintext.length > 0 ? plaintext : null;
  } catch {
    return null;
  }
}
