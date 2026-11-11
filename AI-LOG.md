# AI-LOG.md — LeeTKOB

This file tracks assistant usage across project milestones (`PA#2`–`PA#5`), including what was kept, what was changed, what was rejected, and what was written or verified by hand.

## Model Provider, Data Privacy & Cost Declaration

- **Product LLM feature (from PA#3 onwards)**: Google Gemini (`gemini-2.5-flash`), capped at **$5.00 USD / month** on a dedicated project.
- **Data leaving our system**: Only the lab problem statement, the TA's declared constraints, and the student's `Accepted` C++ source code with comments, student names, and student IDs stripped before calling the model. Students are informed at submission time.
- **PA#2 model cost**: **$0.00 USD** (all PA#2 endpoints and contract tests run against deterministic in-memory fixtures; no live LLM calls are made in unit/contract tests or CI).

---

## 2026-11-11 — CI quality gate workflow and branch protection setup (PA#2)

Tool: Antigravity (Gemini)
Asked for: A GitHub Actions workflow `.github/workflows/ci.yml` running lint, format check, typecheck, and tests on Node 24 LTS for `main` and tag `pa2`.
Kept: The four parallel jobs (`lint`, `format`, `typecheck`, `tests`) pinned to Node 24 with `npm ci` and the exact four `npm` scripts from `README.md`.
Changed: Removed `paths-ignore: ['**.md', 'docs/**']` from the pull_request trigger so all four required status checks always execute and report on documentation-only pull requests.
Rejected: A suggested `|| true` / `continue-on-error: true` fallback on the `format` job during initial setup, because a check that cannot fail defeats the branch protection gate. Added a rule to `AGENTS.md` (`Never` section) banning `paths-ignore` and `continue-on-error` on required CI jobs.
By hand: Configured GitHub branch protection rules on `main` (require PR, require all 4 checks, include administrators) and verified the blocked PR gate.

## 2026-11-11 — `GET /labs/{labId}/review-queue` contract specification (PA#2)

Tool: Antigravity (Gemini)
Asked for: Draft `docs/contract/review-queue.md` following the IA#3 `CONTRACT.md` five-section structure for the TA review queue endpoint.
Kept: The five-section layout (`Conventions`, `Errors`, `Resources`, `Endpoints`, `Versioning and Change Policy`), RFC 9457 Problem Details schema, and the 6-step verification order.
Changed: Unified cross-class TA access (`ta` of Class B requesting a Class A lab) with non-existent `labId` under `404 lab-not-found` instead of returning `403`, so the API never leaks the existence of another class's lab. Added deterministic tie-breaking (`queuedAt` ascending, then `reviewId` ascending).
Rejected: Cursor-based pagination for `review-queue`; replaced with explicit 1-based `page` (`1..1000000`) and `pageSize` (`1..100`, default `20`) returning `{ items, page, pageSize, total, hasNext }` and documented snapshot shift behaviour under `Cache-Control: no-store`.
By hand: Reviewed field rules, error slugs, and verification precedence against the class project brief.

## 2026-11-11 — Fastify 5 endpoint implementation and query parser (PA#2)

Tool: Antigravity (Gemini)
Asked for: Implement `GET /labs/:labId/review-queue` in `src/app.ts` with token authentication, role/ownership checks, pagination validation, and RFC 9457 error responses.
Kept: Dependency-injected `buildApp({ store, verifyToken })` architecture, seed store in `src/store.ts`, and `sendProblem` helper in `src/errors.ts`.
Changed: Replaced Fastify's default `request.query` object coercion with raw query parsing via `URLSearchParams(rawQuery)` and strict regex `/^[1-9][0-9]*$/`, and split `try/catch` around store calls after `eslint` (`@typescript-eslint/return-await`) flagged unawaited `sendProblem` returns inside a `try` block. Fastify's default parser allowed `page=01`, `page=1.0`, and duplicate `?page=1&page=2` without error. Recorded this failure mode in `AGENTS.md` (`Never` section).
Rejected: Reading `.env` tokens directly inside `src/app.ts` at module import time; moved environment token loading exclusively to `src/server.ts` so tests can inject isolated ephemeral tokens per run.
By hand: Verified error response headers (`WWW-Authenticate: Bearer` on `401`, `application/problem+json` on all `4xx`/`5xx`, `Cache-Control: no-store` on `200`).

## 2026-11-11 — Contract test suite and deliberate contract break (PA#2)

Tool: Antigravity (Gemini)
Asked for: Write Vitest contract tests in `test/review-queue.contract.test.ts` using `fastify.inject()` covering all error types, verification order, class isolation, tie-breaking order, and pagination edges.
Kept: The 5-part test suite structure and `assertProblemDetails` helper checking `type`, `title`, `status`, `detail`, `instance`, and verifying no stack trace or internal DB string leaks on `500 internal-error`.
Changed: Added explicit precedence tests sending requests that simultaneously violate multiple rules (e.g., missing token + bad UUID + `page=0`) to prove the server halts at the exact step dictated by the contract.
Rejected: Mocking the route handler or bypassing authentication middleware in pagination tests; every test goes through the full HTTP injection pipeline with 4 distinct test principals (`taClassA`, `taClassB`, `student`, `admin`).
By hand: Executed the deliberate contract break (changing `DEFAULT_PAGE_SIZE` from `20` to `21` in `src/app.ts` without touching tests or contract) to confirm CI fails red and then restored `20` to turn CI green.
