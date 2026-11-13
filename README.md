# AXP Tracker

Weekly NCARB AXP hour logging and reporting.

- `web/` — Vite + React app, served from a private S3 bucket through CloudFront
- `api/` — single Lambda behind an API Gateway HTTP API
- `template.yaml` — SAM template (DynamoDB, Lambda, HTTP API, S3, CloudFront)

## Prerequisites

- Node.js 20+
- AWS CLI v2, configured (`aws configure`)
- AWS SAM CLI

## Deploy

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

## Local web dev

```bash
cd web && npm install && npm run dev
```

Edit `web/public/config.json` to point `apiUrl` at the deployed API (`http://localhost:5173` is allowed by CORS).
