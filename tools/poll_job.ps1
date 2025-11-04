$resp = Get-Content backend\reports\ingest_response_curl.json | ConvertFrom-Json
$job = $resp.jobId
Write-Output "Polling job: $job"
for ($i=0; $i -lt 120; $i++) {
  try {
    $s = Invoke-RestMethod -Uri "http://localhost:3001/api/jobs/$job" -Method Get -TimeoutSec 30
  } catch {
    Write-Output "STATUS:fetch_error"
    Start-Sleep -Seconds 2
    continue
  }
  Write-Output "STATUS:$($s.status) PROG:$($s.progress)"
  if ($s.status -eq 'completed' -or $s.status -eq 'failed') {
    $s | ConvertTo-Json -Depth 10 | Out-File backend\reports\ingest_job_$job.json -Encoding utf8
    break
  }
  Start-Sleep -Seconds 2
}
