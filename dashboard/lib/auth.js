/**
 * Simple single-user password auth.
 * Uses DASHBOARD_PASSWORD env var.
 */

const VALID_PASSWORD = process.env.DASHBOARD_PASSWORD;

function validatePassword(password) {
  if (!VALID_PASSWORD) return true; // No password set = open access (dev mode)
  return password === VALID_PASSWORD;
}

function authMiddleware(req) {
  const authHeader = req.headers?.authorization;
  if (!VALID_PASSWORD) return true;
  if (!authHeader) return false;
  const [scheme, password] = authHeader.split(" ");
  if (scheme !== "Bearer") return false;
  return validatePassword(password);
}

module.exports = { validatePassword, authMiddleware };
