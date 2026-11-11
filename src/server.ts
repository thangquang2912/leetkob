import { buildApp } from './app.js';
import { createMapTokenVerifier } from './auth.js';
import { createSeedStore, SEED_IDS } from './store.js';
import type { Principal } from './types.js';

function buildDemoTokenMap(): ReadonlyMap<string, Principal> {
  const entries: Array<[string, Principal]> = [];

  const ta1Token = process.env['DEMO_TA_CLASS1_TOKEN'];
  if (ta1Token) {
    entries.push([ta1Token, { userId: 'ta-class-a', role: 'ta', classIds: [SEED_IDS.CLASS_A] }]);
  }

  const ta2Token = process.env['DEMO_TA_CLASS2_TOKEN'];
  if (ta2Token) {
    entries.push([ta2Token, { userId: 'ta-class-b', role: 'ta', classIds: [SEED_IDS.CLASS_B] }]);
  }

  const studentToken = process.env['DEMO_STUDENT_TOKEN'];
  if (studentToken) {
    entries.push([
      studentToken,
      { userId: 'student-1', role: 'student', classIds: [SEED_IDS.CLASS_A] }
    ]);
  }

  const adminToken = process.env['DEMO_ADMIN_TOKEN'];
  if (adminToken) {
    entries.push([adminToken, { userId: 'admin-1', role: 'admin', classIds: [] }]);
  }

  return new Map(entries);
}

async function start(): Promise<void> {
  const host = process.env['HOST'] ?? '127.0.0.1';
  const port = Number(process.env['PORT'] ?? '3000');

  const app = buildApp({
    store: createSeedStore(),
    verifyToken: createMapTokenVerifier(buildDemoTokenMap())
  });

  await app.listen({ host, port });
}

void start();
