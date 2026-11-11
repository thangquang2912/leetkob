import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { extractBearerToken } from './auth.js';
import { sendProblem } from './errors.js';
import type {
  ReviewQueueItemDto,
  ReviewQueuePageDto,
  ReviewQueueRecord,
  ReviewQueueStore,
  TokenVerifier
} from './types.js';

export interface AppDependencies {
  readonly store: ReviewQueueStore;
  readonly verifyToken: TokenVerifier;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITIVE_INT_REGEX = /^[1-9][0-9]*$/;

const DEFAULT_PAGE = 1;
const MAX_PAGE = 1_000_000;
const DEFAULT_PAGE_SIZE = 21;
const MAX_PAGE_SIZE = 100;

interface ParsedPagination {
  readonly ok: true;
  readonly page: number;
  readonly pageSize: number;
}

interface PaginationError {
  readonly ok: false;
  readonly detail: string;
}

function parsePaginationFromRawUrl(rawUrl: string): ParsedPagination | PaginationError {
  const queryIndex = rawUrl.indexOf('?');
  if (queryIndex === -1) {
    return { ok: true, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };
  }

  const rawQuery = rawUrl.slice(queryIndex + 1);
  if (rawQuery.length === 0) {
    return { ok: true, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE };
  }

  const searchParams = new URLSearchParams(rawQuery);
  const seenKeys = new Set<string>();

  for (const key of searchParams.keys()) {
    if (key !== 'page' && key !== 'pageSize') {
      return {
        ok: false,
        detail: `Unknown query parameter '${key}' is not allowed.`
      };
    }
    const allValues = searchParams.getAll(key);
    if (allValues.length > 1) {
      return {
        ok: false,
        detail: `Query parameter '${key}' must not be specified more than once.`
      };
    }
    seenKeys.add(key);
  }

  let page = DEFAULT_PAGE;
  if (seenKeys.has('page')) {
    const rawPage = searchParams.get('page') ?? '';
    if (!POSITIVE_INT_REGEX.test(rawPage)) {
      return {
        ok: false,
        detail: "Query parameter 'page' must be an integer from 1 to 1000000."
      };
    }
    const parsedPage = Number(rawPage);
    if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || parsedPage > MAX_PAGE) {
      return {
        ok: false,
        detail: "Query parameter 'page' must be an integer from 1 to 1000000."
      };
    }
    page = parsedPage;
  }

  let pageSize = DEFAULT_PAGE_SIZE;
  if (seenKeys.has('pageSize')) {
    const rawPageSize = searchParams.get('pageSize') ?? '';
    if (!POSITIVE_INT_REGEX.test(rawPageSize)) {
      return {
        ok: false,
        detail: "Query parameter 'pageSize' must be an integer from 1 to 100."
      };
    }
    const parsedPageSize = Number(rawPageSize);
    if (
      !Number.isSafeInteger(parsedPageSize) ||
      parsedPageSize < 1 ||
      parsedPageSize > MAX_PAGE_SIZE
    ) {
      return {
        ok: false,
        detail: "Query parameter 'pageSize' must be an integer from 1 to 100."
      };
    }
    pageSize = parsedPageSize;
  }

  return { ok: true, page, pageSize };
}

function compareReviewRecords(a: ReviewQueueRecord, b: ReviewQueueRecord): number {
  const timeA = Date.parse(a.queuedAt);
  const timeB = Date.parse(b.queuedAt);
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return a.reviewId.toLowerCase().localeCompare(b.reviewId.toLowerCase());
}

function toItemDto(record: ReviewQueueRecord): ReviewQueueItemDto {
  return {
    reviewId: record.reviewId.toLowerCase(),
    submissionId: record.submissionId.toLowerCase(),
    reason: record.reason,
    queuedAt: record.queuedAt
  };
}

export function buildApp(deps: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  const handleReviewQueue = async (
    request: FastifyRequest<{ Params: { labId: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    const instance = request.raw.url ?? request.url;

    // Step 1: Authentication
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return sendProblem(
        reply,
        'unauthenticated',
        'Missing or malformed Authorization Bearer token.',
        instance
      );
    }

    const principal = deps.verifyToken(token);
    if (!principal) {
      return sendProblem(
        reply,
        'unauthenticated',
        'Invalid or expired authentication token.',
        instance
      );
    }

    // Step 2: Role check (TA only)
    if (principal.role !== 'ta') {
      return sendProblem(
        reply,
        'role-forbidden',
        'Only teaching assistants (role "ta") are permitted to access the review queue.',
        instance
      );
    }

    // Step 3: Path parameter labId syntax check
    const rawLabId = request.params.labId;
    if (!UUID_REGEX.test(rawLabId)) {
      return sendProblem(
        reply,
        'invalid-lab-id',
        "Path parameter 'labId' must be a valid UUID.",
        instance
      );
    }
    const normalizedLabId = rawLabId.toLowerCase();

    // Step 4: Lab existence & TA class ownership check
    let lab;
    let allRecords: readonly ReviewQueueRecord[];
    try {
      lab = await deps.store.getLabById(normalizedLabId);
    } catch {
      return sendProblem(
        reply,
        'internal-error',
        'An unexpected error occurred while retrieving the review queue.',
        instance
      );
    }

    if (!lab || !principal.classIds.includes(lab.classId)) {
      return sendProblem(
        reply,
        'lab-not-found',
        `No accessible lab found for ID '${normalizedLabId}'.`,
        instance
      );
    }

    // Step 5: Query parameter validation
    const pagination = parsePaginationFromRawUrl(instance);
    if (!pagination.ok) {
      return sendProblem(reply, 'invalid-pagination', pagination.detail, instance);
    }

    // Step 6: Retrieve, filter pending, sort deterministically, and paginate
    try {
      allRecords = await deps.store.listReviewRecordsByLab(normalizedLabId);
    } catch {
      return sendProblem(
        reply,
        'internal-error',
        'An unexpected error occurred while retrieving the review queue.',
        instance
      );
    }

    const pendingSorted = allRecords
      .filter(
        (record) => record.status === 'pending' && record.labId.toLowerCase() === normalizedLabId
      )
      .slice()
      .sort(compareReviewRecords);

    const total = pendingSorted.length;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const items =
      offset >= total ? [] : pendingSorted.slice(offset, offset + pageSize).map(toItemDto);
    const hasNext = page * pageSize < total;

    const responseBody: ReviewQueuePageDto = {
      items,
      page,
      pageSize,
      total,
      hasNext
    };

    return reply
      .code(200)
      .header('Cache-Control', 'no-store')
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(responseBody);
  };

  app.get('/labs/:labId/review-queue', handleReviewQueue);
  app.get('/v1/labs/:labId/review-queue', handleReviewQueue);

  return app;
}
