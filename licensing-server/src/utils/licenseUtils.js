/**
 * License Utilities for ByteVantage Licensing Server
 * Helper functions for license key generation and validation
 */

const crypto = require('crypto');

/**
 * Generate a license key
 * @param {string} clientCode - Client code
 * @param {string} productCode - Product code
 * @returns {string} Generated license key
 */
function generateLicenseKey(clientCode, productCode) {
  try {
    // Ensure codes are uppercase and limited length
    const cleanClientCode = clientCode.toUpperCase().substring(0, 8);
    const cleanProductCode = productCode.toUpperCase().substring(0, 6);
    
    // Generate timestamp part (base36 encoded)
    const timestamp = Math.floor(Date.now() / 1000);
    const timestampPart = timestamp.toString(36).toUpperCase().padStart(8, '0');
    
    // Generate random part
    const randomBytes = crypto.randomBytes(4);
    const randomPart = randomBytes.toString('hex').toUpperCase();
    
    // Generate checksum part
    const checksumInput = cleanClientCode + cleanProductCode + timestampPart + randomPart;
    const checksum = crypto.createHash('md5').update(checksumInput).digest('hex').substring(0, 4).toUpperCase();
    
    // Combine parts with dashes
    const licenseKey = `${cleanProductCode}-${cleanClientCode}-${timestampPart}-${randomPart}-${checksum}`;
    
    return licenseKey;
  } catch (error) {
    throw new Error('Failed to generate license key: ' + error.message);
  }
}

/**
 * Validate license key format
 * @param {string} licenseKey - License key to validate
 * @returns {boolean} True if format is valid
 */
function validateLicenseFormat(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return false;
  }
  
  // Check basic format: PRODUCT-CLIENT-TIMESTAMP-RANDOM-CHECKSUM
  const parts = licenseKey.split('-');
  
  if (parts.length !== 5) {
    return false;
  }
  
  const [productCode, clientCode, timestampPart, randomPart, checksumPart] = parts;
  
  // Validate each part
  if (!productCode || productCode.length < 2 || productCode.length > 6) {
    return false;
  }
  
  if (!clientCode || clientCode.length < 2 || clientCode.length > 8) {
    return false;
  }
  
  if (!timestampPart || timestampPart.length !== 8 || !/^[A-Z0-9]+$/.test(timestampPart)) {
    return false;
  }
  
  if (!randomPart || randomPart.length !== 8 || !/^[A-F0-9]+$/.test(randomPart)) {
    return false;
  }
  
  if (!checksumPart || checksumPart.length !== 4 || !/^[A-F0-9]+$/.test(checksumPart)) {
    return false;
  }
  
  return true;
}

/**
 * Verify license key checksum
 * @param {string} licenseKey - License key to verify
 * @returns {boolean} True if checksum is valid
 */
function verifyLicenseChecksum(licenseKey) {
  try {
    if (!validateLicenseFormat(licenseKey)) {
      return false;
    }
    
    const parts = licenseKey.split('-');
    const [productCode, clientCode, timestampPart, randomPart, providedChecksum] = parts;
    
    // Recalculate checksum
    const checksumInput = clientCode + productCode + timestampPart + randomPart;
    const calculatedChecksum = crypto.createHash('md5').update(checksumInput).digest('hex').substring(0, 4).toUpperCase();
    
    return providedChecksum === calculatedChecksum;
  } catch (error) {
    return false;
  }
}

/**
 * Extract information from license key
 * @param {string} licenseKey - License key to parse
 * @returns {Object} Extracted information
 */
function parseLicenseKey(licenseKey) {
  try {
    if (!validateLicenseFormat(licenseKey)) {
      return null;
    }
    
    const parts = licenseKey.split('-');
    const [productCode, clientCode, timestampPart, randomPart, checksumPart] = parts;
    
    // Decode timestamp
    const timestamp = parseInt(timestampPart, 36);
    const issueDate = new Date(timestamp * 1000);
    
    return {
      productCode,
      clientCode,
      timestampPart,
      randomPart,
      checksumPart,
      timestamp,
      issueDate,
      isValidChecksum: verifyLicenseChecksum(licenseKey)
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate API key
 * @param {string} keyName - Name for the API key
 * @returns {string} Generated API key
 */
function generateApiKey(keyName = 'default') {
  try {
    // Generate random bytes
    const randomBytes = crypto.randomBytes(32);
    
    // Create hash with key name and timestamp
    const hash = crypto.createHash('sha256');
    hash.update(randomBytes);
    hash.update(keyName);
    hash.update(Date.now().toString());
    
    // Return hex string
    return hash.digest('hex');
  } catch (error) {
    throw new Error('Failed to generate API key: ' + error.message);
  }
}

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string} Encrypted text
 */
function encrypt(text, key) {
  try {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text
 * @param {string} key - Decryption key
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText, key) {
  try {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

/**
 * Generate secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
function generateSecureRandom(length = 32) {
  try {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
  } catch (error) {
    throw new Error('Failed to generate secure random string: ' + error.message);
  }
}

/**
 * Hash password or sensitive data
 * @param {string} data - Data to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} Hashed data
 */
function hashData(data, salt = null) {
  try {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    
    return actualSalt + ':' + hash.toString('hex');
  } catch (error) {
    throw new Error('Hashing failed: ' + error.message);
  }
}

/**
 * Verify hashed data
 * @param {string} data - Original data
 * @param {string} hashedData - Hashed data to verify against
 * @returns {boolean} True if data matches
 */
function verifyHash(data, hashedData) {
  try {
    const parts = hashedData.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const salt = parts[0];
    const hash = parts[1];
    
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    
    return hash === verifyHash.toString('hex');
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateLicenseKey,
  validateLicenseFormat,
  verifyLicenseChecksum,
  parseLicenseKey,
  generateApiKey,
  encrypt,
  decrypt,
  generateSecureRandom,
  hashData,
  verifyHash
};
