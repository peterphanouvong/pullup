/**
 * The waitlist, locally: who asked for early access, and a tick per
 * address for "sent them the TestFlight link". Runs on this machine only
 * and talks to the database with the service role, which is the only
 * thing that can read the table (see 20261102000000_waitlist.sql).
 *
 *   npm run waitlist
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase dashboard →
 * Project settings → API keys → service_role). Never ship that key
 * anywhere; this script is why it's in a local, gitignored file.
 */
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then: npm run waitlist');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PORT = Number(process.env.PORT ?? 4321);

async function listWaitlist() {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id, email, source, created_at, invited_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function setInvited(id, invited) {
  const { error } = await supabase
    .from('waitlist')
    .update({ invited_at: invited ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw.length > 0 ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  try {
    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE);
      return;
    }
    if (req.method === 'GET' && path === '/api/waitlist') {
      json(res, 200, await listWaitlist());
      return;
    }
    const invite = path.match(/^\/api\/waitlist\/([0-9a-f-]{36})\/invited$/);
    if (req.method === 'POST' && invite) {
      const { invited } = await readJson(req);
      await setInvited(invite[1], Boolean(invited));
      json(res, 200, { ok: true });
      return;
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    // PostgREST errors are plain objects with a message, not Error instances.
    const message = e != null && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    json(res, 500, { error: message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Waitlist dashboard: http://localhost:${PORT}`);
});

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pull Up waitlist</title>
<style>
  :root { color-scheme: dark; --bg: #0B0B0C; --card: #141416; --line: rgba(255,255,255,0.1); --ink: #F3F4F6; --muted: #9CA3AF; --accent: #3D8BF7; --ok: #34C277; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 -apple-system, system-ui, sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  .counts { color: var(--muted); font-size: 14px; }
  .counts b { color: var(--ink); font-weight: 600; }
  .bar { display: flex; gap: 8px; margin: 20px 0 12px; flex-wrap: wrap; align-items: center; }
  .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
  .seg button { background: transparent; border: 0; color: var(--muted); padding: 6px 14px; cursor: pointer; font: inherit; font-size: 14px; }
  .seg button.on { background: rgba(255,255,255,0.08); color: var(--ink); }
  .btn { background: transparent; border: 1px solid var(--line); border-radius: 999px; color: var(--ink); padding: 6px 14px; cursor: pointer; font: inherit; font-size: 14px; }
  .btn:hover { background: rgba(255,255,255,0.06); }
  .btn.small { padding: 3px 10px; font-size: 13px; color: var(--muted); }
  input[type=search] { flex: 1; min-width: 180px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); padding: 7px 12px; font: inherit; outline: 0; }
  input[type=search]:focus { border-color: var(--accent); }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; border-top: 1px solid var(--line); vertical-align: middle; }
  th { border-top: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; }
  td.check { width: 44px; }
  td.email { font-weight: 500; word-break: break-all; }
  td.when, td.src { color: var(--muted); font-size: 13px; white-space: nowrap; }
  tr.sent td.email { color: var(--muted); text-decoration: line-through; text-decoration-color: rgba(255,255,255,0.3); }
  input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--ok); cursor: pointer; }
  .empty { padding: 40px; text-align: center; color: var(--muted); }
  .err { color: #F87171; margin-top: 12px; }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #fff; color: #000; padding: 8px 14px; border-radius: 999px; font-size: 14px; opacity: 0; transition: opacity .15s; pointer-events: none; }
  .toast.on { opacity: 1; }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>Early access</h1>
    <div class="counts" id="counts"></div>
  </div>
  <div class="bar">
    <div class="seg" id="filter">
      <button data-f="todo" class="on">To send</button>
      <button data-f="sent">Sent</button>
      <button data-f="all">All</button>
    </div>
    <input type="search" id="q" placeholder="Search emails" />
    <button class="btn" id="copyAll">Copy emails shown</button>
    <button class="btn" id="refresh">Refresh</button>
  </div>
  <table>
    <thead><tr><th></th><th>Email</th><th>Signed up</th><th>From</th><th></th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div class="err" id="err"></div>
</div>
<div class="toast" id="toast"></div>
<script>
  let rows = [];
  let filter = 'todo';
  const $ = (s) => document.querySelector(s);

  function fmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('on'), 1400);
  }

  function shown() {
    const q = $('#q').value.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'todo' && r.invited_at) return false;
      if (filter === 'sent' && !r.invited_at) return false;
      return q.length === 0 || r.email.toLowerCase().includes(q);
    });
  }

  function render() {
    const sent = rows.filter((r) => r.invited_at).length;
    $('#counts').innerHTML = '<b>' + rows.length + '</b> signed up · <b>' + sent + '</b> sent · <b>' + (rows.length - sent) + '</b> to go';
    const list = shown();
    const body = $('#rows');
    body.innerHTML = '';
    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="empty">' + (rows.length === 0 ? 'Nobody yet.' : 'Nothing here.') + '</td></tr>';
      return;
    }
    for (const r of list) {
      const tr = document.createElement('tr');
      if (r.invited_at) tr.className = 'sent';
      tr.innerHTML =
        '<td class="check"><input type="checkbox" ' + (r.invited_at ? 'checked' : '') + ' title="' + (r.invited_at ? 'Sent ' + fmt(r.invited_at) : 'Mark as sent') + '" /></td>' +
        '<td class="email"></td>' +
        '<td class="when">' + fmt(r.created_at) + '</td>' +
        '<td class="src">' + (r.source ? String(r.source).replace(/[<>&]/g, '') : '') + '</td>' +
        '<td><button class="btn small">Copy</button></td>';
      tr.querySelector('.email').textContent = r.email;
      tr.querySelector('input').addEventListener('change', (e) => setInvited(r, e.target.checked));
      tr.querySelector('button').addEventListener('click', () => {
        navigator.clipboard.writeText(r.email).then(() => toast('Copied ' + r.email));
      });
      body.appendChild(tr);
    }
  }

  async function load() {
    $('#err').textContent = '';
    try {
      const res = await fetch('/api/waitlist');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      rows = data;
      render();
    } catch (e) {
      $('#err').textContent = 'Couldn\\'t load: ' + e.message;
    }
  }

  async function setInvited(row, invited) {
    const before = row.invited_at;
    row.invited_at = invited ? new Date().toISOString() : null;
    render();
    try {
      const res = await fetch('/api/waitlist/' + row.id + '/invited', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invited }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      toast(invited ? 'Marked as sent' : 'Back on the list');
    } catch (e) {
      row.invited_at = before;
      render();
      $('#err').textContent = 'Couldn\\'t save: ' + e.message;
    }
  }

  $('#filter').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.f;
    for (const x of $('#filter').children) x.classList.toggle('on', x === b);
    render();
  });
  $('#q').addEventListener('input', render);
  $('#refresh').addEventListener('click', load);
  $('#copyAll').addEventListener('click', () => {
    const emails = shown().map((r) => r.email);
    if (emails.length === 0) return toast('Nothing to copy');
    navigator.clipboard.writeText(emails.join(', ')).then(() => toast('Copied ' + emails.length + ' email' + (emails.length === 1 ? '' : 's')));
  });

  load();
</script>
</body>
</html>`;
