# PA#2 — Harness and Quality Gate Submission Links

- **Public GitHub Repository**: [https://github.com/thangquang2912/leetkob](https://github.com/thangquang2912/leetkob)
- **Endpoint Contract Specification**: [`docs/contract/review-queue.md`](./docs/contract/review-queue.md)
- **Contract Test Suite**: [`test/review-queue.contract.test.ts`](./test/review-queue.contract.test.ts)
- **Assistant Rules File**: [`AGENTS.md`](./AGENTS.md)
- **AI Usage Log**: [`AI-LOG.md`](./AI-LOG.md)
- **Self-Assessment Report**: [`SELF_ASSESSMENT_REPORT.md`](./SELF_ASSESSMENT_REPORT.md)

---

## 1. Protected `main` Branch Settings & Spending Cap Evidence

- **Protected-branch settings (`main` requires PR + all 4 status checks `lint`, `format`, `typecheck`, `tests` + administrators included)**:
  - Screenshot: `docs/evidence/branch-protection.png` _(see repository `docs/evidence/` or link below)_
- **Model API Spending Cap ($5.00 / month cap on dedicated Gemini project)**:
  - Screenshot: `docs/evidence/spending-cap.png`

---

## 2. Gate Bites Proof #1 — Blocked PR & Commit That Turned It Green

- **Pull Request stopped by a red check**: `<TODO: Paste PR #1 URL here>`
- **Red CI Run (failed check blocking merge)**: `<TODO: Paste failing CI run URL here>`
- **Blocked Merge Screenshot**: `docs/evidence/blocked-pr.png`
- **Commit that fixed the failure and turned the PR green**: `<TODO: Paste fixing commit SHA / URL here>`
- **Green CI Run on the PR**: `<TODO: Paste green CI run URL here>`

---

## 3. Gate Bites Proof #2 — Deliberate Contract Break Caught by CI

- **Pull Request / Branch**: `<TODO: Paste PR #2 URL here>`
- **Deliberate Contract Break Commit** (changed `DEFAULT_PAGE_SIZE` from `20` to `21` in `src/app.ts` while leaving `docs/contract/review-queue.md` and `test/review-queue.contract.test.ts` untouched): `<TODO: Paste deliberate break commit SHA / URL here>`
- **Red CI Run where `tests` failed on contract violation**: `<TODO: Paste red contract-break CI run URL here>`
- **Restore Commit that fixed `src/app.ts` back to `20` and turned CI green**: `<TODO: Paste restore commit SHA / URL here>`

---

## 4. CI Run for Submitted Tag `pa2`

- **CI Runs Filtered by Tag `pa2`**: [https://github.com/thangquang2912/leetkob/actions?query=branch%3Apa2](https://github.com/thangquang2912/leetkob/actions?query=branch%3Apa2)
- **Tag `pa2` Tree**: [https://github.com/thangquang2912/leetkob/tree/pa2](https://github.com/thangquang2912/leetkob/tree/pa2)
