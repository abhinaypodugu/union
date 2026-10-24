@echo off
setlocal
set "JAVA_HOME=C:\Users\abhin\AppData\Local\Android\jdk-17"
set "ANDROID_HOME=C:\Users\abhin\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\abhin\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

echo ===================================================
echo   BPEF DUAL ANDROID EMULATOR LAUNCHER
echo ===================================================
echo.
echo [1/2] Starting BPEF Admin Device on Port 5554...
start "BPEF Admin (emulator-5554)" "%ANDROID_HOME%\emulator\emulator.exe" -avd bpef_admin -port 5554 -gpu host -no-boot-anim

timeout /t 3 /nobreak >nul

echo [2/2] Starting BPEF Member Device on Port 5556...
start "BPEF Member (emulator-5556)" "%ANDROID_HOME%\emulator\emulator.exe" -avd bpef_member -port 5556 -gpu host -no-boot-anim

echo.
echo Waiting for both devices to initialize...
echo When ready, run "node scripts/test-dual-devices.js" to run dual-device automated tests.
echo.
adb devices
echo ===================================================
