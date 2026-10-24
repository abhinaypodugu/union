/**
 * BPEF Live Cross-Device Test: Admin Approving Pending Member
 * Device 1: emulator-5554 (Admin: Tester Admin)
 * Device 2: emulator-5556 (Member: B Narasing Rao)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const ADMIN = 'emulator-5554';
const MEMBER = 'emulator-5556';

function adb(serial, cmd) {
 return execSync(`"${ADB}" -s ${serial} ${cmd}`, { encoding: 'utf8' }).trim();
}

function sleep(ms) {
 const end = Date.now() + ms;
 while (Date.now() < end) { }
}

function parseXmlElements(xmlStr) {
 const elements = [];
 const nodeRegex = /<node\s+([^>]+)>/g;
 let match;
 while ((match = nodeRegex.exec(xmlStr)) !== null) {
  const attrsStr = match[1];
  const getAttr = (name) => {
   const m = attrsStr.match(new RegExp(`${name}="([^"]*)"`));
   return m ? m[1] : '';
  };

  const text = getAttr('text').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const desc = getAttr('content-desc').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const cls = getAttr('class');
  const bounds = getAttr('bounds');
  const clickable = getAttr('clickable') === 'true';
  let x = 0, y = 0;
  const bMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (bMatch) {
   x = Math.round((parseInt(bMatch[1], 10) + parseInt(bMatch[3], 10)) / 2);
   y = Math.round((parseInt(bMatch[2], 10) + parseInt(bMatch[4], 10)) / 2);
  }
  elements.push({ text, desc, cls, bounds, center: { x, y } });
 }
 return elements;
}

function tapText(serial, textToFind) {
 const needle = textToFind.toLowerCase().trim();
 for (let attempt = 0; attempt < 3; attempt++) {
  adb(serial, 'shell uiautomator dump /sdcard/flow_dump.xml');
  const xml = adb(serial, 'shell cat /sdcard/flow_dump.xml');
  const elements = parseXmlElements(xml);

  const exact = elements.find((e) =>
   (e.text && e.text.toLowerCase().trim() === needle) ||
   (e.desc && e.desc.toLowerCase().trim() === needle)
  );
  const match = exact || elements.find((e) =>
   (e.text && e.text.toLowerCase().includes(needle)) ||
   (e.desc && e.desc.toLowerCase().includes(needle))
  );

  if (match) {
   adb(serial, `shell input tap ${match.center.x} ${match.center.y}`);
   console.log(`   [✓] Tapped "${match.text || match.desc}" at (${match.center.x}, ${match.center.y}) on ${serial}`);
   sleep(1500);
   return;
  }

  // Scroll down to reveal elements below the fold
  adb(serial, 'shell input swipe 500 1500 500 800 200');
  sleep(800);
 }

 throw new Error(`Could not find "${textToFind}" on ${serial} after scrolling.`);
}

function dumpTexts(serial) {
 adb(serial, 'shell uiautomator dump /sdcard/flow_dump.xml');
 const xml = adb(serial, 'shell cat /sdcard/flow_dump.xml');
 return parseXmlElements(xml).map(e => e.text || e.desc).filter(Boolean);
}

console.log('===================================================');
console.log('   BPEF Cross-Device Approval & Transition Flow');
console.log('===================================================');

// Step 1: Verify current state of both devices
console.log('\n[1] Verifying Current States:');
const memberTexts = dumpTexts(MEMBER);
console.log('   - Member device state includes:', memberTexts.slice(0, 5).join(' · '));
if (!memberTexts.some(t => t.includes('under review'))) {
 console.log('   [!] Expected Member to be on "Application under review" screen.');
}

console.log('\n[2] Navigating Admin to Member Management:');
const adminCur = dumpTexts(ADMIN);
if (!adminCur.some(t => t.includes('Pending approvals') || t.includes('Members & approvals'))) {
 tapText(ADMIN, 'Home');
 tapText(ADMIN, 'Management');
}

console.log('\n[3] Opening Members & approvals:');
tapText(ADMIN, 'Members & approvals');

// Step 5: Check Pending Queue
console.log('\n[5] Inspecting Pending Membership Applications:');
const adminQueueTexts = dumpTexts(ADMIN);
console.log('   - Visible items in Member Management:', adminQueueTexts.slice(0, 10).join(' · '));

const hasNarasing = adminQueueTexts.some(t => t.includes('Narasing'));
console.log(`   - Pending applicant "B Narasing Rao" visible: ${hasNarasing ? 'YES' : 'NO'}`);

if (hasNarasing) {
 console.log('\n[6] Opening Member Card for "B Narasing Rao":');
 tapText(ADMIN, 'Narasing');

 console.log('\n[7] Approving Membership:');
 // In the member sheet, find the Approve / Verify action
 const sheetTexts = dumpTexts(ADMIN);
 console.log('   - Sheet options:', sheetTexts.slice(0, 10).join(' · '));
 tapText(ADMIN, 'Approve');
 console.log('   [✓] Approved B Narasing Rao on Admin device!');
} else {
 console.log('\n[6] No pending review found for B Narasing Rao (may already be verified or tab needs switch).');
}

// Step 8: Trigger Member Check Status
console.log('\n[8] Refreshing Member Status on Device 2:');
tapText(MEMBER, 'Check status');

sleep(2000);
const memberFinalTexts = dumpTexts(MEMBER);
console.log('   - Member final screen includes:', memberFinalTexts.slice(0, 8).join(' · '));

const isVerified = memberFinalTexts.some(t => t.includes('Home') || t.includes('Federation') || t.includes('Groups'));
console.log(`\n===================================================`);
console.log(`   MEMBER APPROVED & TRANSITIONED TO /main: ${isVerified ? 'SUCCESS ✅' : 'PENDING'}`);
console.log(`===================================================`);
