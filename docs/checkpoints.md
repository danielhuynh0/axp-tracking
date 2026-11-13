# Implementation checkpoints

## 1 — Locally validated platform foundation

Status: completed locally; not deployed to AWS.

Scope: isolated replacement workspace, React shell, Cognito PKCE wiring, a typed
authenticated preferences API, DynamoDB adapter, SAM infrastructure, tests, and
setup documentation. This checkpoint does not include an AWS deployment or AXP
allocation functionality. `axp-tracker/` remains unchanged.

Verification: TypeScript checking, 12 automated tests, the bundled Lambda build,
and the production React build passed. Tests cover authentication, scope checks,
account isolation, request validation, concurrency conflicts, DynamoDB command
boundaries, and selected infrastructure invariants. Dependency installation
reported zero known vulnerabilities at the time of validation.

Limits: browser access was unavailable, so visual verification was not performed.
SAM CLI was not installed, so local SAM lint/build was not run. The added GitHub
workflow runs those checks when pushed, but has not been executed in this session.
Real Cognito, IAM, CORS, and DynamoDB integration await checkpoint 2.

Suggested commit message:

`Build the serverless platform foundation with React, Cognito, SAM, and user-scoped persistence.`

## 2 — Verified development deployment (pending)

Connect to the chosen AWS account using a local profile, install/validate SAM,
deploy the dev stack, publish the frontend, create the initial user, and complete
the real authentication/persistence smoke tests in aws-setup.md. Add the deployment
orchestration script when requested. Summarize results and provide a commit-message
sentence at this checkpoint.

## 3 — AXP domain integration (pending business decisions)

Agree the hours/entity/allocation rules, implement them behind the domain boundary,
and wire the actual logging workflow into the platform. Preserve the verified
authentication, ownership, storage, and deployment conventions. Summarize results
and provide a commit-message sentence at this checkpoint.
