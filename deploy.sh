#!/usr/bin/env bash
# Usage: AXP_PASSPHRASE=... ./deploy.sh [stack-name] [region]
set -euo pipefail

source "$(dirname "$0")/scripts/load-env.sh"

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
# Hashed assets can be cached forever, but browsers must revalidate these so new deploys show up
for file in index.html config.json; do
  aws s3 cp "web/dist/$file" "s3://$BUCKET/$file" --cache-control "no-cache" --region "$REGION"
done
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null

echo "==> Done"
echo "Web: $WEB_URL"
echo "API: $API_URL"
