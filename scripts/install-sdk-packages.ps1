$env:JAVA_HOME = "C:\Users\abhin\AppData\Local\Android\jre\jdk-17.0.20.1+1-jre"
$env:ANDROID_HOME = "C:\Users\abhin\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

$sdkmanager = "C:\Users\abhin\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"

Write-Host "Installing Android Emulator, Platform 34, and System Image..."
& $sdkmanager "emulator" "platforms;android-34" "system-images;android-34;google_apis;x86_64"

Write-Host "Installation completed."
