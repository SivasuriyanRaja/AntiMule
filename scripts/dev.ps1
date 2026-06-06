# AntiMule Dev Script - Runs backend (FastAPI) + frontend (Vite) concurrently
# Usage: npm run dev  (from C:\Users\sivas\Downloads\AntiMule)

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AntiMule Dev Server Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend in a NEW visible terminal window so errors are easy to see
$backendScript = @"
Set-Location '$ROOT'
Write-Host '[BACKEND] Starting FastAPI on http://localhost:8000...' -ForegroundColor Green
& '$ROOT\.venv\Scripts\uvicorn.exe' main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude '*models*' --reload-exclude '*reports*'
Write-Host '[BACKEND] Server stopped.' -ForegroundColor Red
Read-Host 'Press Enter to close'
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Give backend 3 seconds to start before launching frontend
Start-Sleep -Seconds 3

# Start Frontend (Vite) in this window (Ctrl+C kills it)
Write-Host "[FRONTEND] Starting Vite..." -ForegroundColor Yellow
try {
    Set-Location "$ROOT\neon-guard-ui-main"
    npm run dev -- --force
} finally {
    Write-Host ""
    Write-Host "Frontend stopped. Close the backend window manually." -ForegroundColor Red
}
