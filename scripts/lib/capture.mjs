// 검수 캡처: 헤드리스 Chrome(CDP)으로 장마다(--steps면 모든 단계) 찍고, 글자 크기·넘침·겹침·콘솔 오류를 검사해 report.md를 쓴다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { serve } from './serve.mjs';
import { today } from './util.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

export async function launchChrome(W, H) {
  const bin = CANDIDATES.find((p) => fs.existsSync(p));
  if (!bin) throw new Error('Chrome을 찾지 못했다. CHROME_PATH 환경 변수로 경로를 알려 준다.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kpu-ppt-chrome-'));
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    // 3D 장(three.js)이 헤드리스에서도 그려지게: GPU가 막히면 소프트웨어 WebGL로
    '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) { proc.kill(); throw new Error('Chrome 디버그 포트를 열지 못했다'); }
  await sleep(100);
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  return { proc, port, dir };
}

// 현재 장에서 찾는 문제들 (페이지 안에서 실행)
const PROBE = (W, H) => `(() => {
  const sec = Reveal.getCurrentSlide(), sc = Reveal.getScale() || 1, bad = [];
  const vis = (e) => e.checkVisibility ? e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;
  const texts = [];
  sec.querySelectorAll('*').forEach((e) => {
    if (e.closest('aside.notes') || e.classList.contains('step')) return;
    if (!vis(e)) return;
    const b = e.getBoundingClientRect();
    if (!b.width || !b.height) return;
    if (b.right > ${W} + 1 || b.bottom > ${H} + 1 || b.left < -1 || b.top < -1) bad.push(['OVERFLOW', (e.getAttribute('class') || e.tagName) + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round).join(',')]);
    const own = [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (!own) return;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    let px = fs;
    if (e.closest('svg')) { const m = e.getScreenCTM && e.getScreenCTM(); px = fs * (m ? Math.hypot(m.a, m.b) : 1) / sc; }
    if (px < 23.5) bad.push(['SMALL', px.toFixed(1) + 'px ' + e.textContent.trim().slice(0, 30)]);
    texts.push({ b, t: e.textContent.trim().slice(0, 20), e });
  });
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], c = texts[j];
    if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
    const ix = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left), iy = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
    if (ix > 4 && iy > 4) bad.push(['OVERLAP', '"' + a.t + '" ↔ "' + c.t + '"']);
  }
  return bad.slice(0, 20);
})()`;

export async function capture(deck, opt) {
  const [W, H] = String(opt.size || '1920x1080').split('x').map(Number);
  const out = path.resolve(opt.out || path.join(deck, 'reviews', today() + (opt.size && opt.size !== '1920x1080' ? `-${W}` : '')));
  fs.mkdirSync(out, { recursive: true });
  const only = opt.only ? String(opt.only).split(',') : null;
  const wait = Number(opt.wait || 800);
  const { server, port: httpPort } = await serve(path.join(deck, 'web'));
  const chrome = await launchChrome(W, H);
  const errs = [];
  try {
    const t = await (await fetch(`http://127.0.0.1:${chrome.port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 0; const pend = {};
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
      if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push('LOG ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
    await new Promise((r) => (ws.onopen = r));
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    // --no3d: 3D 장을 대체 그림(같은 카메라 PNG)으로 찍는다 (stage3d.js가 ?no3d를 본다)
    await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/index.html${opt.no3d ? '?no3d' : ''}` });
    for (let i = 0; i < 100; i++) { if (await ev('document.documentElement.dataset.ready === "1"')) break; await sleep(100); }
    await ev('document.fonts.ready.then(() => 1)');
    const info = await ev(`[...document.querySelectorAll('.reveal .slides > section')].map((s) => ({ slug: s.dataset.slug, steps: s.querySelectorAll('.fragment.step').length, wait: Number(s.dataset.wait || 0) }))`);
    if (!info?.length) throw new Error('장이 하나도 없다 (assemble을 먼저)');
    const rows = [];
    for (const [h, s] of info.entries()) {
      if (only && !only.includes(s.slug)) continue;
      const fs_ = opt.steps ? Array.from({ length: s.steps + 1 }, (_, k) => k - 1) : [s.steps - 1];
      for (const f of fs_) {
        await ev(`Reveal.slide(${h}, 0, ${f})`);
        // 장마다 기다림: <section data-wait="2600"> (3D 그리기·카메라 이동이 끝난 뒤를 찍는다)
        await sleep(Math.max(wait, s.wait));
        const name = `${String(h + 1).padStart(2, '0')}-${s.slug}-${opt.steps ? `f${f + 1}` : 'final'}`;
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
        const bad = (await ev(PROBE(W, H))) || [];
        const pageErr = (await ev('window.__errs.splice(0)')) || [];
        pageErr.forEach((m) => bad.push(['ERROR', m]));
        rows.push({ name, bad });
        console.log(`${bad.some((b) => b[0] !== 'OVERLAP') ? '✗' : '✓'} ${name}${bad.length ? '  ' + bad.map((b) => b.join(' ')).join(' | ') : ''}`);
      }
    }
    errs.forEach((m) => rows.push({ name: '(페이지)', bad: [['ERROR', m]] }));
    const count = (k) => rows.reduce((a, r) => a + r.bad.filter((b) => b[0] === k).length, 0);
    const errors = count('SMALL') + count('OVERFLOW') + count('ERROR');
    const md = [
      `# 검수 캡처 ${today()} (${W}×${H}${opt.steps ? ', 모든 단계' : ''})`, '',
      `오류 ${errors} (SMALL ${count('SMALL')} · OVERFLOW ${count('OVERFLOW')} · ERROR ${count('ERROR')}) · 경고 OVERLAP ${count('OVERLAP')}`, '',
      '| 캡처 | 문제 |', '|---|---|',
      ...rows.map((r) => `| ${r.name.startsWith('(') ? r.name : `[${r.name}](${r.name}.png)`} | ${r.bad.map((b) => `${b[0]} ${String(b[1]).replace(/\|/g, '/')}`).join('<br>') || '—'} |`),
      '', '눈으로 볼 것: 헤드라인이 그림만 보고 3초 안에 읽히나 · 강조색이 한 화면에 하나인가 · 지난 단계가 흐리게 남나 · 흑백으로 봐도 강조가 남나',
    ].join('\n');
    fs.writeFileSync(path.join(out, 'report.md'), md + '\n');
    console.log(`\n${out}/report.md — 오류 ${errors}, 겹침 경고 ${count('OVERLAP')}`);
    ws.close();
    return errors;
  } finally {
    chrome.proc.kill();
    server.close();
    try { fs.rmSync(chrome.dir, { recursive: true, force: true }); } catch {}
  }
}
