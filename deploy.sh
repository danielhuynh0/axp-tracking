#!/usr/bin/env bash
# Usage: AXP_PASSPHRASE=... ./deploy.sh [stack-name] [region]
set -euo pipefail

# Load KEY=VALUE pairs from .env (variables already set in the shell win)
ENV_FILE="$(dirname "$0")/.env"
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*[^[:space:]])?[[:space:]]*$ ]] || continue
    name="${BASH_REMATCH[1]}"; value="${BASH_REMATCH[2]:-}"
    [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]] && value="${BASH_REMATCH[1]}"
    [[ -z "${!name:-}" ]] && export "$name=$value"
  done < "$ENV_FILE"
fi

STACK="${1:-axp-tracker}"
REGION="${2:-${AWS_REGION:-us-east-1}}"
: "${AXP_PASSPHRASE:?Set AXP_PASSPHRASE (min 8 chars)}"

cd "$(dirname "$0")"

echo "==> Building and deploying stack $STACK ($REGION)"
(cd api && npm install && npm run typecheck && npm test && npm run build)
sam deploy \
  --stack-name "$STACK" \
  --region "$REGION" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "AppPassphrase=$AXP_PASSPHRASE"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
API_URL="$(output ApiUrl)"
BUCKET="$(output WebBucketName)"
DIST_ID="$(output DistributionId)"
WEB_URL="$(output WebUrl)"

echo "==> Building web app"
(cd web && npm install && npm run build)
printf '{ "apiUrl": "%s" }\n' "$API_URL" > web/dist/config.json

echo "==> Uploading to s3://$BUCKET"
aws s3 sync web/dist "s3://$BUCKET" --delete --region "$REGION"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "==> Done"
echo "Web: $WEB_URL"
echo "API: $API_URL"
