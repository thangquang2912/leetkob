import type { LabRecord, ReviewQueueRecord, ReviewQueueStore } from './types.js';

export const SEED_IDS = {
  CLASS_A: 'class-csc13114-a',
  CLASS_B: 'class-csc13114-b',
  LAB_SORTING_A: '11111111-1111-4111-8111-111111111111',
  LAB_EMPTY_A: '22222222-2222-4222-8222-222222222222',
  LAB_TREES_B: '33333333-3333-4333-8333-333333333333',
  LAB_UNKNOWN: '99999999-9999-4999-8999-999999999999'
} as const;

export function createSeedStore(): ReviewQueueStore {
  const labs = new Map<string, LabRecord>([
    [
      SEED_IDS.LAB_SORTING_A,
      {
        labId: SEED_IDS.LAB_SORTING_A,
        classId: SEED_IDS.CLASS_A,
        title: 'Lab 01 — Merge Sort & Recursion Constraints'
      }
    ],
    [
      SEED_IDS.LAB_EMPTY_A,
      {
        labId: SEED_IDS.LAB_EMPTY_A,
        classId: SEED_IDS.CLASS_A,
        title: 'Lab 02 — Binary Search (Empty Queue)'
      }
    ],
    [
      SEED_IDS.LAB_TREES_B,
      {
        labId: SEED_IDS.LAB_TREES_B,
        classId: SEED_IDS.CLASS_B,
        title: 'Lab 01 (Class B) — AVL Trees'
      }
    ]
  ]);

  const records: ReviewQueueRecord[] = [
    // Tie-breaking pair with identical queuedAt timestamp (out of order in raw array)
    {
      reviewId: '00000000-0000-4000-8000-000000000002',
      labId: SEED_IDS.LAB_SORTING_A,
      submissionId: 'aaaaaaaa-0000-4000-8000-000000000002',
      reason: 'unsure',
      status: 'pending',
      queuedAt: '2026-11-10T08:00:00.000Z'
    },
    {
      reviewId: '00000000-0000-4000-8000-000000000001',
      labId: SEED_IDS.LAB_SORTING_A,
      submissionId: 'aaaaaaaa-0000-4000-8000-000000000001',
      reason: 'violation',
      status: 'pending',
      queuedAt: '2026-11-10T08:00:00.000Z'
    },
    // Already reviewed record for LAB_SORTING_A (must never appear in pending queue)
    {
      reviewId: '00000000-0000-4000-8000-000000000099',
      labId: SEED_IDS.LAB_SORTING_A,
      submissionId: 'aaaaaaaa-0000-4000-8000-000000000099',
      reason: 'violation',
      status: 'reviewed',
      queuedAt: '2026-11-10T07:00:00.000Z'
    },
    // Record belonging to Class B lab (must never appear in LAB_SORTING_A)
    {
      reviewId: 'bbbbbbbb-0000-4000-8000-000000000001',
      labId: SEED_IDS.LAB_TREES_B,
      submissionId: 'cccccccc-0000-4000-8000-000000000001',
      reason: 'violation',
      status: 'pending',
      queuedAt: '2026-11-10T09:00:00.000Z'
    }
  ];

  // Add 23 more pending items for LAB_SORTING_A (total 25 pending items across 2 pages of default size 20)
  const reasons = ['violation', 'unsure', 'sampled_pass'] as const;
  for (let i = 3; i <= 25; i++) {
    const padded = String(i).padStart(12, '0');
    const minute = String(i).padStart(2, '0');
    const reason = reasons[i % reasons.length] ?? 'violation';
    records.push({
      reviewId: `00000000-0000-4000-8000-${padded}`,
      labId: SEED_IDS.LAB_SORTING_A,
      submissionId: `aaaaaaaa-0000-4000-8000-${padded}`,
      reason,
      status: 'pending',
      queuedAt: `2026-11-10T08:${minute}:00.000Z`
    });
  }

  return {
    getLabById(labId: string): Promise<LabRecord | undefined> {
      return Promise.resolve(labs.get(labId.toLowerCase()));
    },
    listReviewRecordsByLab(labId: string): Promise<readonly ReviewQueueRecord[]> {
      const normalized = labId.toLowerCase();
      return Promise.resolve(records.filter((r) => r.labId.toLowerCase() === normalized));
    }
  };
}
