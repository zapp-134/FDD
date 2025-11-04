<#
run-smoke.ps1
Automated smoke script for backend (development only).

What it does:
 - builds the backend (tsc)
 - starts the backend server in background (node dist/ingest.js)
 - waits for server to be listening on configured PORT (default 3001)
 - posts a sample CSV to /api/ingest
 - polls job status until 'completed' or 'failed'
 - stops the server process

Usage (PowerShell):
  Set-Location -Path "d:\FDD\backend"
  ./scripts/run-smoke.ps1 -SamplePath "..\public\samples\sample_financial_data.csv" -ForceSimulate

Parameters:
 -SamplePath: path to a sample file to upload (relative to backend folder)
 -ForceSimulate: switch to set FORCE_SIMULATE_GEMINI_TRANSIENTS=true for deterministic transient
 -UseMock: switch to set USE_ML_CLIENT_MOCK=true to avoid calling external ML service
#>
param(
  [string]$SamplePath = "..\public\samples\sample_financial_data.csv",
  [int]$Port = 3001,
  [int]$PollIntervalSec = 1,
  [int]$TimeoutSec = 120,
  [switch]$ForceSimulate,
  [switch]$UseMock
)

# Build
Write-Host "Building backend..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# Start server
$env:PORT = $Port
if ($ForceSimulate) { $env:FORCE_SIMULATE_GEMINI_TRANSIENTS = 'true' }
if ($UseMock) { $env:USE_ML_CLIENT_MOCK = 'true' }
$env:LLM_PROVIDER = $env:LLM_PROVIDER -or 'gemini'
$env:GEMINI_API_KEY = $env:GEMINI_API_KEY -or 'test-key'

Write-Host "Starting backend server (background)..."
$startInfo = @{ FilePath = 'node'; ArgumentList = 'dist/ingest.js'; RedirectStandardOutput = $true; RedirectStandardError = $true }
$proc = Start-Process @startInfo -PassThru
Start-Sleep -Milliseconds 500

# Wait for server to be up
$end = (Get-Date).AddSeconds($TimeoutSec)
$up = $false
while ((Get-Date) -lt $end) {
  try {
    $r = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue
    if ($r.TcpTestSucceeded) { $up = $true; break }
  } catch { }
  Start-Sleep -Seconds 1
}
if (-not $up) {
  Write-Host "Server failed to start within timeout. Killing process..."
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  throw "Server did not start"
}
Write-Host "Server listening on http://localhost:$Port"

# Post sample file
$fullPath = Join-Path -Path (Resolve-Path ..\) -ChildPath $SamplePath
if (-not (Test-Path $SamplePath)) {
  Write-Host "Sample file not found at $SamplePath"; Stop-Process -Id $proc.Id -Force; throw "Sample not found" }
Write-Host "Posting sample file: $SamplePath"
try {
  $form = @{ files = Get-Item $SamplePath }
  $resp = Invoke-RestMethod -Uri "http://localhost:$Port/api/ingest" -Method Post -Form $form -ErrorAction Stop
} catch {
  Write-Host "Upload failed: $_"; Stop-Process -Id $proc.Id -Force; throw $_
}
if (-not $resp.jobId) { Write-Host "No jobId in response: $($resp|ConvertTo-Json -Depth 2)"; Stop-Process -Id $proc.Id -Force; throw "No jobId" }
$jobId = $resp.jobId
Write-Host "Created job: $jobId"

# Poll job
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds $PollIntervalSec
  try {
    $j = Invoke-RestMethod -Uri "http://localhost:$Port/api/jobs/$jobId" -Method Get -ErrorAction Stop
  } catch {
    Write-Host "Failed to query job status: $_"; continue
  }
  Write-Host "Job status: $($j.status) progress=$($j.progress)"
  if ($j.status -eq 'completed' -or $j.status -eq 'failed') { break }
}

# Stop server
Write-Host "Stopping server (pid=$($proc.Id))"
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue

Write-Host "Final job state:"; $j | ConvertTo-Json -Depth 5
if ($j.status -eq 'completed') { Write-Host "Smoke test succeeded"; exit 0 } else { Write-Host "Smoke test failed"; exit 2 }
