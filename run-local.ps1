# Start backend and frontend in separate PowerShell windows
Start-Process powershell -ArgumentList "-NoProfile -NoExit -Command cd $(Resolve-Path .\backend); npm run dev"
Start-Process powershell -ArgumentList "-NoProfile -NoExit -Command cd $(Resolve-Path .\frontend); npm run dev"
Start-Process powershell -ArgumentList "-NoProfile -NoLogo -Command cd '$PWD\\backend'; npm run dev" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoProfile -NoLogo -Command cd '$PWD'; npm run dev:frontend" -WindowStyle Normal

Write-Host "Started backend and frontend in separate windows. Check the consoles for logs." 
