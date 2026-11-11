# Self-assessment — PA#2 (Harness and quality gate)

Submitted by:

- 23120353 — Trà Nguyễn Quang Thắng
- 23120394 — Nguyễn Anh Tuấn
- 23120396 — Phạm Quang Tuấn

Total I claim: 100 / 100

| Criterion                               | Max | I claim | Evidence                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | --: | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Rules file                           |  15 |      15 | [`AGENTS.md`](./AGENTS.md) — short, four sections (`Stack`, `Commands`, `Conventions`, `Never`), product-specific `Never` rules (no secret in C++ sandbox, no live model in unit tests, never edit test/eval/label to pass), and 2 rules traced to real failures in [`AI-LOG.md`](./AI-LOG.md) (Entries #1 and #3).                |
| 2. Permissions and secrets              |  10 |      10 | [`README.md`](./README.md) §2 & §3 defines the 3-tier permissions (`Allowed`, `Ask first`, `Never`) and Gemini spending cap ($5/month, PA#2 cost $0); [`.env.example`](./.env.example) lists all variables without values; [`.gitignore`](./.gitignore) ignores `.env`; zero secrets in working tree or Git history.               |
| 3. One command for every check          |  10 |      10 | [`package.json`](./package.json), [`README.md`](./README.md) §1, and [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) run the exact same 4 commands on Node 24 LTS after `npm ci`: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`.                                                                |
| 4. CI that blocks a merge               |  20 |      20 | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) + protected `main` branch requiring PR and all 4 checks (`lint`, `format`, `typecheck`, `tests`). Evidence of blocked red PR and commit that turned it green linked in [`PA2.md`](./PA2.md) §1–§2.                                                                        |
| 5. The contract of one LeeTKOB endpoint |  25 |      25 | [`docs/contract/review-queue.md`](./docs/contract/review-queue.md) — follows IA#3 `CONTRACT.md` sections, specifies role (`ta` only) & class ownership isolation, field & query rules, deterministic pagination (`queuedAt` asc, `reviewId` asc), all 6 RFC 9457 error types & verification order, and versioning policy.          |
| 6. Contract tests that bite             |  15 |      15 | [`test/review-queue.contract.test.ts`](./test/review-queue.contract.test.ts) — 27 contract test cases covering every error `type`, verification precedence, cross-class `404 lab-not-found`, tie-breaking pagination, and `500 internal-error`. Deliberate contract break commit and red CI run linked in [`PA2.md`](./PA2.md) §3. |
| 7. `AI-LOG.md`                          |   5 |       5 | [`AI-LOG.md`](./AI-LOG.md) — lists tools per task with concrete `Kept`, `Changed`, `Rejected`, and `By hand` entries explaining real bugs caught (CI `paths-ignore`/`continue-on-error`, Fastify query coercion, cross-class `404` vs `403`).                                                                                      |

## What we did not manage

We completed all required deliverables for PA#2 (the assistant rules, three-tier permissions, four-check CI harness, protected `main` branch, `GET /labs/{labId}/review-queue` contract, contract tests, and deliberate break proofs). In PA#2 the review queue store is backed by an in-memory seed store (`src/store.ts`) rather than a persistent database, as database persistence, C++ sandbox execution, and live Gemini constraint checking are scheduled for PA#3.

## What we would do differently

We would define the raw query string validation rules before writing the route handler, rather than initially relying on framework-level query parsing and discovering during edge-case testing that duplicate query parameters (`?page=1&page=2`) and leading zeroes (`page=01`) were silently coerced.
