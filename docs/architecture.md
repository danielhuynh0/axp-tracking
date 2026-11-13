# Architecture and extension boundaries

## Stable platform

- React/Vite produces static files for private S3 behind CloudFront OAC.
- Cognito Lite with classic hosted UI provides invite-only sign-in. The browser
  is a public client with code flow + PKCE; there is no client secret.
- Tokens and PKCE state use sessionStorage. Sessions expire after an hour;
  the UI asks the user to sign in again rather than hiding failed saves. No silent
  refresh is implemented at this checkpoint. No passwords enter Lambda.
- HTTP API requires a Cognito JWT and `axp/access` scope on every defined route.
  CORS allows only the CloudFront origin and, in dev only, localhost:5173.
- Lambda accepts identity only from API Gateway's authorizer context, checks
  `token_use=access`, and never accepts a user ID supplied by the browser.
- One DynamoDB table uses on-demand capacity. Preferences use
  `PK=USER#<Cognito sub>`, `SK=PREFERENCES`. These are platform records, not a
  commitment to any future project/task/entry key layout.
- Updates use conditional writes and an expected version. Reads are strongly
  consistent. A 409 response requires reloading before a subsequent edit.
- Structured errors contain a request ID. Internal errors do not disclose
  credentials, request bodies, or user data. API and Lambda logs expire in 14 days.
- No VPC, NAT gateway, provisioned Lambda concurrency, or scheduled warmers.

## API at this checkpoint

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/me` | Returns the authenticated Cognito subject |
| GET | `/preferences` | Reads the user's preferences; defaults are returned without creating a row |
| PUT | `/preferences` | Saves displayName, timeZone, expectedVersion with concurrency checks |

The response DTO contains displayName, timeZone, version, and updatedAt. Clients
do not see storage keys. Missing preferences have version 0. Unexpected fields
are rejected. The API does not expose generic JSON storage or unrestricted CRUD.

## Business logic intentionally left open

The previous application's hierarchy and weight algorithm are reference material,
not requirements for this platform. Before implementing the domain, decide:

1. Whether hours attach to projects, tasks, activities, days, weeks, or another unit.
2. Where category defaults live and how per-entry overrides work.
3. Whether percentages, relative weights, or explicit category hours are entered.
4. Precision, rounding, tie-breaking, and validation rules.
5. Whether changing defaults can recalculate historical records, and how the user
   reviews such changes.
6. The distinction between recorded, reported, and officially approved experience.
7. Reporting semantics for weeks that cross month boundaries.

Once decided, put pure calculations and invariants in `packages/domain/`.
Application services should invoke that package, not embed allocation rules in
HTTP routing or DynamoDB adapters. The frontend may reuse pure rules for previews,
but Lambda must validate and calculate authoritative results.

Use stable IDs and schema versions on persisted domain records. If allocation
rules need historical reproducibility, save the policy version and input snapshot
alongside its output. This is a future domain design, not an implemented allocation
engine. Avoid speculative abstractions before the requirements are known.

## Deployment and operational boundaries

SAM provisions the backend and frontend infrastructure, but does not publish the
React build by itself. See aws-setup.md. Development and production use separate
stacks, user pools, and tables. Production excludes localhost, enables DynamoDB
PITR and deletion protection, and retains persistent resources on deletion.

Table, user pool, and website bucket are retained in both environments. Deleting a
stack therefore does not remove them or stop all storage costs. Cleanup must be
deliberate. Account deletion and data erasure are future application capabilities.

The Lambda error alarm is provisioned without notification recipients; it is not
an active paging setup. Set alert destinations and an AWS budget before production.
Caught application 500s are visible in API logs; expand operational alerts before
real users rely on the app. Backups need a restore drill at the deployment stage.

CloudFront rewrites only `/` and `/auth/callback` to index.html. Add each future
SPA route family when introducing routing; missing assets must remain errors.
Use cache headers on uploads and invalidate entry documents after releases.

## Validation boundaries

Handler tests use an in-memory repository to verify application behavior and
ownership. They do not prove deployed Cognito, IAM, CORS, or DynamoDB behavior.
Infrastructure tests check YAML syntax and critical properties. CI also runs SAM
lint validation and build. A development-account smoke test is required for the
next checkpoint. There is no production authentication bypass or fake user mode.
