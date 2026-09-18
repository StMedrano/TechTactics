import crypto from 'crypto';

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPassword(password, storedValue) {
  if (!storedValue) return false;

  if (storedValue.startsWith('pbkdf2$')) {
    const [, iterations, salt, hash] = storedValue.split('$');
    const derived = crypto
      .pbkdf2Sync(password, salt, Number(iterations), 64, 'sha512')
      .toString('hex');
    return timingSafeEqual(derived, hash);
  }

  return timingSafeEqual(password, storedValue);
}

export function hashPassword(password, iterations = 100000) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}
