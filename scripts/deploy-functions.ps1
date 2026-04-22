# Deploy all Supabase edge functions (no project linking required).
# Fill in SUPABASE_ACCESS_TOKEN in .env.local first.
# Usage:  .\scripts\deploy-functions.ps1

$ErrorActionPreference = "Stop"
$ProjectRef = "mrsbiuasehptijcypbam"

# Load .env.local
Get-Content ".env.local" | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.+)$') {
    $k = $Matches[1].Trim(); $v = $Matches[2].Trim()
    if (-not [System.Environment]::GetEnvironmentVariable($k, "Process")) {
      [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
  }
}

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
  Write-Error "SUPABASE_ACCESS_TOKEN is not set in .env.local"
  exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $token

$fns = @(
  @{ name = "whatsapp-webhook"; noJwt = $true },
  @{ name = "send-message" },
  @{ name = "send-template" },
  @{ name = "mark-read" },
  @{ name = "fetch-templates" },
  @{ name = "test-connection" },
  @{ name = "upload-media" }
)

foreach ($fn in $fns) {
  Write-Host "Deploying $($fn.name)..." -ForegroundColor Cyan
  if ($fn.noJwt) {
    npx supabase functions deploy $fn.name --project-ref $ProjectRef --use-api --no-verify-jwt
  } else {
    npx supabase functions deploy $fn.name --project-ref $ProjectRef --use-api
  }
}

Write-Host "Setting META_GRAPH_VERSION secret..." -ForegroundColor Cyan
npx supabase secrets set META_GRAPH_VERSION=v21.0 --project-ref $ProjectRef

Write-Host "All functions deployed!" -ForegroundColor Green
