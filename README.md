# AXP platform

A React SPA and a small, authenticated serverless API for a personal AXP journal.
The existing `axp-tracker/` directory is a read-only reference. None of the new
workspace commands include it. There is no production data to migrate.

## Checkpoint 1: platform foundation

The first checkpoint is a buildable platform with an authenticated preferences
slice: Cognito login → HTTP API → Lambda → user-scoped DynamoDB → React. The
domain model for hours, tasks, projects, and allocation is intentionally deferred.
Local automated checks cover the handler and contracts; a real AWS deployment is
the next checkpoint and is required to verify the hosted login and persistence.

```text
apps/web/             React, Vite, Cognito PKCE, typed API client
apps/api/             Lambda handler, application routes, DynamoDB adapter
packages/contracts/   Platform DTOs and input validation
infra/template.yaml   SAM + CloudFormation infrastructure
scripts/              Local build and infrastructure checks
docs/                 Decisions, checkpoints, and AWS setup
axp-tracker/          Existing reference application; do not modify
```

## Local development

Install Node.js 24 LTS, then run these commands from the repository root:

```sh
npm ci
npm run check
npm run dev
```

Open **http://localhost:5173**. Before AWS configuration exists, the page shows
an honest disconnected state; it does not simulate a login or save fake data.
After the development stack is deployed, copy `apps/web/.env.example` to
`apps/web/.env.local` and fill in its four public stack outputs. Restart Vite.
The localhost callback is registered only in the development stack.

`npm run check` runs type checking, tests, and both production builds. The Lambda
bundle includes its AWS SDK dependencies. React output is `apps/web/dist/` and
Lambda output is `apps/api/dist/`. Build artifacts are ignored by Git.

This workspace initially had no runnable Node.js or SAM CLI. A portable Node 24
runtime was downloaded into ignored `.tools/` for local validation. This is not a
project dependency: an ordinary Node 24 installation is enough on other machines.

## Deploying later

**SAM already deploys the infrastructure and Lambda code through CloudFormation.**
The infrastructure is not intended to be created manually in the console.
Frontend build/configuration, S3 upload, and CloudFront invalidation are separate
steps. A later deployment script can orchestrate all of these with SAM.

See [AWS setup](docs/aws-setup.md) for the deployment sequence and credentials
needed. Do not put AWS keys in this repository or in frontend environment values.
No AWS resources have been created by this checkpoint.

## Adding the AXP domain

See [architecture decisions](docs/architecture.md). Add the agreed domain rules
in a new `packages/domain/` package and connect them through application services
and repository methods. Infrastructure, login, errors, and account ownership
should not need to change when allocation policies change.

Checkpoint details and the suggested commit message are recorded in
[checkpoints](docs/checkpoints.md).
