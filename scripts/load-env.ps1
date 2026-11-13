# Dot-source to load KEY=VALUE pairs from the repo's .env (variables already set in the shell win)
$EnvFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $EnvFile) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
      $name = $Matches[1]; $value = $Matches[2] -replace '^(["''])(.*)\1$', '$2'
      if (-not [Environment]::GetEnvironmentVariable($name)) { Set-Item "env:$name" $value }
    }
  }
}
