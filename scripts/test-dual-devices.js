/**
 * Automated Dual-Device Controller & Test Runner for BPEF
 * Controls emulator-5554 (Admin) and emulator-5556 (Member) via ADB.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const ADMIN_DEV = 'emulator-5554';
const MEMBER_DEV = 'emulator-5556';
const PACKAGE_NAME = 'org.commons.union';

function adb(serial, cmd) {
 try {
  return execSync(`"${ADB}" -s ${serial} ${cmd}`, { encoding: 'utf8' }).trim();
 } catch (err) {
  return `ERROR: ${err.message}`;
 }
}

function adbGlobal(cmd) {
 try {
  return execSync(`"${ADB}" ${cmd}`, { encoding: 'utf8' }).trim();
 } catch (err) {
  return `ERROR: ${err.message}`;
 }
}

console.log('===================================================');
console.log('   BPEF Dual-Device Automated Test Rig');
console.log('===================================================');

// 1. Check connected devices
const devicesOutput = adbGlobal('devices');
console.log('\n[1] Checking Connected Devices:');
console.log(devicesOutput);

const hasAdmin = devicesOutput.includes(ADMIN_DEV);
const hasMember = devicesOutput.includes(MEMBER_DEV);

if (!hasAdmin || !hasMember) {
 console.log('\n[!] Missing devices:');
 if (!hasAdmin) console.log(`   - ${ADMIN_DEV} (Admin device) is offline.`);
 if (!hasMember) console.log(`   - ${MEMBER_DEV} (Member device) is offline.`);
 console.log('\n--> Run "launch-emulators.bat" first to boot both emulators side-by-side.');
 process.exit(1);
}

console.log(`\n[+] Both devices online: ${ADMIN_DEV} and ${MEMBER_DEV}`);

// 2. Check boot status
console.log('\n[2] Checking OS Boot Readiness:');
const adminBoot = adb(ADMIN_DEV, 'shell getprop sys.boot_completed');
const memberBoot = adb(MEMBER_DEV, 'shell getprop sys.boot_completed');
console.log(`   - ${ADMIN_DEV} boot status: ${adminBoot === '1' ? 'READY (1)' : 'BOOTING (' + adminBoot + ')'}`);
console.log(`   - ${MEMBER_DEV} boot status: ${memberBoot === '1' ? 'READY (1)' : 'BOOTING (' + memberBoot + ')'}`);

if (adminBoot !== '1' || memberBoot !== '1') {
 console.log('\n[!] Devices are still loading their home launchers. Please wait 15 seconds and re-run.');
 process.exit(1);
}

// 3. Find latest APK
console.log('\n[3] Locating BPEF Android Application:');
const candidateApks = [
 path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
 path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
];
let targetApk = candidateApks.find((p) => fs.existsSync(p));

if (targetApk) {
 console.log(`   - Found APK: ${targetApk}`);
 console.log(`   - Installing on ${ADMIN_DEV}...`);
 console.log(`     Result: ${adb(ADMIN_DEV, `install -r "${targetApk}"`)}`);
 console.log(`   - Installing on ${MEMBER_DEV}...`);
 console.log(`     Result: ${adb(MEMBER_DEV, `install -r "${targetApk}"`)}`);
} else {
 console.log('   - No local APK build found yet. Checking if package is installed...');
}

// 4. Launch BPEF on both devices
console.log('\n[4] Launching BPEF on both devices:');
console.log(`   - Launching on ${ADMIN_DEV}: ${adb(ADMIN_DEV, `shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`)}`);
console.log(`   - Launching on ${MEMBER_DEV}: ${adb(MEMBER_DEV, `shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`)}`);

// 5. Capture screenshots
console.log('\n[5] Capturing Live Device Screen Snapshots:');
const screenshotsDir = path.join(__dirname, '..', 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

const adminScreen = path.join(screenshotsDir, 'admin_screen.png');
const memberScreen = path.join(screenshotsDir, 'member_screen.png');

try {
 execSync(`"${ADB}" -s ${ADMIN_DEV} exec-out screencap -p > "${adminScreen}"`);
 console.log(`   [✓] Saved Admin screen: ${adminScreen}`);
} catch (e) {
 console.log(`   [!] Could not capture admin screen: ${e.message}`);
}

try {
 execSync(`"${ADB}" -s ${MEMBER_DEV} exec-out screencap -p > "${memberScreen}"`);
 console.log(`   [✓] Saved Member screen: ${memberScreen}`);
} catch (e) {
 console.log(`   [!] Could not capture member screen: ${e.message}`);
}

console.log('\n===================================================');
console.log('   DUAL-DEVICE RIG FULLY OPERATIONAL');
console.log('===================================================');
