import { env } from '../config/env.js';
import { demoStore } from './demoStore.js';
import { catalystStore } from './catalystStore.js';

export function getStore() {
  return env.appMode === 'catalyst' ? catalystStore : demoStore;
}
