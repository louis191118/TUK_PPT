// 3D 에셋 빌드 (Blender 없음): 헤드리스 Chrome에서 three.js로 장면 스크립트(*.mjs)를 돌려 GLB·PNG·JSON을 덱 폴더에 쓴다.
// 장면 스크립트: export default async function (dk) { ... }   (dk = scripts/3d/kit3d.js)
// 페이지가 볼 수 있는 곳: /kit/ = 스킬 폴더, /deck/ = 덱 폴더, /src/ = 스크립트가 있는 폴더. 쓰기는 덱 폴더 안으로만.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { KIT, loadEvidence } from './util.mjs';
import { launchChrome } from './capture.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wasm': 'application/wasm' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function serveRoots(roots) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [, key, ...rest] = u.split('/');
    const root = roots[key];
    const file = root && path.resolve(root, rest.join('/'));
    if (!file || !file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

function themeTokens(deck) {
  const p = path.join(deck, 'web', 'css', 'theme.css');
  if (!fs.existsSync(p)) return {};
  return Object.fromEntries([...fs.readFileSync(p, 'utf8').matchAll(/--c-([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
}

export function findScript(name) {
  const cands = [path.resolve(name), path.join(KIT, 'scripts', '3d', name), path.join(KIT, 'scripts', '3d', `${name}.mjs`)];
  return cands.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

export async function build3d(deck, scriptFile, args = [], { timeout = 600000 } = {}) {
  const evidence = Object.fromEntries((loadEvidence(deck).items || []).map((it) => [it.id, it]));
  const src = path.dirname(scriptFile);
  const { server, port } = await serveRoots({ kit: KIT, deck, src });
  const chrome = await launchChrome(1280, 800);
  let ok = false;
  try {
    const t = await (await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 0; const pend = {};
    const written = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
      if (m.method === 'Runtime.consoleAPICalled') {
        const line = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        (m.params.type === 'error' ? console.error : console.log)(line);
      }
      if (m.method === 'Runtime.exceptionThrown') console.error('EXC', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.bindingCalled' && m.params.name === '__dkWrite') {
        const { file, b64 } = JSON.parse(m.params.payload);
        const out = path.resolve(deck, file);
        if (!out.startsWith(path.resolve(deck) + path.sep)) { console.error('덱 폴더 밖에는 쓰지 않는다:', file); return; }
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        written.push(path.relative(deck, out));
      }
    };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
    await new Promise((r) => (ws.onopen = r));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Runtime.addBinding', { name: '__dkWrite' });
    const rel = (p) => path.relative(deck, p);
    const inDeck = !rel(scriptFile).startsWith('..');
    const DK = { args, tokens: themeTokens(deck), evidence, deckUrl: '/deck/', script: inDeck ? `/deck/${rel(scriptFile).split(path.sep).join('/')}` : `/src/${path.basename(scriptFile)}` };
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__DK = ${JSON.stringify(DK)};` });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/kit/scripts/3d/runner.html` });
    const t0 = Date.now();
    let done = null;
    while (!done && Date.now() - t0 < timeout) { await sleep(250); done = await ev('window.__dkDone || null'); }
    await sleep(300);   // 마지막 쓰기 이벤트까지
    if (!done) console.error(`시간 초과 (${timeout / 1000}초)`);
    else if (!done.ok) console.error('장면 스크립트 실패:', done.error);
    ok = !!done?.ok;
    console.log(`${ok ? '✓' : '✗'} ${path.basename(scriptFile)} · ${((Date.now() - t0) / 1000).toFixed(1)}초 · 쓴 파일 ${written.length}개${written.length ? '\n  ' + written.join('\n  ') : ''}`);
    ws.close();
  } finally {
    chrome.proc.kill();
    server.close();
    try { fs.rmSync(chrome.dir, { recursive: true, force: true }); } catch {}
  }
  return ok;
}
