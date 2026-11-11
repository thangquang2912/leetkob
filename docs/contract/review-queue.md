# LeeTKOB — Review Queue Service API Contract, version 1

CSC13114 · PA#2 Harness and Quality Gate · frozen 11 Nov 2026

This file is the authoritative specification for the teaching assistant (TA) review queue endpoint in LeeTKOB. `test/review-queue.contract.test.ts` checks the implementation against every rule in this file. If the implementation and this file disagree, the implementation is wrong. If this file needs to change, change it in a dedicated commit that explains why — never quietly.

## 1. Conventions

- Every endpoint in this contract lives under `/labs` (and is also mounted under `/v1/labs` with identical behaviour).
- Requests and responses are JSON encoded in UTF-8 (`Content-Type: application/json; charset=utf-8` on `200` responses).
- Resource identifiers (`labId`, `reviewId`, `submissionId`) are lowercase RFC 9562 / RFC 4122 UUID strings matching `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` (case-insensitive on input, normalized to lowercase in output).
- Timestamps (`queuedAt`) are ISO 8601 strings in UTC with millisecond precision, e.g. `2026-11-11T08:30:00.000Z`.
- Clients ignore response fields they do not know. For query parameters on `GET /labs/{labId}/review-queue`, the server **rejects** unknown, duplicate, or malformed query parameters with `400 invalid-pagination`.

## 2. Errors

Every response with a `4xx` or `5xx` status is an **RFC 9457 Problem Details** object (`Content-Type: application/problem+json; charset=utf-8`):

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json; charset=utf-8

{
  "type": "https://leetkob.example/problems/invalid-pagination",
  "title": "Invalid pagination parameters",
  "status": 400,
  "detail": "Query parameter 'pageSize' must be an integer from 1 to 100.",
  "instance": "/labs/11111111-1111-4111-8111-111111111111/review-queue?pageSize=101"
}
```

| Member     | Rule                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | `https://leetkob.example/problems/` followed by a slug from the table below. No other values                                                   |
| `title`    | the exact title from the table below                                                                                                           |
| `status`   | an integer equal to the HTTP status code of the response                                                                                       |
| `detail`   | one human-readable sentence about **this** occurrence. Never a stack trace, SQL query, internal table name, environment variable, or file path |
| `instance` | the request URI path (including query string if present) that produced this problem                                                            |

| Slug                 | Status | Title                         | When                                                                                                                                                                                   |
| -------------------- | -----: | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unauthenticated`    |    401 | Authentication required       | Missing `Authorization` header, scheme is not `Bearer`, token is empty, or token is unknown/expired. Response **must** include header `WWW-Authenticate: Bearer`                       |
| `role-forbidden`     |    403 | Forbidden                     | Authenticated principal is not a teaching assistant (`role !== "ta"`, e.g. `student` or `admin`)                                                                                       |
| `invalid-lab-id`     |    400 | Invalid lab ID                | Path parameter `labId` is not a valid UUID string                                                                                                                                      |
| `lab-not-found`      |    404 | Lab not found                 | No lab exists with `labId`, **or** the lab belongs to a class that the authenticated TA is not assigned to (prevents leaking the existence of other classes' labs)                     |
| `invalid-pagination` |    400 | Invalid pagination parameters | Any query parameter is not `page` or `pageSize`, appears more than once, is not a base-10 integer string, or falls outside allowed bounds (`page`: `1..1000000`, `pageSize`: `1..100`) |
| `internal-error`     |    500 | Internal server error         | Any unexpected failure while retrieving the review queue. `detail` is the fixed generic sentence `"An unexpected error occurred while retrieving the review queue."`                   |

Clients branch on `type` (and `status`), never on `title` or `detail`.

## 3. Resources

**ReviewQueueItem**

An `Accepted` C++ submission routed to the TA human gate before lab marks can be published:

```json
{
  "reviewId": "3b241101-e2bb-4255-8caf-4136c566a962",
  "submissionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "reason": "violation",
  "queuedAt": "2026-11-10T14:32:00.000Z"
}
```

| Field          | Type & Rule                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reviewId`     | UUID string — unique identifier of the pending review entry                                                                                                                                                                                         |
| `submissionId` | UUID string — identifier of the student's `Accepted` C++ submission                                                                                                                                                                                 |
| `reason`       | string enum, one of `"violation"` (hard rule or LLM flagged a constraint violation), `"unsure"` (LLM returned `unsure`, evidence line did not match verbatim, or model timed out), or `"sampled_pass"` (random 10% audit sample of `pass` verdicts) |
| `queuedAt`     | UTC ISO 8601 timestamp string (`YYYY-MM-DDTHH:mm:ss.sssZ`) when the submission entered the review queue                                                                                                                                             |

**ReviewQueuePage**

```json
{
  "items": [
    {
      "reviewId": "3b241101-e2bb-4255-8caf-4136c566a962",
      "submissionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "reason": "violation",
      "queuedAt": "2026-11-10T14:32:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "hasNext": true
}
```

