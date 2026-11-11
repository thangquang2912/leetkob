# LeeTKOB — C++ Lab Constraint Review & Grading Harness

CSC13114 · Class Project (`PA#2` — Harness and Quality Gate)

LeeTKOB assists C++ programming lab teaching assistants (TAs) by checking `Accepted` student submissions against structural hard rules and semantic LLM constraints, routing every `violation`, every `unsure` verdict, and a random 10% sample of `pass` verdicts into the TA's human-gated review queue before marks are published.

---

## 1. Requirements & One-Command Quality Checks

- **Pinned Node.js version**: **Node.js 24 LTS** (`.nvmrc` pinned to `24`, `engines.node` set to `>=24.0.0 <25.0.0`).
- **Install dependencies from lockfile**:

```bash
npm ci
```

- **Run the four required quality gate checks** (identical locally and in `.github/workflows/ci.yml`):

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
```

All four commands run once and exit with status code `0` on a clean checkout.

---

## 2. Assistant Permissions (Three-Tier Policy)

Our team enforces a strict three-tier permission boundary for AI coding assistants (referenced from [`AGENTS.md`](./AGENTS.md)):

| Tier          | Scope                             | What the assistant may / may not do                                                                                                                                                                                                                                                                                                                                       |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Allowed**   | Read & local task edits           | Read repository files; create or edit source files, contract docs, and tests within the assigned task scope; run `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm test` locally.                                                                                                                                                                     |
| **Ask first** | Dependencies, CI & external calls | Add, remove, or upgrade packages in `package.json`; modify `.github/workflows/ci.yml` or repository/branch protection settings; make any network call to external or paid APIs; run `git push` or tag releases.                                                                                                                                                           |
| **Never**     | Secrets, sandbox & test integrity | **Never** commit `.env` or real secrets/tokens to Git history or logs; **never** pass model API keys (`GEMINI_API_KEY`) into the C++ execution sandbox; **never** call a live LLM in unit or contract tests; **never** edit tests, eval data, or ground-truth labels just to make a check pass; **never** bypass required checks (`--no-verify` or force-push to `main`). |

---

## 3. Environment Variables, Secrets & Model Spending Cap

### Environment Variables (`.env.example`)

Copy `.env.example` to `.env` for local demo runs (`.env` is git-ignored):

```bash
cp .env.example .env
```

All variables in [`.env.example`](./.env.example) are committed without values. No live API key, password, or bearer token is stored anywhere in the working tree or Git history.

### Model Provider, Spending Cap & Cost per Lab

- **Model provider & model**: Google Gemini API — `gemini-2.5-flash` (configured via `GEMINI_API_KEY` and `GEMINI_MODEL` from PA#3 onwards).
- **Project isolation & spending cap**: We use a dedicated Gemini API project for LeeTKOB with a monthly spending cap of **$5.00 USD / month** (and per-lab budget guardrails via `LAB_COST_CAP_USD`). Screenshot evidence of the configured cap is recorded in `docs/evidence/` and [`PA2.md`](./PA2.md).
- **Estimated cost per lab (80 submissions)**: Calling `gemini-2.5-flash` on ~80 `Accepted` C++ submissions (~1,200 input tokens and ~250 output tokens per submission after hard-rule filtering) costs approximately **$0.02–$0.04 USD per lab**.
- **PA#2 model cost**: **$0.00 USD**. In PA#2, both local checks and GitHub Actions CI run strictly against deterministic in-memory seed data with zero external model calls.

---

## 4. Endpoint Contract & Architecture

- **Authoritative Contract**: [`docs/contract/review-queue.md`](./docs/contract/review-queue.md) specifies `GET /labs/{labId}/review-queue` (and `/v1/labs/{labId}/review-queue`), including role & class-ownership isolation, query bounds, deterministic tie-breaking pagination (`queuedAt` ascending, then `reviewId` ascending), RFC 9457 Problem Details error catalog, and versioning policy.
- **Contract Tests**: [`test/review-queue.contract.test.ts`](./test/review-queue.contract.test.ts) verifies every status/problem `type`, class isolation (`404 lab-not-found` when a TA accesses another class's lab), verification order precedence, pagination boundaries, and controlled `500 internal-error` handling via `fastify.inject()`.
