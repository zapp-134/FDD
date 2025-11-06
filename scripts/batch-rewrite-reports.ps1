$root='D:\FDD\backend\reports'
$files = Get-ChildItem -Path $root -Filter 'report_*.json' -File
$matches = @()
foreach ($f in $files) {
  if (Select-String -Path $f.FullName -Pattern '"candidates"' -Quiet -ErrorAction SilentlyContinue) { $matches += $f; continue }
  if (Select-String -Path $f.FullName -Pattern '```json' -Quiet -ErrorAction SilentlyContinue) { $matches += $f; continue }
}
if ($matches.Count -eq 0) { Write-Output 'NO_MATCHES' ; exit 0 }
foreach ($f in $matches) {
  $bak = $f.FullName + '.bak'
  if (-not (Test-Path $bak)) { Copy-Item -Path $f.FullName -Destination $bak -Force }
  Write-Output "PROCESSING: $($f.FullName)"
  node 'D:\FDD\scripts\rewrite-report.cjs' $f.FullName
}
Write-Output "DONE. Processed $($matches.Count) files. Backups created with .bak suffix."