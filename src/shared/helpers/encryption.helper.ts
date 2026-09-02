import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Two unrelated concerns kept together for convenience:
 *  - `hashPassword` / `comparePassword` — bcrypt, for user credentials.
 *  - `encrypt` / `decrypt` — AES-256-GCM with a per-value random salt + IV, for
 *    third-party secrets you must be able to read back (API keys, tokens).
 *    Pass `config.get('auth.encryptionKey')` as the key.
 */
export class EncryptionHelper {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly KEY_LENGTH = 32;

  private static deriveKey(encryptionKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      encryptionKey,
      salt,
      100_000,
      this.KEY_LENGTH,
      'sha512',
    );
  }

  /** Returns `salt:iv:authTag:ciphertext`, all base64. */
  static encrypt(text: string, encryptionKey: string): string {
    if (!text) throw new Error('Text to encrypt cannot be empty');
    if (!encryptionKey) throw new Error('Encryption key is required');

    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const key = this.deriveKey(encryptionKey, salt);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');
  }

  static decrypt(encryptedText: string, encryptionKey: string): string {
    if (!encryptedText) throw new Error('Encrypted text cannot be empty');
    if (!encryptionKey) throw new Error('Encryption key is required');

    const parts = encryptedText.split(':');
    if (parts.length !== 4) throw new Error('Invalid encrypted text format');

    const salt = Buffer.from(parts[0], 'base64');
    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const key = this.deriveKey(encryptionKey, salt);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parts[3], 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  static generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
