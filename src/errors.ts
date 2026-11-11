import type { FastifyReply } from 'fastify';

export type ProblemSlug =
  | 'unauthenticated'
  | 'role-forbidden'
  | 'invalid-lab-id'
  | 'lab-not-found'
  | 'invalid-pagination'
  | 'internal-error';

export interface ProblemDetails {
  readonly type: `https://leetkob.example/problems/${ProblemSlug}`;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
}

const PROBLEM_CATALOG: Record<ProblemSlug, { status: number; title: string }> = {
  unauthenticated: { status: 401, title: 'Authentication required' },
  'role-forbidden': { status: 403, title: 'Forbidden' },
  'invalid-lab-id': { status: 400, title: 'Invalid lab ID' },
  'lab-not-found': { status: 404, title: 'Lab not found' },
  'invalid-pagination': { status: 400, title: 'Invalid pagination parameters' },
  'internal-error': { status: 500, title: 'Internal server error' }
};

export function sendProblem(
  reply: FastifyReply,
  slug: ProblemSlug,
  detail: string,
  instance: string
): FastifyReply {
  const meta = PROBLEM_CATALOG[slug];
  const body: ProblemDetails = {
    type: `https://leetkob.example/problems/${slug}`,
    title: meta.title,
    status: meta.status,
    detail,
    instance
  };

  if (slug === 'unauthenticated') {
    reply.header('WWW-Authenticate', 'Bearer');
  }

  return reply
    .code(meta.status)
    .header('Content-Type', 'application/problem+json; charset=utf-8')
    .send(body);
}
