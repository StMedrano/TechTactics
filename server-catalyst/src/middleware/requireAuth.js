import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getStore } from '../services/storeFactory.js';
import { applyEffectiveRole } from '../utils/users.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.tt_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Missing session token.' });
  try {
    const decoded = jwt.verify(token, env.sessionSecret);
    const store = getStore();
    const user = await store.getUserById(req, decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Session user not found.' });
    }
    const settings = await store.getSettings(req);
    req.user = applyEffectiveRole(user, settings);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid session token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    next();
  };
}
