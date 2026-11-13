# Usage: $env:AXP_PASSPHRASE = '...'; .\deploy.ps1 [-Stack axp-tracker] [-Region us-east-1]
param(
  [string]$Stack = "axp-tracker",
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" })
)
$ErrorActionPreference = "Stop"

# Load KEY=VALUE pairs from .env (variables already set in the shell win)
$EnvFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $EnvFile) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $name = $Matches[1]; $value = $Matches[2] -replace '^(["''])(.*)\1$', '$2'
      if (-not [Environment]::GetEnvironmentVariable($name)) { Set-Item "env:$name" $value }
    }
  }
}
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
Invoke-Step { aws cloudfront create-invalidation --distribution-id $DistId --paths "/*" | Out-Null }

Write-Host "==> Done"
Write-Host "Web: $WebUrl"
Write-Host "API: $ApiUrl"
