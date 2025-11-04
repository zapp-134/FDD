# LABELED_BY_TOOL
# File: scripts/smoke-test.ps1
# Inferred role: Project file — please open to see specific role
# Note: auto-generated label. Please edit the file for a more accurate description.

<#
PowerShell smoke test for the FDD project.
This script:
  - Builds and starts the docker-compose stack
  - Waits for backend health endpoint
  - Uploads sample CSV to /api/ingest
  - Polls job status until done
  - Calls /api/chat to verify retrieval

Note: building the ML image downloads large models (torch/transformers) and may take many minutes and >1GB of downloads. Run on a machine with enough bandwidth and disk.
#>

param(
    [int]$ComposeBuildTimeoutSec = 1800,
    [int]$ServiceWaitSec = 300,
    [int]$JobPollIntervalSec = 5,
    [int]$JobTimeoutSec = 600,
    [string]$SampleFile = ''
)

Write-Host "Starting smoke test: building and launching docker-compose..."

# Start docker-compose (build images)
$startInfo = @{ FilePath = 'docker'; ArgumentList = 'compose','up','--build','-d' }
$proc = Start-Process @startInfo -NoNewWindow -PassThru -Wait
if ($proc.ExitCode -ne 0) {
    Write-Error "docker compose up failed with exit code $($proc.ExitCode)"
    exit 2
}

Write-Host "Docker compose started. Waiting for backend health..."

function Wait-ForHttp200($url, $timeoutSec) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { return $true }
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

$healthUrl = 'http://localhost:3001/api/health'
if (-not (Wait-ForHttp200 $healthUrl $ServiceWaitSec)) {
    Write-Error "Backend did not become healthy within $ServiceWaitSec seconds. Check docker logs."
    exit 3
}

if ([string]::IsNullOrWhiteSpace($SampleFile)) {
    Write-Host "Backend healthy. No sample file provided; skipping automatic upload."
    Write-Host "To exercise the ingest endpoint automatically, rerun with -SampleFile <path-to-file>"
    Write-Host "Example: .\smoke-test.ps1 -SampleFile .\\public\\samples\\your_sample.csv"
    exit 0
}

# Prepare multipart upload via HttpClient
function Upload-File($url, $filePath) {
    if (-not (Test-Path $filePath)) { throw "File not found: $filePath" }
    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    $content = New-Object System.Net.Http.MultipartFormDataContent
    $fileStream = [System.IO.File]::OpenRead($filePath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/csv')
    # backend expects field name 'files' (upload.array('files'))
    $content.Add($streamContent, 'files', [System.IO.Path]::GetFileName($filePath))
    $response = $client.PostAsync($url, $content).GetAwaiter().GetResult()
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{ StatusCode = $response.StatusCode.Value__; Body = $body }
}

$ingestUrl = 'http://localhost:3001/api/ingest'
try {
    $res = Upload-File $ingestUrl $SampleFile
} catch {
    Write-Error "Upload failed: $_"
    exit 4
}

if ($res.StatusCode -ne 201) {
    Write-Error "Ingest endpoint returned status $($res.StatusCode). Body: $($res.Body)"
    exit 5
}

Write-Host "Upload succeeded. Response: $($res.Body)"

# Parse jobId from JSON response
try {
    $json = $res.Body | ConvertFrom-Json
    $jobId = $json.jobId
    if (-not $jobId) { throw 'jobId missing' }
} catch {
    Write-Error "Failed to parse jobId from response: $_"
    exit 6
}

Write-Host "Created job: $jobId. Polling status..."

$jobUrl = "http://localhost:3001/api/jobs/$jobId"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$status = $null
while ($sw.Elapsed.TotalSeconds -lt $JobTimeoutSec) {
    try {
        $j = Invoke-RestMethod -Uri $jobUrl -Method Get -ErrorAction Stop
        $status = $j.status
        Write-Host "Job status: $status"
        # backend uses 'completed' as terminal state; accept both
        if ($status -eq 'done' -or $status -eq 'completed') { break }
        if ($status -eq 'failed') { Write-Error "Job failed: $($j.error)"; exit 7 }
    } catch {
        Write-Warning "Unable to fetch job status: $_"
    }
    Start-Sleep -Seconds $JobPollIntervalSec
}

if ($status -ne 'done' -and $status -ne 'completed') {
    Write-Error "Job did not complete within timeout ($JobTimeoutSec sec)."
    exit 8
}

Write-Host "Job completed. Calling chat endpoint to validate retrieval..."

$chatUrl = 'http://localhost:3001/api/chat'
$payload = @{ jobId = $jobId; question = 'Provide a short summary of the uploaded data' } | ConvertTo-Json
try {
    $chatRes = Invoke-RestMethod -Uri $chatUrl -Method Post -ContentType 'application/json' -Body $payload -ErrorAction Stop
    Write-Host "Chat response: "
    $chatRes | ConvertTo-Json -Depth 5
} catch {
    Write-Error "Chat request failed: $_"
    exit 9
}

Write-Host "Smoke test succeeded. Exiting 0."
exit 0
