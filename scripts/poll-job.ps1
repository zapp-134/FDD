param(
  [Parameter(Mandatory=$true)]
  [string]$JobId
)

for ($i=0; $i -lt 120; $i++) {
  try {
    $j = Invoke-RestMethod -Uri "http://localhost:3001/api/jobs/$JobId" -Method GET -ErrorAction Stop
  } catch {
    Write-Output "job not found yet"
    Start-Sleep -Seconds 1
    continue
  }
  Write-Output "[poll] status=$($j.status) progress=$($j.progress)"
  if ($j.status -eq 'completed' -or $j.status -eq 'failed') { break }
  Start-Sleep -Seconds 1
}
Write-Output 'done'