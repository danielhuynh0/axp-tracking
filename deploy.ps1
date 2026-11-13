# Usage: $env:AXP_PASSPHRASE = '...'; .\deploy.ps1 [-Stack axp-tracker] [-Region us-east-1]
param(
  [string]$Stack = "axp-tracker",
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" })
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "scripts/load-env.ps1")
if (-not $PSBoundParameters.ContainsKey("Region") -and $env:AWS_REGION) { $Region = $env:AWS_REGION }

if (-not $env:AXP_PASSPHRASE) { throw "Set `$env:AXP_PASSPHRASE (min 8 chars)" }

function Invoke-Step([scriptblock]$Block) {
  & $Block
  if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE" }
}

Set-Location $PSScriptRoot

Write-Host "==> Building and deploying stack $Stack ($Region)"
Push-Location api; Invoke-Step { npm install }; Invoke-Step { npm run typecheck }; Invoke-Step { npm test }; Invoke-Step { npm run build }; Pop-Location
Invoke-Step {
  sam deploy --stack-name $Stack --region $Region --resolve-s3 `
    --capabilities CAPABILITY_IAM --no-confirm-changeset --no-fail-on-empty-changeset `
    --parameter-overrides "AppPassphrase=$env:AXP_PASSPHRASE"
}

function Get-Output([string]$Key) {
  aws cloudformation describe-stacks --stack-name $Stack --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='$Key'].OutputValue" --output text
}
$ApiUrl = Get-Output ApiUrl
$Bucket = Get-Output WebBucketName
$DistId = Get-Output DistributionId
$WebUrl = Get-Output WebUrl

Write-Host "==> Building web app"
Push-Location web; Invoke-Step { npm install }; Invoke-Step { npm run build }; Pop-Location
Set-Content -Path web/dist/config.json -Value "{ `"apiUrl`": `"$ApiUrl`" }" -Encoding ascii

Write-Host "==> Uploading to s3://$Bucket"
Invoke-Step { aws s3 sync web/dist "s3://$Bucket" --delete --region $Region }
# Hashed assets can be cached forever, but browsers must revalidate these so new deploys show up
foreach ($file in "index.html", "config.json") {
  Invoke-Step { aws s3 cp "web/dist/$file" "s3://$Bucket/$file" --cache-control "no-cache" --region $Region }
}
Invoke-Step { aws cloudfront create-invalidation --distribution-id $DistId --paths "/*" | Out-Null }

Write-Host "==> Done"
Write-Host "Web: $WebUrl"
Write-Host "API: $ApiUrl"
