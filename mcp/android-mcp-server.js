#!/usr/bin/env node
/**
 * BPEF Android MCP Server (Zero-Dependency, Multi-Device, Windows-Native)
 * Exposes ADB device control, UI inspection, tapping, and screen capture over Model Context Protocol.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ADB = process.env.ADB_PATH ||
 (fs.existsSync('C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe')
  ? 'C:\\Users\\abhin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'
  : 'adb');

function runAdb(cmd, deviceId) {
 const target = deviceId ? `-s ${deviceId} ` : '';
 return execSync(`"${ADB}" ${target}${cmd}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
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

  const text = getAttr('text');
  const desc = getAttr('content-desc');
  const cls = getAttr('class');
  const bounds = getAttr('bounds');
  const clickable = getAttr('clickable') === 'true';

  if (text || desc || clickable) {
   let x = 0, y = 0, width = 0, height = 0;
   const bMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
   if (bMatch) {
    const x1 = parseInt(bMatch[1], 10);
    const y1 = parseInt(bMatch[2], 10);
    const x2 = parseInt(bMatch[3], 10);
    const y2 = parseInt(bMatch[4], 10);
    x = Math.round((x1 + x2) / 2);
    y = Math.round((y1 + y2) / 2);
    width = x2 - x1;
    height = y2 - y1;
   }
   elements.push({ text, desc, cls, bounds, center: { x, y }, width, height, clickable });
  }
 }
 return elements;
}

const TOOLS = [
 {
  name: 'android_devices',
  description: 'Lists all connected Android emulators and devices with their serial, status, and model.',
  inputSchema: { type: 'object', properties: {} },
 },
 {
  name: 'android_get_elements',
  description: 'Dumps and lists visible interactive UI elements on the Android screen with text, bounds, and tap coordinates.',
  inputSchema: {
   type: 'object',
   properties: {
    deviceId: { type: 'string', description: 'Device serial (e.g. emulator-5554 or emulator-5556)' },
   },
  },
 },
 {
  name: 'android_tap_element',
  description: 'Finds a UI element on screen by text or content description and taps on it automatically.',
  inputSchema: {
   type: 'object',
   properties: {
    text: { type: 'string', description: 'Exact or partial text/description of the element to tap' },
    deviceId: { type: 'string', description: 'Device serial (e.g. emulator-5554 or emulator-5556)' },
   },
   required: ['text'],
  },
 },
 {
  name: 'android_tap',
  description: 'Taps at specific screen coordinates (X, Y).',
  inputSchema: {
   type: 'object',
   properties: {
    x: { type: 'number', description: 'X coordinate' },
    y: { type: 'number', description: 'Y coordinate' },
    deviceId: { type: 'string', description: 'Device serial' },
   },
   required: ['x', 'y'],
  },
 },
 {
  name: 'android_type',
  description: 'Types text into the currently focused input field on device.',
  inputSchema: {
   type: 'object',
   properties: {
    text: { type: 'string', description: 'Text to type' },
    deviceId: { type: 'string', description: 'Device serial' },
   },
   required: ['text'],
  },
 },
 {
  name: 'android_key',
  description: 'Sends a keyevent (e.g. back=4, home=3, enter=66, escape=111).',
  inputSchema: {
   type: 'object',
   properties: {
    key: { type: 'string', description: 'Key name (back, home, enter, escape) or numeric code' },
    deviceId: { type: 'string', description: 'Device serial' },
   },
   required: ['key'],
  },
 },
 {
  name: 'android_swipe',
  description: 'Performs a swipe gesture between two points (X1, Y1) to (X2, Y2).',
  inputSchema: {
   type: 'object',
   properties: {
    x1: { type: 'number' },
    y1: { type: 'number' },
    x2: { type: 'number' },
    y2: { type: 'number' },
    durationMs: { type: 'number', default: 300 },
    deviceId: { type: 'string' },
   },
   required: ['x1', 'y1', 'x2', 'y2'],
  },
 },
 {
  name: 'android_screenshot',
  description: 'Captures a screenshot of the device screen and returns base64 PNG image.',
  inputSchema: {
   type: 'object',
   properties: {
    deviceId: { type: 'string', description: 'Device serial' },
    savePath: { type: 'string', description: 'Optional local file path to save image' },
   },
  },
 },
 {
  name: 'android_adb',
  description: 'Executes a raw ADB command on the device (escape hatch).',
  inputSchema: {
   type: 'object',
   properties: {
    command: { type: 'string', description: 'Command after adb (e.g. "shell getprop ro.build.version.release")' },
    deviceId: { type: 'string', description: 'Device serial' },
   },
   required: ['command'],
  },
 },
];

async function handleToolCall(name, args) {
 const deviceId = args.deviceId;

 switch (name) {
  case 'android_devices': {
   const raw = runAdb('devices -l');
   const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
   const devices = [];
   for (const line of lines) {
    if (line.startsWith('List of devices')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
     const serial = parts[0];
     const state = parts[1];
     const modelMatch = line.match(/model:(\S+)/);
     devices.push({
      serial,
      state,
      model: modelMatch ? modelMatch[1].replace(/_/g, ' ') : 'Generic',
     });
    }
   }
   return { text: JSON.stringify(devices, null, 2) };
  }

  case 'android_get_elements': {
   runAdb('shell uiautomator dump /sdcard/mcp_dump.xml', deviceId);
   const xml = runAdb('shell cat /sdcard/mcp_dump.xml', deviceId);
   const elements = parseXmlElements(xml);
   return { text: JSON.stringify(elements, null, 2) };
  }

  case 'android_tap_element': {
   runAdb('shell uiautomator dump /sdcard/mcp_dump.xml', deviceId);
   const xml = runAdb('shell cat /sdcard/mcp_dump.xml', deviceId);
   const elements = parseXmlElements(xml);
   const needle = args.text.toLowerCase().trim();
   const exactMatch = elements.find((e) =>
    (e.text && e.text.toLowerCase().trim() === needle) ||
    (e.desc && e.desc.toLowerCase().trim() === needle)
   );
   const match = exactMatch || elements.find((e) =>
    (e.text && e.text.toLowerCase().includes(needle)) ||
    (e.desc && e.desc.toLowerCase().includes(needle))
   );

   if (!match) {
    return {
     text: `Element matching "${args.text}" not found on screen. Visible elements: ` +
      elements.map((e) => e.text || e.desc).filter(Boolean).slice(0, 10).join(', '),
     isError: true,
    };
   }

   runAdb(`shell input tap ${match.center.x} ${match.center.y}`, deviceId);
   return {
    text: `Tapped "${match.text || match.desc}" at (${match.center.x}, ${match.center.y})`,
   };
  }

  case 'android_tap': {
   runAdb(`shell input tap ${args.x} ${args.y}`, deviceId);
   return { text: `Tapped (${args.x}, ${args.y}) on ${deviceId || 'default'}` };
  }

  case 'android_type': {
   const sanitized = args.text.replace(/\s+/g, '%s');
   runAdb(`shell input text "${sanitized}"`, deviceId);
   return { text: `Typed "${args.text}" on ${deviceId || 'default'}` };
  }

  case 'android_key': {
   const keyMap = { back: '4', home: '3', enter: '66', escape: '111', tab: '61', space: '62' };
   const code = keyMap[args.key.toLowerCase()] || args.key;
   runAdb(`shell input keyevent ${code}`, deviceId);
   return { text: `Sent keyevent ${args.key} (${code}) on ${deviceId || 'default'}` };
  }

  case 'android_swipe': {
   const d = args.durationMs || 300;
   runAdb(`shell input swipe ${args.x1} ${args.y1} ${args.x2} ${args.y2} ${d}`, deviceId);
   return { text: `Swiped (${args.x1},${args.y1}) -> (${args.x2},${args.y2})` };
  }

  case 'android_screenshot': {
   const target = deviceId ? `-s ${deviceId} ` : '';
   const buf = execSync(`"${ADB}" ${target}exec-out screencap -p`);
   if (args.savePath) {
    fs.writeFileSync(args.savePath, buf);
   }
   return {
    image: buf.toString('base64'),
    text: args.savePath ? `Screenshot saved to ${args.savePath}` : 'Screenshot captured',
   };
  }

  case 'android_adb': {
   const out = runAdb(args.command, deviceId);
   return { text: out };
  }

  default:
   throw new Error(`Unknown tool: ${name}`);
 }
}

// Stdio JSON-RPC 2.0 Loop
const rl = readline.createInterface({
 input: process.stdin,
 output: process.stdout,
 terminal: false,
});

rl.on('line', async (line) => {
 if (!line.trim()) return;
 try {
  const msg = JSON.parse(line);

  if (msg.method === 'initialize') {
   const res = {
    jsonrpc: '2.0',
    id: msg.id,
    result: {
     protocolVersion: '2024-11-05',
     capabilities: { tools: {} },
     serverInfo: { name: 'bpef-android-mcp', version: '1.0.0' },
    },
   };
   process.stdout.write(JSON.stringify(res) + '\n');
  } else if (msg.method === 'notifications/initialized') {
   // no response needed
  } else if (msg.method === 'tools/list') {
   const res = {
    jsonrpc: '2.0',
    id: msg.id,
    result: { tools: TOOLS },
   };
   process.stdout.write(JSON.stringify(res) + '\n');
  } else if (msg.method === 'tools/call') {
   const { name, arguments: args = {} } = msg.params;
   try {
    const out = await handleToolCall(name, args);
    const content = [];
    if (out.text) content.push({ type: 'text', text: out.text });
    if (out.image) content.push({ type: 'image', data: out.image, mimeType: 'image/png' });
    const res = {
     jsonrpc: '2.0',
     id: msg.id,
     result: {
      content,
      isError: Boolean(out.isError),
     },
    };
    process.stdout.write(JSON.stringify(res) + '\n');
   } catch (err) {
    const res = {
     jsonrpc: '2.0',
     id: msg.id,
     result: {
      content: [{ type: 'text', text: `Tool Error: ${err.message}` }],
      isError: true,
     },
    };
    process.stdout.write(JSON.stringify(res) + '\n');
   }
  }
 } catch (e) {
  // ignore parse errors
 }
});
