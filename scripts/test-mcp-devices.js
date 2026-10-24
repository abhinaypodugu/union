const { spawn } = require('child_process');
const path = require('path');

const winPath = 'C:\\nvm4w\\nodejs;' +
  'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools;' +
  'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\emulator;' +
  'C:\\Windows\\System32;' +
  'C:\\Windows';

const server = spawn(process.execPath, [path.join(__dirname, '..', 'mcp', 'android-mcp-server.js')], {
  env: {
    ...process.env,
    PATH: winPath,
    PATHEXT: process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD',
    ADB_PATH: 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    ANDROID_HOME: 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk',
    ANDROID_SDK_ROOT: 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk',
  },
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        const toolCall = JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'android_screenshot',
            arguments: { deviceId: 'emulator-5554', savePath: 'test-screenshots/mcp_federation_tab.png' },
          },
        }) + '\n';
        server.stdin.write(toolCall);
      } else if (msg.id === 2) {
        console.log('\n[+] MCP Tool Call Result for "adb_devices":');
        console.log(JSON.stringify(msg.result, null, 2));
        server.kill();
        process.exit(0);
      }
    } catch { }
  }
});

server.stderr.on('data', (data) => {
  const str = data.toString().trim();
  if (str) console.error('[MCP log]', str);
});

server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'bpef-test-client', version: '1.0.0' },
  },
}) + '\n');

setTimeout(() => {
  server.kill();
  process.exit(1);
}, 15000);