| Field      | Type & Rule                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `items`    | array of `ReviewQueueItem` objects (`0` to `pageSize` elements)                                         |
| `page`     | integer (`1..1000000`) — the current 1-based page number                                                |
| `pageSize` | integer (`1..100`) — maximum items per page                                                             |
| `total`    | non-negative integer (`>= 0`) — total pending review items for this lab across all pages before slicing |
| `hasNext`  | boolean — `true` if and only if `page * pageSize < total`, otherwise `false`                            |

## 4. Endpoints

### 4.1 `GET /labs/{labId}/review-queue` (and `GET /v1/labs/{labId}/review-queue`)

Returns a paginated list of **pending** review items for `{labId}`.

#### Who may call it (Role and Ownership Rule)

- **Authentication**: Request must carry `Authorization: Bearer <token>`.
- **Role**: Only users with `role === "ta"` may call this endpoint. Users with `role === "student"` or `role === "admin"` receive `403 role-forbidden`.
- **Ownership (Class Isolation)**: Each lab belongs to one class, and each TA is assigned to one or more classes. A TA may only view the review queue of a lab belonging to a class in their `classIds`. If a TA requests a lab belonging to another class, the server responds with `404 lab-not-found` — identical to a non-existent `labId`.

#### Path and Query Parameters

| Parameter  | Location | Rule                                                           | Default  |
| ---------- | -------- | -------------------------------------------------------------- | -------- |
| `labId`    | path     | UUID string                                                    | required |
| `page`     | query    | base-10 integer string from `1` to `1000000` (`^[1-9][0-9]*$`) | `1`      |
| `pageSize` | query    | base-10 integer string from `1` to `100` (`^[1-9][0-9]*$`)     | `20`     |

- Out-of-range `page` or `pageSize` is rejected with `400 invalid-pagination`, **never** silently clamped.
- Non-integer values (e.g. `1.5`, `abc`, `NaN`, empty string, leading `+`/`-`/`0`), duplicate query parameters (e.g. `?page=1&page=2`), or unknown query parameters (e.g. `?limit=10`) are rejected with `400 invalid-pagination`.

#### Verification Order

The server checks requests **in this exact order**, and stops at the first step that fails:

1. **Authentication**: Valid `Authorization: Bearer <token>` header mapped to a known principal, else `401 unauthenticated` (with `WWW-Authenticate: Bearer`).
2. **Role Authorization**: Principal has `role === "ta"`, else `403 role-forbidden`.
3. **Path Syntax**: `labId` is a valid UUID string, else `400 invalid-lab-id`.
4. **Lab Existence & Class Ownership**: Lab with `labId` exists **and** its `classId` is in the TA's assigned `classIds`, else `404 lab-not-found`.
5. **Query Validation**: Query parameters contain only optional `page` (`1..1000000`) and `pageSize` (`1..100`) as single base-10 integer values, else `400 invalid-pagination`.
6. **Queue Retrieval**: Fetch pending items for `labId`, sort, slice, and return `200 OK` (or `500 internal-error` if the store throws).

#### Filtering, Ordering, Paging, and Side Effects

- **Pending Only**: Only items with status `"pending"` belonging to `labId` are counted in `total` and returned in `items`. Items already resolved (`"reviewed"`) or belonging to other labs are excluded.
- **Deterministic Ordering**: Items are ordered by `queuedAt` **ascending** (oldest waiting submission first). Ties with identical `queuedAt` timestamps are broken by `reviewId` **ascending** (lexicographical UUID order).
- **Slicing**: For 1-based `page` and `pageSize`, the slice starts at zero-based offset `(page - 1) * pageSize` and takes at most `pageSize` items.
- **Empty & Out-of-Range Pages**: When a lab has `0` pending items, or when `(page - 1) * pageSize >= total` (for valid `page <= 1000000`), the server returns `200 OK` with `items: []`, the true `total`, and `hasNext: false`.
- **Snapshot Semantics**: Offset pages reflect the queue at the time of each request. If new submissions enter the queue or a TA resolves an item between page fetches, later pages may shift.
- **Safe & Uncached**: `GET` does not mutate queue state or lock items, and every `200` response carries `Cache-Control: no-store`.

## 5. Versioning and Change Policy

- **Additive changes** within the current version are allowed without a version bump: adding an optional query parameter or adding a new field to `ReviewQueuePage` or `ReviewQueueItem` (clients ignore unknown fields).
- **Breaking changes** — removing or renaming a field, changing a field's type or enum values (`reason`), tightening parameter bounds, changing the sort order, or altering error `type` slugs/statuses — require publishing a new API version prefix (e.g. `/v2/labs/{labId}/review-queue`).
- When a new version is introduced, the previous version remains operational until its announced `Sunset` date and emits `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers on every response.
