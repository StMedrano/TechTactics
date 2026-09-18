import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signSession(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, env.sessionSecret, { expiresIn: '12h' });
}
