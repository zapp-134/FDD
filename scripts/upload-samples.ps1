# Upload all files in public/samples to the backend /api/ingest endpoint as a single multipart request
Param(
  [string]$SamplesDir = "D:\FDD\public\samples",
  [string]$Endpoint = "http://localhost:3001/api/ingest"
)

Write-Output "Collecting files from: $SamplesDir"
$files = Get-ChildItem -Path $SamplesDir -File | ForEach-Object { $_.FullName }
if (-not $files -or $files.Count -eq 0) {
  Write-Error "No sample files found in $SamplesDir"
  exit 1
}

# Build form with multiple files under the 'files' field
$form = @{}
$form['files'] = @()
foreach ($f in $files) {
  $form['files'] += Get-Item $f
}

Write-Output "Uploading $($files.Count) files to $Endpoint"
try {
  $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Form $form -TimeoutSec 120
  Write-Output "Upload response:";
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error "Upload failed: $($_.Exception.Message)"
  exit 2
}
