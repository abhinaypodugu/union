$env:JAVA_HOME = "C:\Users\abhin\AppData\Local\Android\jre\jdk-17.0.20.1+1-jre"
$env:ANDROID_HOME = "C:\Users\abhin\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

$avdmanager = "C:\Users\abhin\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat"

Write-Host "Creating AVD 1: bpef_admin..."
"no`n" | & $avdmanager create avd -n "bpef_admin" -k "system-images;android-34;google_apis;x86_64" -d "pixel_6" --force

Write-Host "Creating AVD 2: bpef_member..."
"no`n" | & $avdmanager create avd -n "bpef_member" -k "system-images;android-34;google_apis;x86_64" -d "pixel_6" --force

Write-Host "Listing created AVDs:"
& $avdmanager list avd
