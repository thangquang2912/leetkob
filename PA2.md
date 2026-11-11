# PA#2 — Harness and Quality Gate Submission Links

- **Public GitHub Repository**: [https://github.com/thangquang2912/leetkob](https://github.com/thangquang2912/leetkob)
- **Endpoint Contract Specification**: [`docs/contract/review-queue.md`](./docs/contract/review-queue.md)
- **Contract Test Suite**: [`test/review-queue.contract.test.ts`](./test/review-queue.contract.test.ts)
- **Assistant Rules File**: [`AGENTS.md`](./AGENTS.md)
- **AI Usage Log**: [`AI-LOG.md`](./AI-LOG.md)
- **Self-Assessment Report**: [`SELF_ASSESSMENT_REPORT.md`](./SELF_ASSESSMENT_REPORT.md)

---

## 1. Protected `main` Branch Settings

- **Protected-branch settings (`main` requires PR + all 4 status checks `lint`, `format`, `typecheck`, `tests` + administrators included)**:
  - Screenshot in repository: [`docs/evidence/branch-protection.png`](./docs/evidence/branch-protection.png)

---

## 2. Gate Bites Proof #1 — Blocked PR & Commit That Turned It Green

- **Pull Request #1 stopped by a red check**: [https://github.com/thangquang2912/leetkob/pull/1](https://github.com/thangquang2912/leetkob/pull/1)
- **Red Commit (`fb965d1`)**: [https://github.com/thangquang2912/leetkob/commit/fb965d1](https://github.com/thangquang2912/leetkob/commit/fb965d1)
- **Red CI Run (failed `format` check blocking merge)**: [https://github.com/thangquang2912/leetkob/actions/runs/42946184575/job/130279449252?pr=1](https://github.com/thangquang2912/leetkob/actions/runs/42946184575/job/130279449252?pr=1)
- **Blocked Merge Screenshot**: [`docs/evidence/blocked-pr.png`](./docs/evidence/blocked-pr.png)
- **Commit that fixed the failure and turned PR #1 green (`5241559`)**: [https://github.com/thangquang2912/leetkob/commit/5241559bda22e973dbce4ab61a96f462da08fc72](https://github.com/thangquang2912/leetkob/commit/5241559bda22e973dbce4ab61a96f462da08fc72)
- **Green CI Run on PR #1**: [https://github.com/thangquang2912/leetkob/actions/runs/42946692986/job/130281093643?pr=1](https://github.com/thangquang2912/leetkob/actions/runs/42946692986/job/130281093643?pr=1)

---

## 3. Gate Bites Proof #2 — Deliberate Contract Break Caught by CI

- **Pull Request #2**: [https://github.com/thangquang2912/leetkob/pull/2](https://github.com/thangquang2912/leetkob/pull/2)
- **Deliberate Contract Break Commit (`9a7f156`)** (changed `DEFAULT_PAGE_SIZE` from `20` to `21` in `src/app.ts` while leaving `docs/contract/review-queue.md` and `test/review-queue.contract.test.ts` untouched): [https://github.com/thangquang2912/leetkob/commit/9a7f1567a25979e23a10142509260953d9e453d1](https://github.com/thangquang2912/leetkob/commit/9a7f1567a25979e23a10142509260953d9e453d1)
- **Red CI Run where `tests` failed on contract violation**: [https://github.com/thangquang2912/leetkob/actions/runs/42947353221/job/130283226769?pr=2](https://github.com/thangquang2912/leetkob/actions/runs/42947353221/job/130283226769?pr=2)
- **Restore Commit on PR #2** (restored `DEFAULT_PAGE_SIZE = 20` in `src/app.ts` and turned CI green): see the second commit on [PR #2](https://github.com/thangquang2912/leetkob/pull/2/commits)

---

## 4. CI Run for Submitted Tag `pa2`

- **CI Runs Filtered by Tag `pa2`**: [https://github.com/thangquang2912/leetkob/actions?query=branch%3Apa2](https://github.com/thangquang2912/leetkob/actions?query=branch%3Apa2)
- **All Workflow Runs**: [https://github.com/thangquang2912/leetkob/actions](https://github.com/thangquang2912/leetkob/actions)
- **Tag `pa2` Tree**: [https://github.com/thangquang2912/leetkob/tree/pa2](https://github.com/thangquang2912/leetkob/tree/pa2)
