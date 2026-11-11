import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { createMapTokenVerifier } from '../src/auth.js';
import type { ProblemDetails } from '../src/errors.js';
import { createSeedStore, SEED_IDS } from '../src/store.js';
import type { Principal, ReviewQueuePageDto, ReviewQueueStore } from '../src/types.js';

interface TestTokens {
  readonly taClassA: string;
  readonly taClassB: string;
  readonly student: string;
  readonly admin: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertProblemDetails(
  rawBody: unknown,
  expected: {
    slug: string;
    status: number;
    title: string;
    instance: string;
  }
): void {
  expect(typeof rawBody).toBe('object');
  expect(rawBody).not.toBeNull();
  const problem = rawBody as ProblemDetails;
  expect(problem.type).toBe(`https://leetkob.example/problems/${expected.slug}`);
  expect(problem.title).toBe(expected.title);
  expect(problem.status).toBe(expected.status);
  expect(problem.instance).toBe(expected.instance);
  expect(typeof problem.detail).toBe('string');
  expect(problem.detail.length).toBeGreaterThan(5);
  // Ensure no internal paths or stack traces leak in problem detail
  expect(problem.detail).not.toMatch(/at\s+\S+\s+\(/);
  expect(problem.detail).not.toContain('node_modules');
}

describe('GET /labs/{labId}/review-queue — Contract Tests', () => {
  let app: FastifyInstance;
  let tokens: TestTokens;

  beforeEach(() => {
    tokens = {
      taClassA: `tok-ta-a-${randomUUID()}`,
      taClassB: `tok-ta-b-${randomUUID()}`,
      student: `tok-student-${randomUUID()}`,
      admin: `tok-admin-${randomUUID()}`
    };

    const tokenMap = new Map<string, Principal>([
      [tokens.taClassA, { userId: 'ta-1', role: 'ta', classIds: [SEED_IDS.CLASS_A] }],
      [tokens.taClassB, { userId: 'ta-2', role: 'ta', classIds: [SEED_IDS.CLASS_B] }],
      [tokens.student, { userId: 'stu-1', role: 'student', classIds: [SEED_IDS.CLASS_A] }],
      [
        tokens.admin,
        { userId: 'adm-1', role: 'admin', classIds: [SEED_IDS.CLASS_A, SEED_IDS.CLASS_B] }
      ]
    ]);

    app = buildApp({
      store: createSeedStore(),
      verifyToken: createMapTokenVerifier(tokenMap)
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('1. Authentication & Role Authorization (Steps 1–2)', () => {
    it('returns 401 unauthenticated with WWW-Authenticate: Bearer when Authorization header is missing', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;
      const res = await app.inject({ method: 'GET', url });

      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
      expect(res.headers['content-type']).toContain('application/problem+json');
      assertProblemDetails(res.json(), {
        slug: 'unauthenticated',
        status: 401,
        title: 'Authentication required',
        instance: url
      });
    });

    it('returns 401 unauthenticated when scheme is not Bearer or token is unknown', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;

      const basicRes = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: 'Basic dXNlcjpwYXNz' }
      });
      expect(basicRes.statusCode).toBe(401);
      expect(basicRes.headers['www-authenticate']).toBe('Bearer');

      const unknownRes = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: 'Bearer invalid-token-value' }
      });
      expect(unknownRes.statusCode).toBe(401);
      expect(unknownRes.headers['www-authenticate']).toBe('Bearer');
      assertProblemDetails(unknownRes.json(), {
        slug: 'unauthenticated',
        status: 401,
        title: 'Authentication required',
        instance: url
      });
    });

    it('returns 403 role-forbidden when caller is a student or an admin', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;

      for (const token of [tokens.student, tokens.admin]) {
        const res = await app.inject({
          method: 'GET',
          url,
          headers: { authorization: `Bearer ${token}` }
        });

        expect(res.statusCode).toBe(403);
        expect(res.headers['content-type']).toContain('application/problem+json');
        assertProblemDetails(res.json(), {
          slug: 'role-forbidden',
          status: 403,
          title: 'Forbidden',
          instance: url
        });
      }
    });
  });

  describe('2. Path Syntax & Class Ownership Isolation (Steps 3–4)', () => {
    it('returns 400 invalid-lab-id when labId is not a valid UUID', async () => {
      const url = '/labs/not-a-valid-uuid/review-queue';
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      assertProblemDetails(res.json(), {
        slug: 'invalid-lab-id',
        status: 400,
        title: 'Invalid lab ID',
        instance: url
      });
    });

    it('returns 404 lab-not-found when labId does not exist', async () => {
      const url = `/labs/${SEED_IDS.LAB_UNKNOWN}/review-queue`;
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/problem+json');
      assertProblemDetails(res.json(), {
        slug: 'lab-not-found',
        status: 404,
        title: 'Lab not found',
        instance: url
      });
    });

    it('returns the exact same 404 lab-not-found problem when a TA requests a lab belonging to another class', async () => {
      // TA of Class B attempts to read Class A's sorting lab
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;
      const crossClassRes = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassB}` }
      });

      // TA of Class B requests a non-existent lab with the same ID shape
      const unknownUrl = `/labs/${SEED_IDS.LAB_UNKNOWN}/review-queue`;
      const unknownRes = await app.inject({
        method: 'GET',
        url: unknownUrl,
        headers: { authorization: `Bearer ${tokens.taClassB}` }
      });

      expect(crossClassRes.statusCode).toBe(404);
      const crossProblem = crossClassRes.json<ProblemDetails>();
      const unknownProblem = unknownRes.json<ProblemDetails>();

      assertProblemDetails(crossProblem, {
        slug: 'lab-not-found',
        status: 404,
        title: 'Lab not found',
        instance: url
      });
      expect(crossProblem.type).toBe(unknownProblem.type);
      expect(crossProblem.title).toBe(unknownProblem.title);
      expect(crossProblem.status).toBe(unknownProblem.status);
    });
  });

  describe('3. Query Validation & Verification Precedence (Step 5)', () => {
    it.each([
      'page=0',
      'page=-1',
      'page=1000001',
      'page=1.5',
      'page=abc',
      'page=01',
      'pageSize=0',
      'pageSize=-5',
      'pageSize=101',
      'pageSize=NaN',
      'page=1&page=2',
      'pageSize=10&pageSize=20',
      'limit=10',
      'page=1&unknownParam=true'
    ])('returns 400 invalid-pagination for invalid query string "%s"', async (query) => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?${query}`;
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      assertProblemDetails(res.json(), {
        slug: 'invalid-pagination',
        status: 400,
        title: 'Invalid pagination parameters',
        instance: url
      });
    });

    it('enforces verification order: auth (401) -> role (403) -> labId syntax (400) -> lab access (404) -> query (400)', async () => {
      // Unauthenticated request with invalid labId and invalid query -> must stop at Step 1 (401)
      const step1 = await app.inject({
        method: 'GET',
        url: '/labs/bad-uuid/review-queue?page=0'
      });
      expect(step1.statusCode).toBe(401);

      // Student role with invalid labId and invalid query -> must stop at Step 2 (403)
      const step2 = await app.inject({
        method: 'GET',
        url: '/labs/bad-uuid/review-queue?page=0',
        headers: { authorization: `Bearer ${tokens.student}` }
      });
      expect(step2.statusCode).toBe(403);

      // TA role with invalid labId and invalid query -> must stop at Step 3 (400 invalid-lab-id)
      const step3 = await app.inject({
        method: 'GET',
        url: '/labs/bad-uuid/review-queue?page=0',
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });
      expect(step3.statusCode).toBe(400);
      expect(step3.json<ProblemDetails>().type).toBe(
        'https://leetkob.example/problems/invalid-lab-id'
      );

      // TA of Class B accessing Class A lab with invalid query -> must stop at Step 4 (404 lab-not-found)
      const step4 = await app.inject({
        method: 'GET',
        url: `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?page=0`,
        headers: { authorization: `Bearer ${tokens.taClassB}` }
      });
      expect(step4.statusCode).toBe(404);
      expect(step4.json<ProblemDetails>().type).toBe(
        'https://leetkob.example/problems/lab-not-found'
      );
    });
  });

  describe('4. Pagination, Deterministic Ordering, Filtering & Headers (Step 6)', () => {
    it('returns 200 with default pagination (page=1, pageSize=20), Cache-Control: no-store, and valid item schema', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['content-type']).toContain('application/json');

      const body = res.json<ReviewQueuePageDto>();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.total).toBe(25);
      expect(body.hasNext).toBe(true);
      expect(body.items).toHaveLength(20);

      for (const item of body.items) {
        expect(item.reviewId).toMatch(UUID_PATTERN);
        expect(item.submissionId).toMatch(UUID_PATTERN);
        expect(['violation', 'unsure', 'sampled_pass']).toContain(item.reason);
        expect(item.queuedAt).toMatch(ISO_UTC_PATTERN);
        // Must not contain already-reviewed record (...0099) or Class B record (bbbbbbbb...)
        expect(item.reviewId).not.toBe('00000000-0000-4000-8000-000000000099');
        expect(item.reviewId.startsWith('bbbbbbbb')).toBe(false);
      }
    });

    it('orders items by queuedAt ascending and breaks ties by reviewId ascending', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?page=1&pageSize=10`;
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ReviewQueuePageDto>();

      // First two items have identical queuedAt (2026-11-10T08:00:00.000Z) and must be ordered by reviewId ascending
      expect(body.items[0]?.queuedAt).toBe('2026-11-10T08:00:00.000Z');
      expect(body.items[1]?.queuedAt).toBe('2026-11-10T08:00:00.000Z');
      expect(body.items[0]?.reviewId).toBe('00000000-0000-4000-8000-000000000001');
      expect(body.items[1]?.reviewId).toBe('00000000-0000-4000-8000-000000000002');

      // Verify monotonic ordering across the entire page
      for (let i = 1; i < body.items.length; i++) {
        const prev = body.items[i - 1];
        const curr = body.items[i];
        if (!prev || !curr) {
          throw new Error('Expected items at index');
        }
        const prevTime = Date.parse(prev.queuedAt);
        const currTime = Date.parse(curr.queuedAt);
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
        if (currTime === prevTime) {
          expect(prev.reviewId.localeCompare(curr.reviewId)).toBeLessThan(0);
        }
      }
    });

    it('returns the remaining 5 items and hasNext: false on the final page (page=2, pageSize=20)', async () => {
      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?page=2&pageSize=20`;
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ReviewQueuePageDto>();
      expect(body.page).toBe(2);
      expect(body.pageSize).toBe(20);
      expect(body.total).toBe(25);
      expect(body.hasNext).toBe(false);
      expect(body.items).toHaveLength(5);
      expect(body.items[0]?.reviewId).toBe('00000000-0000-4000-8000-000000000021');
      expect(body.items[4]?.reviewId).toBe('00000000-0000-4000-8000-000000000025');
    });

    it('supports maximum pageSize=100 and out-of-range page within 1..1000000 returning items: [] and hasNext: false', async () => {
      const maxPageSizeRes = await app.inject({
        method: 'GET',
        url: `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?page=1&pageSize=100`,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });
      expect(maxPageSizeRes.statusCode).toBe(200);
      const maxBody = maxPageSizeRes.json<ReviewQueuePageDto>();
      expect(maxBody.pageSize).toBe(100);
      expect(maxBody.items).toHaveLength(25);
      expect(maxBody.hasNext).toBe(false);

      const beyondEndRes = await app.inject({
        method: 'GET',
        url: `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue?page=5&pageSize=20`,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });
      expect(beyondEndRes.statusCode).toBe(200);
      const beyondBody = beyondEndRes.json<ReviewQueuePageDto>();
      expect(beyondBody.page).toBe(5);
      expect(beyondBody.total).toBe(25);
      expect(beyondBody.items).toEqual([]);
      expect(beyondBody.hasNext).toBe(false);
    });

    it('returns items: [], total: 0, hasNext: false for an accessible lab with an empty queue and is also mounted at /v1/labs/{labId}/review-queue', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/labs/${SEED_IDS.LAB_EMPTY_A}/review-queue`,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ReviewQueuePageDto>();
      expect(body).toEqual({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        hasNext: false
      });
    });
  });

  describe('5. Controlled Store Failure Simulation (500 internal-error)', () => {
    it('returns 500 internal-error with generic detail when the store throws an unexpected error', async () => {
      const failingStore: ReviewQueueStore = {
        getLabById: () => Promise.reject(new Error('ECONNREFUSED postgres://secret-host:5432/db')),
        listReviewRecordsByLab: () => Promise.reject(new Error('Unexpected failure'))
      };

      const failingApp = buildApp({
        store: failingStore,
        verifyToken: createMapTokenVerifier(
          new Map([[tokens.taClassA, { userId: 'ta-1', role: 'ta', classIds: [SEED_IDS.CLASS_A] }]])
        )
      });

      const url = `/labs/${SEED_IDS.LAB_SORTING_A}/review-queue`;
      const res = await failingApp.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${tokens.taClassA}` }
      });

      expect(res.statusCode).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
      const problem = res.json<ProblemDetails>();
      assertProblemDetails(problem, {
        slug: 'internal-error',
        status: 500,
        title: 'Internal server error',
        instance: url
      });
      expect(problem.detail).toBe(
        'An unexpected error occurred while retrieving the review queue.'
      );
      expect(problem.detail).not.toContain('postgres');
      expect(problem.detail).not.toContain('ECONNREFUSED');

      await failingApp.close();
    });
  });
});
