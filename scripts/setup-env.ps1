# Set user environment variables for Android SDK & Java
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Users\abhin\AppData\Local\Android\jdk-17", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\abhin\AppData\Local\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "C:\Users\abhin\AppData\Local\Android\Sdk", "User")

$currPath = [Environment]::GetEnvironmentVariable("Path", "User")
$additions = @(
  "C:\Users\abhin\AppData\Local\Android\jdk-17\bin",
  "C:\Users\abhin\AppData\Local\Android\Sdk\cmdline-tools\latest\bin",
  "C:\Users\abhin\AppData\Local\Android\Sdk\platform-tools",
  "C:\Users\abhin\AppData\Local\Android\Sdk\emulator"
)

foreach ($p in $additions) {
  if (-not $currPath.Contains($p)) {
    $currPath = "$p;$currPath"
  }
}

[Environment]::SetEnvironmentVariable("Path", $currPath, "User")
Write-Host "Environment variables successfully set."
