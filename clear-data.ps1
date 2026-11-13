# Deletes ALL entries from the deployed table. Usage: .\clear-data.ps1 [-Stack axp-tracker] [-Region us-east-1] [-Force]
param(
  [string]$Stack = "axp-tracker",
  [string]$Region,
  [switch]$Force
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "scripts/load-env.ps1")
if (-not $Region) { $Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" } }

$Table = aws cloudformation describe-stack-resource --stack-name $Stack --region $Region `
  --logical-resource-id EntriesTable --query StackResourceDetail.PhysicalResourceId --output text
if ($LASTEXITCODE -ne 0) { throw "Could not find table for stack $Stack in $Region" }

$Items = @((aws dynamodb scan --table-name $Table --region $Region --projection-expression "PK,SK" --output json | ConvertFrom-Json).Items)
if ($LASTEXITCODE -ne 0) { throw "Scan failed" }
if ($Items.Count -eq 0) { Write-Host "Table $Table is already empty."; exit 0 }

if (-not $Force) {
  $answer = Read-Host "Delete all $($Items.Count) entries from $Table ($Region)? Type 'delete' to confirm"
  if ($answer -ne "delete") { Write-Host "Cancelled."; exit 1 }
}

# batch-write-item takes up to 25 deletes; pass the request via a file to avoid PowerShell quoting issues
$TempFile = Join-Path ([IO.Path]::GetTempPath()) "axp-clear-$PID.json"
try {
  for ($i = 0; $i -lt $Items.Count; $i += 25) {
    $batch = $Items[$i..([Math]::Min($i + 24, $Items.Count - 1))] | ForEach-Object {
      @{ DeleteRequest = @{ Key = @{ PK = @{ S = $_.PK.S }; SK = @{ S = $_.SK.S } } } }
    }
    $request = @{ $Table = @($batch) } | ConvertTo-Json -Depth 10
    [IO.File]::WriteAllText($TempFile, $request)
    $result = aws dynamodb batch-write-item --region $Region --request-items "file://$TempFile" --output json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "batch-write-item failed" }
    if ($result.UnprocessedItems.PSObject.Properties.Count -gt 0) { throw "Some deletes were throttled; run the script again" }
  }
} finally {
  Remove-Item $TempFile -ErrorAction SilentlyContinue
}
Write-Host "Deleted $($Items.Count) entries from $Table."
