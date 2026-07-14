@echo off
REM Lehrgeld ohne Terminal starten (Windows).
REM Doppelklick im Datei-Explorer genuegt. Dieses Fenster offen lassen, solange
REM die App laeuft — zum Beenden das Fenster schliessen oder Strg+C druecken.

cd /d "%~dp0"

REM Beim ersten Start: Abhaengigkeiten holen und App bauen.
if not exist "node_modules" call npm install
if not exist ".next" call npm run build

echo.
echo Lehrgeld startet. Der Browser oeffnet sich gleich unter http://localhost:3000
echo Falls die Seite noch nicht laedt, kurz warten und neu laden.
echo.

REM Browser mit kurzer Verzoegerung oeffnen, damit der Server bereit ist.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"

call npm start
