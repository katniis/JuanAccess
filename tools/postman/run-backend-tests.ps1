param(
   [string]$Collection = "$PSScriptRoot\backend.postman_collection.json",
   [string]$Environment = "$PSScriptRoot\backend.postman_environment.example.json",
   [string]$OutputDirectory = "$PSScriptRoot\..\..\docs\test-runs"
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDirectory = Join-Path $OutputDirectory "backend-postman-$stamp"
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null

$consoleLog = Join-Path $runDirectory 'console.log'

postman collection run $Collection `
   --environment $Environment `
   --verbose `
   --disable-unicode `
   --no-report-events `
   2>&1 | Tee-Object -FilePath $consoleLog

$exitCode = $LASTEXITCODE
@"
# Backend Postman run: $stamp

- Collection: `$Collection`
- Environment: `$Environment`
- Exit code: `$exitCode`
- Console I/O log: `console.log`

The console log contains `[IO]` records with request inputs and response outputs. Full synthetic bodies are enabled only when `io_log_mode=full`; secrets are always redacted.
"@ | Set-Content (Join-Path $runDirectory 'summary.md') -Encoding utf8
exit $exitCode
