# AGENTS.md — LeeTKOB Assistant Operating Rules

This file defines the harness rules for coding assistants working on **LeeTKOB** (C++ lab grading pipeline and semantic constraint checker).

## Stack

- **Runtime**: Node.js 24 LTS (`>=24.0.0 <25.0.0`, ESM `"type": "module"`, `.nvmrc` pinned to `24`)
- **Language**: TypeScript 5 (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- **HTTP Framework**: Fastify 5 (`fastify.inject()` for in-process HTTP contract testing)
- **Quality Gate**: ESLint 9 (`strictTypeChecked`), Prettier 3, `tsc --noEmit`, Vitest 3, GitHub Actions CI

## Commands

Run these exact four commands locally and in CI after `npm ci`:

- `npm run lint` — static analysis (`eslint .`)
- `npm run format:check` — formatting check without mutating files (`prettier --check .`)
- `npm run typecheck` — TypeScript compiler check (`tsc --noEmit`)
- `npm test` — single-run test execution (`vitest run`)

## Conventions

- **Permissions**: Follow the three-tier assistant permission model documented in `README.md` (`Allowed`, `Ask first`, `Never`).
- **Contract-first**: `docs/contract/review-queue.md` is the source of truth. Any HTTP `4xx` or `5xx` response must be an RFC 9457 Problem Details object (`application/problem+json`) with stable `type` URI (`https://leetkob.example/problems/<slug>`), `title`, `status`, `detail`, and `instance`.
- **Verification order**: Always check requests in exact contract order: `401 unauthenticated` (`WWW-Authenticate: Bearer`) → `403 role-forbidden` → `400 invalid-lab-id` → `404 lab-not-found` (both unknown lab and cross-class TA access) → `400 invalid-pagination` → `500 internal-error`.
- **Deterministic paging**: Sort pending review items by `queuedAt` ascending, then `reviewId` ascending to break timestamp ties.

## Never

- **Never expose secrets in the C++ sandbox**: Never pass `GEMINI_API_KEY` or any host secret into the C++ compilation/execution sandbox environment variables, mounts, or logs.
- **Never call a live LLM in unit or contract tests**: Unit and contract tests (`npm test`) must be 100% deterministic, offline, and zero-cost, using injected stores or fixtures.
- **Never edit a test, eval dataset, or ground-truth label to make a failing check pass**: Fix the implementation, or update the contract in a separate, explicitly justified commit.
- **Never rely on Fastify's default query coercion for pagination parameters** _(traced to `AI-LOG.md` Entry #2)_: Fastify's default query parser silently coerces types and turns duplicate parameters (`?page=1&page=2`) into arrays or accepts leading-zero/float strings when passed to `Number()`. Always parse raw `URLSearchParams` and reject duplicate, unknown, or non-`^[1-9][0-9]*$` parameters with `400 invalid-pagination`.
- **Never use `paths-ignore` or `continue-on-error` on required CI jobs** _(traced to `AI-LOG.md` Entry #1)_: Skipping `lint`, `format`, `typecheck`, or `tests` on documentation PRs leaves required GitHub status checks stuck in "Expected — Waiting for status to be reported" and blocks merges on a protected `main` branch.
