const { spawn } = require('child_process');

const server = spawn('cmd.exe', ['/c', 'npx', '-y', '@moallemi/android-mcp-server'], {
  env: {
    ...process.env,
    PATH: `C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools;${process.env.PATH}`,
  },
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep remainder

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        // Init response
        console.log('[+] MCP Server Initialized:', msg.result?.serverInfo?.name);
        // Request tools list
        const listReq = JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }) + '\n';
        server.stdin.write(listReq);
      } else if (msg.id === 2) {
        console.log('\n[+] Available MCP Tools:');
        msg.result?.tools?.forEach((t) => {
          console.log(` - ${t.name.padEnd(20)}: ${t.description.split('.')[0]}`);
        });
        server.kill();
        process.exit(0);
      }
    } catch {
      // not JSON line (e.g. log output)
    }
  }
});

server.stderr.on('data', (data) => {
  const str = data.toString().trim();
  if (str) console.error('[MCP log]', str);
});

// Send initialize request
const initReq = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'bpef-test-client', version: '1.0.0' },
  },
}) + '\n';

server.stdin.write(initReq);

setTimeout(() => {
  console.log('[!] Timeout waiting for MCP response');
  server.kill();
  process.exit(1);
}, 15000);
