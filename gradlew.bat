@echo off
setlocal

set "GRADLE_VERSION=8.10.2"
set "BASE_DIR=%~dp0"
set "DIST_DIR=%BASE_DIR%.gradle-dist"
set "GRADLE_HOME=%DIST_DIR%\gradle-%GRADLE_VERSION%"
set "ARCHIVE=%DIST_DIR%\gradle-%GRADLE_VERSION%-bin.zip"
set "GRADLE_BIN=%GRADLE_HOME%\bin\gradle.bat"
set "DOWNLOAD_URL=https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip"

if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

if not exist "%GRADLE_BIN%" (
  echo Bootstrapping Gradle %GRADLE_VERSION% ...
  if not exist "%ARCHIVE%" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ARCHIVE%'"
    if errorlevel 1 exit /b 1
  )
  if exist "%GRADLE_HOME%" rmdir /s /q "%GRADLE_HOME%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force '%ARCHIVE%' '%DIST_DIR%'"
  if errorlevel 1 exit /b 1
)

call "%GRADLE_BIN%" %*
exit /b %errorlevel%

