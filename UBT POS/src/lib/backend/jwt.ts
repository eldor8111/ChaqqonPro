/**
 * JWT utility for secure token handling
 * Centralized JWT_SECRET management with validation
 */

// Validate and export JWT_SECRET
const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error(
        "JWT_SECRET environment variable is not set! " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
}

if (secret.length < 32) {
    throw new Error(
        `JWT_SECRET must be at least 32 characters long. Current length: ${secret.length}. ` +
        "Generate a strong secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
}

// Export as TextEncoder for jose library
export const JWT_SECRET = new TextEncoder().encode(secret);

// Export raw secret for other uses
export const JWT_SECRET_RAW = secret;
