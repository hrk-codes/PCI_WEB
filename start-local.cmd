@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\next\dist\bin\next" (
  echo Dependencies are missing. Run pnpm install in this folder first.
  exit /b 1
)

echo Starting PCI Cables at http://127.0.0.1:3000/
echo Keep this window open while you use the local website. Press Ctrl+C to stop.
node "node_modules\next\dist\bin\next" dev -H 127.0.0.1 -p 3000
