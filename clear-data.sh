#!/usr/bin/env bash
# Deletes ALL entries from the deployed table. Usage: ./clear-data.sh [stack-name] [region] [--force]
set -euo pipefail
source "$(dirname "$0")/scripts/load-env.sh"

STACK="${1:-axp-tracker}"
REGION="${2:-${AWS_REGION:-us-east-1}}"
FORCE="${3:-}"

TABLE="$(aws cloudformation describe-stack-resource --stack-name "$STACK" --region "$REGION" \
  --logical-resource-id EntriesTable --query StackResourceDetail.PhysicalResourceId --output text)"

# Keys are "<weekStart>#<uuid>" and PK is always "ENTRY", so tab-separated text is safe to parse
mapfile -t KEYS < <(aws dynamodb scan --table-name "$TABLE" --region "$REGION" \
  --projection-expression "PK,SK" --query "Items[].[PK.S,SK.S]" --output text | tr -d '\r' | grep -v '^None$' || true)
if [[ ${#KEYS[@]} -eq 0 ]]; then echo "Table $TABLE is already empty."; exit 0; fi

if [[ "$FORCE" != "--force" ]]; then
  read -r -p "Delete all ${#KEYS[@]} entries from $TABLE ($REGION)? Type 'delete' to confirm: " answer
  [[ "$answer" == "delete" ]] || { echo "Cancelled."; exit 1; }
fi

for ((i = 0; i < ${#KEYS[@]}; i += 25)); do
  requests=()
  for key in "${KEYS[@]:i:25}"; do
    IFS=$'\t' read -r pk sk <<<"$key"
    requests+=("{\"DeleteRequest\":{\"Key\":{\"PK\":{\"S\":\"$pk\"},\"SK\":{\"S\":\"$sk\"}}}}")
  done
  body="{\"$TABLE\":[$(IFS=,; echo "${requests[*]}")]}"
  unprocessed="$(aws dynamodb batch-write-item --region "$REGION" --request-items "$body" \
    --query "length(keys(UnprocessedItems))" --output text)"
  [[ "$unprocessed" == "0" ]] || { echo "Some deletes were throttled; run the script again" >&2; exit 1; }
done
echo "Deleted ${#KEYS[@]} entries from $TABLE."
