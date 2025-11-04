New-Item -ItemType Directory -Force backend\reports | Out-Null
$resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/ingest' -Method Post -Form @{ files = (Get-Item 'public/samples/sample_financial_data.csv') } -TimeoutSec 120
$resp | ConvertTo-Json -Depth 10 | Out-File backend\reports\ingest_response.json -Encoding utf8
$jobId = $resp.jobId
Write-Output "JOBID:$jobId"
for ($i=0; $i -lt 120; $i++) {
  try {
    $s = Invoke-RestMethod -Uri "http://localhost:3001/api/jobs/$jobId" -Method Get -TimeoutSec 30
  } catch {
    Write-Output "STATUS:fetch_error"
    Start-Sleep -Seconds 2
    continue
  }
  Write-Output "STATUS:$($s.status) PROG:$($s.progress)"
  if ($s.status -eq 'completed' -or $s.status -eq 'failed') {
    $s | ConvertTo-Json -Depth 10 | Out-File "backend\reports\ingest_job_$jobId.json" -Encoding utf8
    break
  }
  Start-Sleep -Seconds 2
}
