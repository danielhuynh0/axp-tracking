# AXP Tracker

Weekly NCARB AXP hour logging and reporting.
Generate a PDF report based on reported hour entries in a given range of weeks.

Check it out (jk you need the password, haven't added a demo account yet): https://d21owdxrybbh5e.cloudfront.net/

- `web/` — Vite + React app, served from a private S3 bucket through CloudFront
- `api/` — single Lambda behind an API Gateway HTTP API
- `template.yaml` — SAM template (DynamoDB, Lambda, HTTP API, S3, CloudFront)

## Prerequisites

- Node.js 20+
- AWS CLI v2, configured (`aws configure`)
- AWS SAM CLI


<img width="927" height="900" alt="image" src="https://github.com/user-attachments/assets/265dcca0-eb57-4d66-bef8-5d9ad9557831" />
Adding new entries

<img width="1355" height="883" alt="image" src="https://github.com/user-attachments/assets/26d4c4ef-6a36-4bf1-a3e8-20a0699264ea" />
Generating report


## Deploy

Copy `.env.example` to `.env` and fill in `AXP_PASSPHRASE`, `AWS_PROFILE` and `AWS_REGION`.
The deploy scripts load it automatically (variables already set in your shell take precedence), so
you can just run `.\deploy.ps1` or `./deploy.sh`. Alternatively, set the variables inline:

```bash
AXP_PASSPHRASE='choose-a-passphrase' ./deploy.sh            # bash / Git Bash
```

```powershell
$env:AXP_PASSPHRASE = 'choose-a-passphrase'; .\deploy.ps1    # PowerShell
```

Optional arguments: stack name (default `axp-tracker`) and region (default `$AWS_REGION` or `us-east-1`).
The script deploys the stack, builds the web app with the stack's API URL in `config.json`,
syncs it to S3, and invalidates CloudFront. The first deploy takes ~5 minutes (CloudFront).

The DynamoDB table is retained if the stack is deleted, so data isn't lost by accident.

## Clearing data

Deletes every entry from the deployed table (asks you to type `delete` first). Uses the same `.env`.

```powershell
.\clear-data.ps1            # add -Force to skip the prompt
```

```bash
./clear-data.sh             # ./clear-data.sh axp-tracker us-west-2 --force to skip the prompt
```

## API

All routes except `/health` require `Authorization: Bearer <passphrase>`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Unauthenticated liveness check |
| GET | `/auth` | 200 if the passphrase is valid (used by the login screen) |
| GET | `/categories` | The 6 AXP categories `{ id, name }` in NCARB order |
| GET | `/entries?from=&to=` | Entries whose week is in `[from, to]` (both Sundays, `YYYY-MM-DD`) |
| POST | `/entries` | Body: `{ weekStart, hours, project, note, categories }` → 201 |
| PUT | `/entries/{id}` | Same body; `weekStart` must match the entry's week |
| DELETE | `/entries/{id}` | 204 |

Weeks start on Sunday. Hours are in 0.25 increments; category IDs are `PcM, PjM, PA, PPD, PDD, CE`.
Entries store raw hours — the equal split across categories is computed by the client.

```bash
cd api && npm install && npm test
```

## Local web dev

Two terminals:

```bash
cd api && npm run dev    # in-memory API on :3000, passphrase "dev-passphrase"
cd web && npm run dev    # http://localhost:5173
```

`web/public/config.json` points at the local API. To use the deployed API instead, set `apiUrl`
to the stack's `ApiUrl` output (`http://localhost:5173` is allowed by CORS).
