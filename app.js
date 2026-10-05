/* =========================================================================
   StockPilot Industrie — app.js
   Vanilla JS, no build step. Sections:
     1. Utilities
     2. Icons
     3. Storage adapter (localStorage today, swap for an API later)
     4. Repository (all data access goes through here)
     5. Domain helpers (roles, stock status, formatting)
     6. Demo data
     7. UI primitives (toast, modal, confirm, menu, lightbox)
     8. Image handling
     9. Navigation & shell rendering
    10. Views (dashboard, stock, journal, categories, category, settings)
    11. Forms (category, column, item, movement)
    12. Boot
   ========================================================================= */
(function () {
'use strict';

/* ======================= 1. UTILITIES ======================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const fmtNum = (n) => (n === null || n === undefined || n === '' || isNaN(n)) ? '—' : nf.format(Number(n));
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const fmtTime = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
const fmtDateTime = (iso) => `${fmtDate(iso)} ${fmtTime(iso)}`;
const relTime = (iso) => {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? 'hier' : d < 30 ? `il y a ${d} j` : fmtDate(iso);
};
const toLocalInput = (d) => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const cmp = (a, b) => {
  const an = typeof a === 'number', bn = typeof b === 'number';
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (an && bn) return a - b;
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
};
const initials = (s) => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* ======================= 2. ICONS ======================= */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  stock: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  journal: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M9 4v16M15 4v16"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M3 15h18M9 10v10"/>',
  cards: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  in: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  out: '<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  adjust: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 014.5 5H9l2 2h8.5A1.5 1.5 0 0121 8.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.8-.7-.7-2.8z"/>',
  back: '<path d="M19 12H5"/><path d="M11 5l-7 7 7 7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14.5l2.5 2.5L16 12"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('[data-icon]', root).forEach(el => { if (!el.dataset.ready) { el.innerHTML = icon(el.dataset.icon); el.dataset.ready = '1'; } });
const ic = (n) => `<span data-icon="${n}"></span>`;

/* ======================= 3. STORAGE ADAPTER ======================= */
/* Replace this object with an API-backed adapter (fetch/POST) to plug a real backend.
   The rest of the app only talks to Repo, never to localStorage directly. */
const StorageAdapter = (() => {
  const KEY = 'stockpilot.db.v1';
  let memory = null;
  return {
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* storage blocked */ }
      return memory ? clone(memory) : null;
    },
    save(db) {
      memory = db;
      try { localStorage.setItem(KEY, JSON.stringify(db)); return { ok: true }; }
      catch (e) { return { ok: false, error: e }; }
    },
    clear() { memory = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
    usage() { try { const raw = localStorage.getItem(KEY) || ''; return raw.length * 2; } catch (e) { return 0; } },
  };
})();


/* ======================= 3b. CLOUD SYNC (artifact db capability) =======================
   When the app runs as a claude.ai artifact, every change is also written to the artifact's
   database: one document per category / item / movement, plus sp_meta/settings.
   localStorage stays the fast local cache; the cloud copy is the source of truth. */
const Cloud = (() => {
  let db = null; let getDb = null; let timer = null; let flushing = false; let pending = false; let lastRev = 0; let mergeOnce = false; let onRemoteCb = null;
  const clientId = uid('k'); const last = new Map();
  /* Sécurité de synchronisation :
     - chaque article / catégorie / mouvement modifié reçoit _t (heure de la modification sur l'appareil) ;
     - quand un appareil revient avec des modifications non envoyées, on garde pour chaque fiche la version la plus récente ;
     - une fiche supprimée laisse une trace (sp_deleted) : un appareil qui avait une ancienne copie ne peut plus la faire revenir. */
  const STAMPED = { categories: 'sp_categories', items: 'sp_items', movements: 'sp_movements', interventions: 'sp_interventions', mp: 'sp_mp' };
  const seen = new Map(); let tomb = new Set();
  const TOMB_LOCAL = 'stockpilot.deleted';
  const localTomb = () => { try { return new Set(JSON.parse(localStorage.getItem(TOMB_LOCAL) || '[]')); } catch (e) { return new Set(); } };
  const saveLocalTomb = (st) => { try { localStorage.setItem(TOMB_LOCAL, JSON.stringify([...st].slice(-3000))); } catch (e) { /* ignore */ } };
  const tombId = (k) => k.replace('/', '~');
  function docJson(x) { const t = x._t; delete x._t; const j = JSON.stringify(x); if (t !== undefined) x._t = t; return j; }
  function baseline(d) { seen.clear(); if (!d) return; Object.entries(STAMPED).forEach(([k, col]) => (d[k] || []).forEach(x => seen.set(col + '/' + x.id, docJson(x)))); }
  function stamp(d) {
    if (!d) return; const now = Date.now(); const present = new Set(); const lt = localTomb(); let tombChanged = false;
    Object.entries(STAMPED).forEach(([k, col]) => (d[k] || []).forEach(x => { const key = col + '/' + x.id; present.add(key); const j = docJson(x); if (seen.get(key) !== j) { x._t = now; seen.set(key, j); if (lt.delete(key)) tombChanged = true; } }));
    seen.forEach((j, key) => { if (!present.has(key)) { seen.delete(key); lt.add(key); tombChanged = true; } });
    if (tombChanged) saveLocalTomb(lt);
  }
  const stampOf = (x) => x ? (x._t || Date.parse(x.updatedAt || x.date || x.createdAt || 0) || 0) : 0;
  /** Fusion fiche par fiche : la version la plus récente gagne ; les fiches supprimées (ici ou ailleurs) ne reviennent pas. */
  function mergeLww(local, remote) {
    const lt = localTomb(); const out = Object.assign({}, remote);
    Object.entries(STAMPED).forEach(([k, col]) => {
      const R = new Map((remote[k] || []).map(x => [x.id, x])); const L = new Map((local[k] || []).map(x => [x.id, x])); const res = [];
      new Set([...R.keys(), ...L.keys()]).forEach(id => {
        const key = col + '/' + id; if (tomb.has(key)) return;
        const r = R.get(id), l = L.get(id);
        if (r && l) res.push(stampOf(l) > stampOf(r) ? l : r);
        else if (l) res.push(l);                      // créé sur cet appareil
        else if (!lt.has(key)) res.push(r);           // pas supprimé ici
      });
      const order = new Map((remote[k] || []).map((x, i) => [x.id, i])); const lorder = new Map((local[k] || []).map((x, i) => [x.id, i]));
      const pos = (x) => order.has(x.id) ? order.get(x.id) : 1e6 + (lorder.get(x.id) || 0); res.sort((a, b) => pos(a) - pos(b));
      out[k] = res;
    });
    out.movements.sort((a, b) => b.date.localeCompare(a.date));
    const done = new Set([...((remote.settings || {}).tasksDone || []), ...((local.settings || {}).tasksDone || [])]);
    out.settings = Object.assign({}, remote.settings, { tasksDone: [...done] });
    return out;
  }
  const COLS = { categories: 'sp_categories', items: 'sp_items', movements: 'sp_movements', interventions: 'sp_interventions', mp: 'sp_mp' };
  const LABELS = { local: 'Enregistré sur cet appareil', connecting: 'Connexion…', saving: 'Enregistrement…', saved: 'Enregistré', error: 'Erreur de sauvegarde', readonly: 'Lecture seule' };
  let status = 'local';
  function setStatus(s, detail) {
    status = s; const el = $('#syncChip'); if (!el) return;
    el.dataset.state = s; $('.t', el).textContent = (LAN.on && { saved: 'Enregistré sur le serveur', error: 'Serveur injoignable', connecting: 'Connexion au serveur…' }[s]) || LABELS[s] || s;
    el.title = detail || (s === 'saved' ? (LAN.on ? 'Toutes les modifications sont enregistrées sur le serveur de l’usine' : 'Toutes les modifications sont enregistrées en ligne') : s === 'local' ? 'Données enregistrées dans ce navigateur' : '');
  }
  /* sp_meta/settings is always written LAST: a cloud copy without it is an unfinished upload and is never adopted. */
  function toMap(d) {
    const m = new Map();
    d.categories.forEach((c, i) => m.set(`${COLS.categories}/${c.id}`, Object.assign({}, c, { _order: i })));
    d.items.forEach(x => m.set(`${COLS.items}/${x.id}`, x));
    d.movements.forEach(x => m.set(`${COLS.movements}/${x.id}`, x));
    (d.interventions || []).forEach(x => m.set(`${COLS.interventions}/${x.id}`, x));
    (d.mp || []).forEach(x => m.set(`${COLS.mp}/${x.id}`, x));
    m.set('sp_meta/settings', { settings: d.settings, schemaVersion: d.schemaVersion || 1 });
    return m;
  }
  const DIRTY = 'stockpilot.dirty';
  const setDirty = (v) => { try { v ? localStorage.setItem(DIRTY, '1') : localStorage.removeItem(DIRTY); } catch (e) { /* ignore */ } };
  const isDirty = () => { try { return localStorage.getItem(DIRTY) === '1'; } catch (e) { return false; } };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function withRetry(fn) {
    for (let k = 0; ; k++) {
      try { return await fn(); } catch (e) {
        if (!e || !['unavailable', 'resource_exhausted', 'resource-exhausted', 'deadline-exceeded', 'aborted'].includes(e.code) || k >= 8) throw e;
        await sleep(Math.min(30000, 600 * 2 ** k) + Math.random() * 400);
      }
    }
  }
  async function readAll(col, field) {
    const out = new Map(); let cursor = null;
    for (let page = 0; page < 50; page++) {
      let q = db.collection(col).orderBy(field, 'desc').limit(1000); if (cursor) q = q.where(field, '<=', cursor);
      const snap = await withRetry(() => q.get()); let fresh = 0;
      snap.docs.forEach(d => { if (!out.has(d.id)) { out.set(d.id, clone(d.data())); fresh++; } });
      if (snap.size < 1000 || !fresh) break; cursor = snap.docs[snap.docs.length - 1].data()[field];
    }
    return [...out.values()];
  }
  async function pull() {
    const meta = await withRetry(() => db.doc('sp_meta/settings').get()); if (!meta.exists) return null;
    const [cats, items, movements, interventions, mp] = await Promise.all([readAll(COLS.categories, 'createdAt'), readAll(COLS.items, 'createdAt'), readAll(COLS.movements, 'date'), readAll(COLS.interventions, 'createdAt'), readAll(COLS.mp, 'createdAt')]);
    mp.sort((a, b) => (a.order || 0) - (b.order || 0));
    cats.sort((a, b) => (a._order ?? 0) - (b._order ?? 0)); cats.forEach(c => delete c._order);
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); movements.sort((a, b) => b.date.localeCompare(a.date));
    const m = meta.data();
    try { const dead = await readAll('sp_deleted', 'at'); tomb = new Set(dead.map(t => t.key).filter(Boolean)); } catch (e) { /* trace absente : rien à filtrer */ }
    const alive = (col) => (x) => !tomb.has(col + '/' + x.id);
    return { schemaVersion: m.schemaVersion || 1, settings: m.settings || {}, categories: cats.filter(alive(COLS.categories)), items: items.filter(alive(COLS.items)), movements: movements.filter(alive(COLS.movements)), interventions: interventions.filter(alive(COLS.interventions)), mp: mp.filter(alive(COLS.mp)) };
  }
  function remember(d) { last.clear(); toMap(d).forEach((v, k) => last.set(k, JSON.stringify(v))); }
  async function flush() {
    if (!db) return; if (flushing) { pending = true; return; }
    flushing = true;
    try {
      do {
        pending = false; const cur = toMap(getDb()); const ops = [];
        cur.forEach((v, k) => { const j = JSON.stringify(v); if (last.get(k) !== j) ops.push([k, v, j]); });
        if (!mergeOnce) last.forEach((j, k) => { if (!cur.has(k)) ops.push([k, null, null]); });
        for (const [k, v, j] of ops) {
          if (v && j.length > 250000) { toast('Article trop lourd pour la sauvegarde en ligne (images trop grandes). Retirez une image.', 'bad'); continue; }
          await withRetry(() => v ? db.doc(k).set(v) : db.doc(k).delete());
          if (!v && k !== 'sp_meta/settings') { await withRetry(() => db.doc('sp_deleted/' + tombId(k)).set({ key: k, at: new Date().toISOString() })); tomb.add(k); }
          else if (v && tomb.has(k)) { await withRetry(() => db.doc('sp_deleted/' + tombId(k)).delete()); tomb.delete(k); }
          if (v) last.set(k, j); else last.delete(k);
        }
        if (ops.length) { lastRev = Date.now(); await withRetry(() => db.doc('sp_meta/rev').set({ by: clientId, n: lastRev, at: new Date().toISOString() })); }
      } while (pending);
      setDirty(false); setStatus('saved'); saveLocalTomb(new Set());
      if (mergeOnce) { mergeOnce = false; try { const fresh = await pull(); if (fresh && onRemoteCb) { remember(fresh); onRemoteCb(fresh); } } catch (e) { /* next change */ } }
    } catch (e) {
      if (e && (e.code === 'invalid_argument' || e.code === 'permission-denied')) { setStatus('readonly', "Vous n'avez pas le droit de modifier ces données."); if (e.code === 'permission-denied') toast('Accès refusé : ce compte n’est pas autorisé à modifier les données.', 'bad'); }
      else if (e && e.code === 'quota_exceeded') { setStatus('error', e.message); toast('Espace de sauvegarde en ligne plein.', 'bad'); }
      else { setStatus('error', `${(e && e.code) || ''} ${(e && e.message) || ''}`.trim()); setTimeout(() => schedule(), 8000); }
    } finally { flushing = false; }
  }
  function schedule() { if (!db) { if (getDb) setDirty(true); setStatus('local'); return; } setDirty(true); setStatus('saving'); clearTimeout(timer); timer = setTimeout(flush, 350); }
  /** Connects to the artifact db. Resolves the remote database when one exists (caller adopts it), otherwise pushes local data up. */
  async function connect(dbGetter, onRemote) {
    getDb = dbGetter; onRemoteCb = onRemote;
    if (!window.claude || typeof window.claude.use !== 'function') { setStatus('local'); return null; }
    setStatus('connecting');
    try { db = await window.claude.use('db'); } catch (e) { db = null; }
    if (!db) { setStatus('local'); return null; }
    let remote = null;
    try { remote = await pull(); } catch (e) { setStatus('error', e.message); db = null; return null; }
    if (remote && isDirty()) { remember(remote); remote = mergeLww(getDb(), remote); setTimeout(schedule, 0); }   // modifications non envoyées : fusion fiche par fiche (la plus récente gagne), puis envoi
    else if (remote) { remember(remote); } else { last.clear(); schedule(); }
    try { const rv = await db.doc('sp_meta/rev').get(); if (rv.exists) lastRev = Math.max(lastRev, rv.data().n || 0); } catch (e) { /* ignore */ }
    db.doc('sp_meta/rev').onSnapshot(async snap => {
      if (!snap.exists) return; const r = snap.data();
      if (r.by === clientId || r.n <= lastRev) return; lastRev = r.n;
      if (flushing || pending || isDirty()) return;
      try { const fresh = await pull(); if (fresh) { remember(fresh); onRemote(fresh); } } catch (e) { /* next change retries */ }
    }, () => { /* degraded to local */ });
    if (remote) setStatus('saved');
    return remote;
  }
  return { connect, schedule, remember, stamp, baseline, status: () => status, online: () => !!db };
})();

/* ======================= 3c. SERVEUR LOCAL (réseau de l'usine) =======================
   When the page is served by StockPilot-Serveur.exe, this shim exposes the same db interface as the artifact
   capability (doc/collection/onSnapshot) on top of the server's REST API, so the Cloud module works unchanged. */
const LAN = { on: false };
const LanDb = (() => {
  const call = async (method, q, body) => {
    let r; try { r = await fetch('api/' + q, { method, cache: 'no-store', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch (e) { throw Object.assign(new Error('Serveur injoignable'), { code: 'unavailable' }); }
    if (!r.ok) throw Object.assign(new Error('Serveur : HTTP ' + r.status), { code: r.status >= 500 ? 'unavailable' : 'failed_precondition' });
    return r.json();
  };
  const doc = (p) => {
    const get = async () => { const j = await call('GET', 'doc?p=' + encodeURIComponent(p)); return { exists: !!j.exists, id: p.split('/').pop(), data: () => j.data }; };
    return {
      get, set: (d) => call('PUT', 'doc?p=' + encodeURIComponent(p), d), delete: () => call('DELETE', 'doc?p=' + encodeURIComponent(p)),
      onSnapshot(cb) { let last = null; const tick = async () => { try { const sn = await get(); const k = JSON.stringify(sn.exists ? sn.data() : null); if (k !== last) { last = k; cb(sn); } } catch (e) { /* retry next tick */ } }; tick(); const t = setInterval(tick, 3000); return () => clearInterval(t); },
    };
  };
  const collection = (c) => { const q = { orderBy: () => q, limit: () => q, where: () => q, async get() { const L = await call('GET', 'col?c=' + encodeURIComponent(c)); return { size: L.length, docs: L.map(x => ({ id: x.id, data: () => x.data })) }; } }; return q; };
  return { doc, collection };
})();
async function detectLan() {
  if (window.claude && typeof window.claude.use === 'function') return false;
  if (!/^https?:$/.test(location.protocol)) return false;
  try { const r = await fetch('api/ping', { cache: 'no-store' }); if (!r.ok) return false; const j = await r.json(); if (j.app !== 'stockpilot') return false; }
  catch (e) { return false; }
  LAN.on = true; window.claude = { use: async (n) => (n === 'db' ? LanDb : null) }; return true;
}
const LOCAL_USER = 'stockpilot.user';
const localUser = () => { try { return localStorage.getItem(LOCAL_USER) || ''; } catch (e) { return ''; } };
const setLocalUser = (u) => { try { localStorage.setItem(LOCAL_USER, u); } catch (e) { /* ignore */ } };
/** First visit on a poste of the local network: ask who uses it (the name goes in the journal and the fiches). */
function askPosteUser() {
  if (!LAN.on || localUser()) return;
  const m = Modal.open({ title: 'Bienvenue sur StockPilot', sub: 'Ce poste est connecté au serveur de l’usine', size: 'narrow',
    body: `<div class="fg"><label for="puName">Votre nom (affiché dans le journal et les fiches)</label><input class="input" id="puName" placeholder="Ex. : Ahmed — Maintenance"></div>`,
    foot: `<button class="btn btn-accent" id="puOk" type="button">Commencer</button>` });
  const ok = () => { const v = $('#puName', m.el).value.trim(); if (!v) { toast('Indiquez votre nom.', 'bad'); return; } setLocalUser(v); m.close(); renderNav(); render(); };
  $('#puOk', m.el).addEventListener('click', ok); $('#puName', m.el).addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
}

/* ======================= 3d. FIREBASE (version hébergée : GitHub Pages + Firestore) =======================
   On the hosted site, users sign in with email / password, then the Firestore client is handed to the Cloud
   module as its db (same doc / collection / onSnapshot API). The SDK files live in vendor/. */
const FB_CONFIG = { apiKey: 'AIzaSyD_EI4cnMQs8GK1Ozh_E2e55eKTG2nlCWI', authDomain: 'tunisie-silicone.firebaseapp.com', projectId: 'tunisie-silicone', storageBucket: 'tunisie-silicone.firebasestorage.app', messagingSenderId: '162053711246', appId: '1:162053711246:web:b10586a827fe073e12b0df' };
const FB = { on: false, auth: null, db: null };
function useFirebase() {
  if (window.claude && typeof window.claude.use === 'function') return false;
  if (!/^https?:$/.test(location.protocol)) return false;
  return location.hostname.endsWith('github.io') || /[?&]fb\b/.test(location.search) || !!window.SP_FIREBASE;
}
const loadScript = (src) => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Chargement impossible : ' + src)); document.head.appendChild(s); });
function seedEmpty() { return { schemaVersion: 4, settings: { company: 'Tunisie Silicone', user: '', theme: 'system' }, categories: [], items: [], movements: [], interventions: [], mp: [] }; }
const FB_ERR = { 'auth/invalid-credential': 'Email ou mot de passe incorrect.', 'auth/wrong-password': 'Email ou mot de passe incorrect.', 'auth/user-not-found': 'Aucun compte avec cet email.', 'auth/invalid-email': 'Adresse email invalide.', 'auth/too-many-requests': 'Trop d’essais. Réessayez dans quelques minutes.', 'auth/network-request-failed': 'Pas de connexion internet.', 'auth/user-disabled': 'Ce compte est désactivé.' };
const FB_ALLOWED = ['siliconetunisie@gmail.com'];
const FB_PROFILES = [{ id: 'maintenance', label: 'Maintenance', sub: 'Interventions, maintenance préventive, pièces', icon: 'wrench' }, { id: 'technique', label: 'Responsable technique', sub: 'Validation, stock, planning', icon: 'settings' }];
const PROFILE_KEY = 'stockpilot.profile';
const gIcon = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function loginShell(inner) {
  const el = document.createElement('div'); el.className = 'login'; el.id = 'login';
  el.innerHTML = `<div class="sp-glow"></div><div class="login-card"><div class="login-logo"><img src="logo-tunisie-silicone.png" alt="Tunisie Silicone"></div><h1>StockPilot</h1><p class="login-sub">Gestion de stock &amp; maintenance</p>${inner}</div>`;
  document.body.appendChild(el); hydrateIcons(el); return el;
}
const closeShell = (el) => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
/** Full-screen Google sign-in (company account); resolves once an allowed account is signed in. */
function showLogin(msg) {
  Splash.hide();
  return new Promise(resolve => {
    const el = loginShell(`<p class="login-txt">Connectez-vous avec le compte Google de la société.</p>
      <button class="btn login-google" id="lgGoogle" type="button">${gIcon}<span>Se connecter avec Google</span></button>
      <div class="login-err" id="lgErr" role="alert">${esc(msg || '')}</div>`);
    const err = (m) => { $('#lgErr', el).textContent = m || ''; };
    $('#lgGoogle', el).addEventListener('click', async () => {
      const b = $('#lgGoogle', el); b.disabled = true; err('');
      const prov = new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account', login_hint: FB_ALLOWED[0] });
      try {
        await FB.auth.signInWithPopup(prov);
        const u = FB.auth.currentUser;
        if (!u || !FB_ALLOWED.includes((u.email || '').toLowerCase())) { await FB.auth.signOut(); err(`Ce compte n’est pas autorisé. Utilisez ${FB_ALLOWED[0]}.`); b.disabled = false; return; }
        closeShell(el); resolve(u);
      } catch (x) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(x.code)) { try { await FB.auth.signInWithRedirect(prov); return; } catch (y) { x = y; } }
        if (x.code !== 'auth/popup-closed-by-user' && x.code !== 'auth/cancelled-popup-request') err(FB_ERR[x.code] || ('Connexion impossible (' + (x.code || x.message) + ').'));
        b.disabled = false;
      }
    });
  });
}
/** Who uses this device: chosen once, changeable from Paramètres. */
function chooseProfile(canCancel) {
  return new Promise(resolve => {
    const el = loginShell(`<p class="login-txt">Qui utilise cet appareil ?</p><div class="profile-pick">${FB_PROFILES.map(p => `<button type="button" class="profile-btn" data-prof="${p.id}"><span class="pi">${ic(p.icon)}</span><span class="pt"><b>${esc(p.label)}</b><span>${esc(p.sub)}</span></span></button>`).join('')}</div>${canCancel ? '<button class="login-link" type="button" data-cancel>Annuler</button>' : ''}`);
    $$('[data-prof]', el).forEach(b => b.addEventListener('click', () => { const p = FB_PROFILES.find(x => x.id === b.dataset.prof); try { localStorage.setItem(PROFILE_KEY, p.id); } catch (e) { /* ignore */ } setLocalUser(p.label); closeShell(el); resolve(p); }));
    const c = $('[data-cancel]', el); if (c) c.addEventListener('click', () => { closeShell(el); resolve(null); });
  });
}
async function startFirebase() {
  if (!useFirebase()) return false;
  try {
    if (!window.firebase) { await loadScript('vendor/firebase-app-compat.js'); await loadScript('vendor/firebase-auth-compat.js'); await loadScript('vendor/firebase-firestore-compat.js'); }
    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    FB.auth = firebase.auth(); FB.db = firebase.firestore();
  } catch (e) { toast('Connexion au serveur impossible : vérifiez internet puis rechargez la page.', 'bad'); return false; }
  FB.on = true; setupPwa(); watchUpdates();
  let redirectErr = '';
  try { await FB.auth.getRedirectResult(); } catch (e) { redirectErr = FB_ERR[e.code] || ''; }
  let user = await new Promise(r => { const un = FB.auth.onAuthStateChanged(u => { un(); r(u); }); });
  if (user && !FB_ALLOWED.includes((user.email || '').toLowerCase())) { await FB.auth.signOut(); user = null; redirectErr = `Ce compte n’est pas autorisé. Utilisez ${FB_ALLOWED[0]}.`; }
  if (!user) { Splash.hide(); await showLogin(redirectErr); }
  let prof = ''; try { prof = localStorage.getItem(PROFILE_KEY) || ''; } catch (e) { /* ignore */ }
  const p = FB_PROFILES.find(x => x.id === prof);
  if (p) setLocalUser(p.label); else { Splash.hide(); await chooseProfile(false); }
  window.claude = { use: async (n) => (n === 'db' ? FB.db : null) };
  return true;
}
async function signOutFirebase() {
  if (!FB.on) return;
  if (!(await confirmDialog({ title: 'Se déconnecter ?', message: 'Vous devrez saisir à nouveau votre email et votre mot de passe sur cet appareil.', confirmLabel: 'Se déconnecter', danger: false }))) return;
  try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(LOCAL_USER); } catch (e) { /* ignore */ }
  await FB.auth.signOut(); StorageAdapter.clear(); location.reload();
}
/* ---- Installed app (phone / PC icon): service worker for instant start + install button ---- */
let installEvt = null;
const APP_VERSION = '20261005105645';
/** Mise à jour automatique : dès qu'une nouvelle version est publiée, l'application se recharge toute seule
    (au démarrage, toutes les 5 min et quand on revient sur l'onglet / l'application), sauf si une fenêtre est ouverte. */
function watchUpdates() {
  if (APP_VERSION === 'dev' || !FB.on) return;
  let waiting = false;
  const check = async () => {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = (await r.json()).v; if (!v || v === APP_VERSION) return;
      if (Cloud.status() === 'saving') { setTimeout(check, 3000); return; }
      if (Modal.top() || document.querySelector('input:focus, textarea:focus')) { if (!waiting) { waiting = true; toast('Nouvelle version disponible : elle s’installera à la fermeture de cette fenêtre.', 'ok'); } setTimeout(check, 15000); return; }
      location.reload();
    } catch (e) { /* hors ligne : on réessaie plus tard */ }
  };
  setTimeout(check, 2500); setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
function setupPwa() {
  if (!FB.on || !('serviceWorker' in navigator) || (location.protocol !== 'https:' && location.hostname !== 'localhost')) return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* optional */ });
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; showInstallChip(); });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let seen = false; try { seen = localStorage.getItem('stockpilot.iosHint') === '1'; } catch (x) { /* ignore */ }
  if (ios && !seen) setTimeout(() => { toast('Pour l’icône sur l’écran : bouton Partager puis « Sur l’écran d’accueil ».', 'ok'); try { localStorage.setItem('stockpilot.iosHint', '1'); } catch (x) { /* ignore */ } }, 5000);
}
function showInstallChip() {
  if ($('#installApp') || !installEvt) return;
  const b = document.createElement('button'); b.id = 'installApp'; b.type = 'button'; b.className = 'install-chip';
  b.innerHTML = `${ic('download')}<span>Installer l’application</span>`; hydrateIcons(b);
  b.addEventListener('click', async () => { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); if (r && r.outcome === 'accepted') { b.remove(); toast('Application installée : l’icône StockPilot est sur l’écran d’accueil', 'ok'); } installEvt = null; });
  document.body.appendChild(b);
  window.addEventListener('appinstalled', () => b.remove());
}
/** Weekly reminder to download a backup copy (Settings → Sauvegarder). */
function backupReminder() {
  if (!FB.on && !Cloud.online()) return;
  let last = 0; try { last = Number(localStorage.getItem('stockpilot.lastBackup') || 0); } catch (e) { /* ignore */ }
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (days !== null && days < 7) return;
  const t = document.createElement('div'); t.className = 'toast backup-toast';
  t.innerHTML = `${ic('download')}<span>${days === null ? 'Aucune copie de sauvegarde sur cet appareil.' : `Dernière copie de sauvegarde il y a ${days} jours.`}</span><button class="btn btn-sm" type="button">Sauvegarder</button><button class="icon-btn small" type="button" aria-label="Plus tard">${ic('x')}</button>`;
  hydrateIcons(t); $('#toasts').appendChild(t);
  const [go, x] = $$('button', t);
  go.addEventListener('click', () => { t.remove(); exportBackup(); });
  x.addEventListener('click', () => t.remove());
  setTimeout(() => t.remove(), 20000);
}
function exportBackup() {
  downloadText(JSON.stringify(Repo.raw(), null, 1), `stockpilot-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  try { localStorage.setItem('stockpilot.lastBackup', String(Date.now())); } catch (e) { /* ignore */ }
  toast('Copie de sauvegarde téléchargée', 'ok');
}

/* ======================= 4. REPOSITORY ======================= */
const Repo = (() => {
  let db = null;
  const persist = () => {
    Cloud.stamp(db);
    const r = StorageAdapter.save(db);
    if (!r.ok && !Cloud.online()) toast("Stockage local plein : l'image ou la modification n'a pas pu être enregistrée durablement.", 'bad');
    Cloud.schedule();
    return r.ok;
  };
  const touch = (o) => { o.updatedAt = new Date().toISOString(); return o; };

  const api = {
    init(seedFn) {
      db = StorageAdapter.load();
      if (!db || !db.categories) { db = seedFn(); migrate(db); persist(); }
      db.settings = Object.assign({ company: 'Tunisie Silicone', user: 'Admin', theme: 'system' }, db.settings || {});
      Cloud.baseline(db);
      if (migrate(db)) persist();
      return db;
    },
    raw: () => db,
    commit() { persist(); },
    replace(newDb) { db = newDb; migrate(db); persist(); },
    /** Takes a database coming from the cloud without pushing it back. */
    adopt(remoteDb) { db = remoteDb; db.settings = Object.assign({ company: 'Tunisie Silicone', user: 'Admin', theme: 'system' }, db.settings || {}); const changed = migrate(db); Cloud.baseline(db); StorageAdapter.save(db); if (changed) Cloud.schedule(); },
    reset(seedFn) { db = seedFn(); migrate(db); persist(); },
    settings: {
      get: () => { const u = localUser(); return u ? Object.assign({}, db.settings, { user: u }) : db.settings; },
      update(patch) { if ('user' in patch && (LAN.on || localUser())) { setLocalUser(patch.user); patch = Object.assign({}, patch); delete patch.user; } Object.assign(db.settings, patch); persist(); },
    },
    categories: {
      list: () => db.categories,
      get: (id) => db.categories.find(c => c.id === id),
      create(data) { const c = { id: uid('c'), kind: data.kind || 'items', parentId: data.parentId || null, name: data.name, code: data.code || initials(data.name), color: data.color, description: data.description || '', columns: data.kind === 'folder' ? [] : (data.columns || []), createdAt: new Date().toISOString() }; db.categories.push(c); persist(); return c; },
      children: (id) => db.categories.filter(c => (c.parentId || null) === (id || null)),
      update(id, patch) { const c = api.categories.get(id); Object.assign(c, patch); touch(c); persist(); return c; },
      remove(id) { const c = api.categories.get(id); db.categories.forEach(x => { if (x.parentId === id) x.parentId = c.parentId || null; }); db.categories = db.categories.filter(x => x.id !== id); const gone = new Set(db.items.filter(i => i.categoryId === id).map(i => i.id)); db.items = db.items.filter(i => i.categoryId !== id); unlinkRef('c:' + id); gone.forEach(g => unlinkRef('i:' + g)); persist(); },
    },
    columns: {
      add(catId, col, applyDefault) {
        const c = api.categories.get(catId); const nc = Object.assign({ id: uid('f') }, col); c.columns.push(nc);
        if (applyDefault && nc.default !== undefined && nc.default !== '') db.items.filter(i => i.categoryId === catId).forEach(i => { if (i.values[nc.id] === undefined) i.values[nc.id] = castValue(nc, nc.default); });
        if (nc.role) enforceUniqueRole(c, nc);
        persist(); return nc;
      },
      update(catId, colId, patch) {
        const c = api.categories.get(catId); const col = c.columns.find(x => x.id === colId); const typeChanged = patch.type && patch.type !== col.type;
        Object.assign(col, patch);
        if (typeChanged) db.items.filter(i => i.categoryId === catId).forEach(i => { if (i.values[colId] !== undefined) i.values[colId] = castValue(col, i.values[colId]); });
        if (col.role) enforceUniqueRole(c, col);
        persist(); return col;
      },
      remove(catId, colId) { const c = api.categories.get(catId); c.columns = c.columns.filter(x => x.id !== colId); db.items.filter(i => i.categoryId === catId).forEach(i => delete i.values[colId]); persist(); },
      move(catId, colId, dir) { const c = api.categories.get(catId); const i = c.columns.findIndex(x => x.id === colId); const j = i + dir; if (j < 0 || j >= c.columns.length) return; [c.columns[i], c.columns[j]] = [c.columns[j], c.columns[i]]; persist(); },
    },
    items: {
      list: () => db.items,
      byCategory: (catId) => db.items.filter(i => i.categoryId === catId),
      get: (id) => db.items.find(i => i.id === id),
      create(catId, values) { const now = new Date().toISOString(); const it = { id: uid('i'), categoryId: catId, values, createdAt: now, updatedAt: now }; db.items.push(it); persist(); return it; },
      update(id, values) { const it = api.items.get(id); it.values = values; touch(it); persist(); return it; },
      remove(id) { db.items = db.items.filter(i => i.id !== id); unlinkRef('i:' + id); persist(); },
    },
    interventions: {
      list: () => db.interventions || (db.interventions = []),
      create(f) { const now = new Date().toISOString(); const x = Object.assign({}, f, { id: uid('fi'), createdAt: now, updatedAt: now, createdBy: api.settings.get().user }); api.interventions.list().push(x); persist(); return x; },
      update(f) { const L = api.interventions.list(); const i = L.findIndex(x => x.id === f.id); if (i < 0) return; L[i] = Object.assign({}, f, { updatedAt: new Date().toISOString() }); persist(); return L[i]; },
      remove(id) { db.interventions = api.interventions.list().filter(x => x.id !== id); persist(); },
    },
    mp: {
      list: () => db.mp || (db.mp = []),
      create(t) { const L = api.mp.list(); const x = Object.assign({ history: [], active: true }, t, { id: uid('mp'), order: L.reduce((m, y) => Math.max(m, y.order || 0), 0) + 1, createdAt: new Date().toISOString() }); L.push(x); persist(); return x; },
      update(t) { const L = api.mp.list(); const i = L.findIndex(x => x.id === t.id); if (i < 0) return; L[i] = Object.assign({}, t, { updatedAt: new Date().toISOString() }); persist(); return L[i]; },
      remove(id) { db.mp = api.mp.list().filter(x => x.id !== id); persist(); },
    },
    journal: {
      list: () => db.movements,
      forItem: (itemId) => db.movements.filter(m => m.itemId === itemId),
      add(m) { const mv = Object.assign({ id: uid('m'), user: api.settings.get().user }, m); db.movements.unshift(mv); db.movements.sort((a, b) => b.date.localeCompare(a.date)); persist(); return mv; },
    },
  };
  /* Schema v1 → v2: categories become a tree. Existing categories are grouped under the folders Machines and Produits. */
  function migrate(d) {
    let changed = migrateV2(d);
    if (!Array.isArray(d.interventions)) d.interventions = [];
    if ((d.schemaVersion || 1) < 3) {
      d.categories.forEach(c => { if (c.kind !== 'folder' && c.columns.some(x => x.type === 'quantity') && !c.columns.some(x => x.type === 'link')) {
        const col = { id: uid('f'), name: 'En commun avec', type: 'link', required: false, default: '', options: [], role: '', unit: '' };
        const locIdx = c.columns.findIndex(x => x.role === 'location'); c.columns.splice(locIdx >= 0 ? locIdx + 1 : c.columns.length, 0, col);
      } });
      d.schemaVersion = 3; changed = true;
    }
    if (d.schemaVersion < 4) { if (!Array.isArray(d.mp) || !d.mp.length) d.mp = seedMaintenance(d); d.schemaVersion = 4; changed = true; }
    if (!Array.isArray(d.mp)) d.mp = [];
    // Articles supprimés définitivement : retirés aussi s'ils reviennent d'un appareil qui avait une ancienne copie.
    const PURGED = /^[im]-jpr2-/;
    if ((d.items || []).some(i => PURGED.test(i.id)) || (d.movements || []).some(m => PURGED.test(m.id))) {
      d.items = d.items.filter(i => !PURGED.test(i.id)); d.movements = d.movements.filter(m => !PURGED.test(m.id)); changed = true;
    }
    return changed;
  }
  function migrateV2(d) {
    if ((d.schemaVersion || 1) >= 2) return false;
    d.categories.forEach(c => { c.kind = c.kind || 'items'; c.parentId = c.parentId || null; });
    const byName = (n) => d.categories.find(c => c.kind !== 'folder' && c.name.toLowerCase() === n.toLowerCase());
    const mkFolder = (name, code, color, description) => { const f = { id: uid('c'), kind: 'folder', parentId: null, name, code, color, description, columns: [], createdAt: new Date().toISOString() }; d.categories.unshift(f); return f; };
    const produits = ['Produits finis', 'Matières premières'].map(byName).filter(Boolean);
    const machines = ["Machines d'injection", 'Pièces de rechange', 'Joints'].map(byName).filter(Boolean);
    if (produits.length) { const f = mkFolder('Produits', 'PRD', '#D9146F', 'Produits finis et matières premières.'); produits.forEach(c => c.parentId = f.id); }
    if (machines.length) { const f = mkFolder('Machines', 'MAC', '#2B67A8', 'Presses, pièces de rechange et joints.'); machines.forEach(c => c.parentId = f.id); }
    d.schemaVersion = 2; return true;
  }
  function unlinkRef(ref) { db.items.forEach(i => Object.keys(i.values).forEach(k => { const v = i.values[k]; if (Array.isArray(v) && v.includes(ref)) i.values[k] = v.filter(x => x !== ref); })); }
  function enforceUniqueRole(cat, col) { cat.columns.forEach(x => { if (x !== col && x.role === col.role) x.role = ''; }); }
  return api;
})();

/* ======================= 5. DOMAIN HELPERS ======================= */
const FIELD_TYPES = {
  text: 'Texte', longtext: 'Texte long', number: 'Nombre', date: 'Date', dropdown: 'Liste déroulante',
  checkbox: 'Case à cocher', image: 'Image', reference: 'Référence', quantity: 'Quantité (stock)', link: 'En commun avec (moules / machines)',
};
const ROLES = { '': 'Aucun', reference: 'Référence article', name: 'Désignation', quantity: 'Quantité en stock', min: 'Stock minimum', max: 'Stock maximum', location: 'Emplacement' };
const ROLE_TYPES = { reference: ['reference', 'text'], name: ['text', 'longtext', 'dropdown'], quantity: ['quantity', 'number'], min: ['number', 'quantity'], max: ['number', 'quantity'], location: ['text', 'dropdown'] };
const OPS = {
  in: { label: 'Entrée de stock', short: 'Entrée', cls: 'op-in', icon: 'in' },
  out: { label: 'Sortie de stock', short: 'Sortie', cls: 'op-out', icon: 'out' },
  adjust: { label: 'Ajustement', short: 'Ajustement', cls: 'op-adj', icon: 'adjust' },
  initial: { label: 'Stock initial', short: 'Stock initial', cls: 'op-init', icon: 'box' },
  transfer: { label: 'Transfert', short: 'Transfert', cls: 'op-tr', icon: 'swap' },
};
const STATUS = { ok: { label: 'En stock', cls: 'b-ok' }, low: { label: 'Stock bas', cls: 'b-low' }, out: { label: 'Rupture', cls: 'b-out' }, na: { label: 'Non suivi', cls: 'b-na' } };
const PALETTE = ['#0E2A6B', '#1E5FD2', '#3E9BEA', '#0E8A95', '#23884F', '#7A4DB5', '#D9146F', '#B87200', '#C63A35', '#5B6B7B'];

function castValue(col, v) {
  if (v === null || v === undefined) return v;
  switch (col.type) {
    case 'number': case 'quantity': { if (v === '') return ''; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? '' : n; }
    case 'checkbox': return v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
    case 'image': return typeof v === 'string' && v.startsWith('data:') ? v : '';
    case 'link': return Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[ci]:/.test(x)) : [];
    default: return typeof v === 'string' ? v : String(v);
  }
}
function roleCol(cat, role) {
  if (!cat) return null;
  let c = cat.columns.find(x => x.role === role);
  if (c) return c;
  if (role === 'reference') return cat.columns.find(x => x.type === 'reference') || null;
  if (role === 'quantity') return cat.columns.find(x => x.type === 'quantity') || null;
  return null;
}
const catOf = (item) => Repo.categories.get(item.categoryId);
const isFolder = (c) => !!c && c.kind === 'folder';
const itemCats = () => Repo.categories.list().filter(c => !isFolder(c));
const folders = () => Repo.categories.list().filter(isFolder);
function catPath(c) { const out = []; let x = c, guard = 0; while (x && guard++ < 30) { out.unshift(x); x = x.parentId ? Repo.categories.get(x.parentId) : null; } return out; }
const catLabel = (c) => catPath(c).map(x => x.name).join(' › ');
function descendants(id) { const out = []; const walk = (pid) => Repo.categories.children(pid).forEach(c => { out.push(c); walk(c.id); }); walk(id); return out; }
/* ---- Links: an item can be shared with other moulds / categories (c:<id>) and machines / equipment (i:<id>). ---- */
function refLabel(ref) {
  const [k, id] = [ref.slice(0, 1), ref.slice(2)];
  if (k === 'c') { const c = Repo.categories.get(id); return c ? { kind: 'c', id, name: c.name, sub: catPath(c).slice(0, -1).map(x => x.name).join(' › '), color: c.color, ok: true } : null; }
  const it = Repo.items.get(id); if (!it) return null; const c = catOf(it);
  return { kind: 'i', id, name: (itemRef(it) ? itemRef(it) + ' · ' : '') + itemName(it), sub: c ? c.name : '', color: c ? c.color : '#888', ok: true };
}
function linkChips(refs, opts = {}) {
  const list = (refs || []).map(refLabel).filter(Boolean); if (!list.length) return opts.empty ?? '<span class="muted">—</span>';
  return `<span class="linkchips">${list.map(l => `<button type="button" class="linkchip" data-goref="${l.kind}:${l.id}" title="${esc(l.sub ? l.sub + ' › ' : '')}${esc(l.name)}" style="--c:${l.color}">${ic(l.kind === 'c' ? 'folder' : 'settings')}<span>${esc(l.name)}</span></button>`).join('')}</span>`;
}
/** Everything a link can point to: moulds / item categories (except `exceptCat`) and equipment items (items of categories without stock). */
function linkTargets(exceptCat) {
  const cats = itemCats().filter(c => c.id !== exceptCat).map(c => ({ ref: 'c:' + c.id, label: catLabel(c) }));
  const eq = Repo.items.list().filter(i => { const c = catOf(i); return c && (!isStockCat(c) || isNonStockItem(i)); }).map(i => ({ ref: 'i:' + i.id, label: `${catOf(i).name} › ${itemRef(i) ? itemRef(i) + ' · ' : ''}${itemName(i)}` }));
  return { cats, eq };
}
const linkCols = (c) => (c ? c.columns.filter(x => x.type === 'link') : []);
/** Items (from any category) whose link fields point to `ref`. */
function linkedFrom(ref) { return Repo.items.list().filter(i => linkCols(catOf(i)).some(col => Array.isArray(i.values[col.id]) && i.values[col.id].includes(ref))); }
function bindLinkChips(root) { $$('[data-goref]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const r = b.dataset.goref; const id = r.slice(2); const top = Modal.top(); if (r[0] === 'c') { if (top) top.close(); go('category', id); } else { if (top) top.close(); openItemDetail(id); } })); }
function subtreeItems(c) { const ids = new Set([c.id, ...descendants(c.id).map(x => x.id)]); return Repo.items.list().filter(i => ids.has(i.categoryId)); }
const isStockCat = (cat) => !!roleCol(cat, 'quantity');
function itemRef(item) { const c = roleCol(catOf(item), 'reference'); return c ? (item.values[c.id] || '') : ''; }
function itemName(item) {
  const cat = catOf(item); if (!cat) return '—';
  const c = roleCol(cat, 'name'); if (c && item.values[c.id]) return String(item.values[c.id]);
  const ref = roleCol(cat, 'reference');
  const parts = cat.columns.filter(x => x !== ref && ['text', 'dropdown'].includes(x.type) && x.role !== 'location' && item.values[x.id]).slice(0, 2).map(x => item.values[x.id]);
  return parts.length ? parts.join(' · ') : (itemRef(item) || 'Article sans nom');
}
const numOrNull = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
function itemQty(item) { if (isNonStockItem(item)) return null; const c = roleCol(catOf(item), 'quantity'); return c ? numOrNull(item.values[c.id]) ?? 0 : null; }
function itemMin(item) { const c = roleCol(catOf(item), 'min'); return c ? numOrNull(item.values[c.id]) : null; }
function itemMax(item) { const c = roleCol(catOf(item), 'max'); return c ? numOrNull(item.values[c.id]) : null; }
function itemLoc(item) { const c = roleCol(catOf(item), 'location'); return c ? (item.values[c.id] || '') : ''; }
function itemImage(item) { const cat = catOf(item); const c = cat && cat.columns.find(x => x.type === 'image' && item.values[x.id]); return c ? item.values[c.id] : ''; }
function qtyUnit(item) { const c = roleCol(catOf(item), 'quantity'); return c && c.unit ? c.unit : ''; }
function stockStatus(item) {
  const q = itemQty(item); if (q === null) return 'na';
  if (q <= 0) return 'out';
  const min = itemMin(item); if (min !== null && q <= min) return 'low';
  return 'ok';
}
function lastMovement(item) { return Repo.journal.list().find(m => m.itemId === item.id) || null; }
const stockItems = () => Repo.items.list().filter(i => { const c = catOf(i); return c && isStockCat(c) && !isNonStockItem(i); });

function statusBadge(s) { const st = STATUS[s]; return `<span class="badge ${st.cls}">${st.label}</span>`; }
function opBadge(t) { const o = OPS[t] || OPS.adjust; return `<span class="op ${o.cls}">${ic(o.icon)}${o.short}</span>`; }
function thumbHtml(item, cls = 'thumb') {
  const img = itemImage(item); const cat = catOf(item);
  if (img) return `<img class="${cls}" src="${img}" alt="">`;
  return `<div class="thumb-ph" style="background:${cat ? cat.color : '#888'}">${esc((cat && cat.code) || '?')}</div>`;
}
function levelBar(item) {
  const q = itemQty(item), min = itemMin(item), max = itemMax(item); if (q === null) return '';
  const top = Math.max(max ?? 0, (min ?? 0) * 2, q, 1);
  const pct = Math.min(100, (q / top) * 100); const s = stockStatus(item);
  const color = s === 'out' ? 'var(--bad)' : s === 'low' ? 'var(--warn)' : 'var(--ok)';
  const minMark = min !== null ? `<i class="minmark" style="left:${Math.min(100, (min / top) * 100)}%" title="Stock minimum"></i>` : '';
  return `<div class="level"><div class="track"><span class="fill" style="width:${pct}%;background:${color}"></span>${minMark}</div></div>`;
}
function displayValue(col, v, forTable) {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return '<span class="muted">—</span>';
  switch (col.type) {
    case 'reference': return `<span class="ref">${esc(v)}</span>`;
    case 'number': return `<span class="num">${fmtNum(v)}${col.unit ? ' <span class="muted">' + esc(col.unit) + '</span>' : ''}</span>`;
    case 'quantity': return `<b class="num">${fmtNum(v)}</b>${col.unit ? ' <span class="muted">' + esc(col.unit) + '</span>' : ''}`;
    case 'date': return fmtDate(v);
    case 'checkbox': return v ? '<span class="check-yes">Oui</span>' : '<span class="check-no">Non</span>';
    case 'dropdown': return `<span class="tag">${esc(v)}</span>`;
    case 'image': return v ? `<img class="thumb" src="${v}" alt="">` : '';
    case 'link': return linkChips(v);
    case 'longtext': return forTable ? esc(String(v).slice(0, 60)) + (String(v).length > 60 ? '…' : '') : esc(v).replace(/\n/g, '<br>');
    default: return esc(v);
  }
}

/* ======================= 6. DEMO DATA ======================= */
function seedDemo() {
  const col = (name, type, extra = {}) => Object.assign({ id: uid('f'), name, type, required: false, default: '', options: [], role: '', unit: '' }, extra);
  const now = Date.now(); const day = 86400000;
  const iso = (dAgo, h = 9, m = 0) => { const d = new Date(now - dAgo * day); d.setHours(h, m, 0, 0); if (d.getTime() > now - 600000) d.setTime(now - 600000 - (h * 7 + m) * 60000); return d.toISOString(); };
  const cats = []; const items = []; const movements = [];
  const mk = (catDef, rows) => {
    const c = Object.assign({ id: uid('c'), createdAt: iso(40) }, catDef); cats.push(c);
    rows.forEach((r, idx) => {
      const values = {}; c.columns.forEach((cl, k) => { if (r[k] !== undefined) values[cl.id] = r[k]; });
      items.push({ id: uid('i'), categoryId: c.id, values, createdAt: iso(30 - idx * 3 - cats.length, 10), updatedAt: iso(2) });
    });
    return c;
  };

  // --- Injection machines: equipment, no stock quantity
  const mac = {
    name: "Machines d'injection", code: 'INJ', color: '#2B67A8', description: 'Parc de presses LSR et thermoplastique des ateliers A et B.',
    columns: [
      col('Groupe machine', 'dropdown', { options: ['Presses LSR', 'Presses thermoplastique', 'Presses bi-matière'] }),
      col('Fabricant', 'text'), col('Modèle', 'text', { role: 'name', required: true }),
      col('Référence machine', 'reference', { role: 'reference', required: true }),
      col('N° de série', 'text'), col('Tonnage', 'number', { unit: 't' }),
      col('Statut', 'dropdown', { options: ['En production', 'En réglage', 'En maintenance', "À l'arrêt"], default: 'En production' }),
      col('Emplacement', 'text', { role: 'location' }), col('Mise en service', 'date'), col('Photo', 'image'), col('Notes', 'longtext'),
    ],
  };
  mk(mac, [
    ['Presses LSR', 'ENGEL', 'e-victory 160 LSR', 'INJ-01', 'EV160-19-1187', 160, 'En production', 'Atelier A · Îlot 1', '2019-03-12', '', 'Moule 16 empreintes tétines.'],
    ['Presses LSR', 'ARBURG', 'Allrounder 470 A LSR', 'INJ-02', '470A-21-1903', 100, 'En production', 'Atelier A · Îlot 2', '2021-06-01', '', ''],
    ['Presses thermoplastique', 'HAITIAN', 'Mars MA1600/540', 'INJ-03', 'MA16-18-0544', 160, 'En maintenance', 'Atelier B · Îlot 1', '2016-09-20', '', 'Remplacement du clapet anti-retour prévu semaine 41.'],
    ['Presses LSR', 'KRAUSSMAFFEI', 'CX 80-380 LSR', 'INJ-04', 'CX80-23-0215', 80, 'En réglage', 'Atelier A · Îlot 3', '2023-02-15', '', 'Réglage moule sucette 0-6 m.'],
    ['Presses bi-matière', 'ENGEL', 'victory 200/80 combi', 'INJ-05', 'VC200-18-0931', 200, "À l'arrêt", 'Atelier B · Îlot 2', '2018-11-05', '', 'En attente pièce hydraulique.'],
  ]);

  // --- Joints: stock with min, no max
  const jnt = mk({
    name: 'Joints', code: 'JNT', color: '#7A4DB5', description: "Joints toriques, plats et à lèvre pour presses, moules et circuits d'eau.",
    columns: [
      col('Référence', 'reference', { role: 'reference', required: true }),
      col('Type', 'dropdown', { options: ['Joint torique', 'Joint plat', 'Joint à lèvre', 'Joint spi'] }),
      col('Matériau', 'dropdown', { options: ['NBR 70', 'FKM 75', 'EPDM 70', 'Silicone VMQ 60', 'PTFE'] }),
      col('Dimension', 'text'), col('Application', 'text'),
      col('Quantité', 'quantity', { role: 'quantity', unit: 'pcs', required: true, default: 0 }),
      col('Stock minimum', 'number', { role: 'min', unit: 'pcs' }),
      col('Emplacement', 'text', { role: 'location' }), col('Photo', 'image'), col('Notes', 'longtext'),
    ],
  }, [
    ['JT-NBR-020-25', 'Joint torique', 'NBR 70', 'Ø20 × 2,5', 'Pompe eau de refroidissement moule', 48, 20, 'MAG-A · R02 · N1'],
    ['JT-FKM-032-30', 'Joint torique', 'FKM 75', 'Ø32 × 3', 'Vérin de fermeture INJ-01', 12, 15, 'MAG-A · R02 · N2'],
    ['JP-EPDM-DN50', 'Joint plat', 'EPDM 70', 'DN50 PN16', "Circuit d'eau glacée", 0, 5, 'MAG-A · R03 · N1'],
    ['JL-NBR-456208', 'Joint à lèvre', 'NBR 70', '45 × 62 × 8', 'Vis de plastification INJ-03', 6, 4, 'MAG-A · R03 · N2'],
    ['JT-VMQ-012-20', 'Joint torique', 'Silicone VMQ 60', 'Ø12 × 2', 'Buse d’injection LSR', 30, 25, 'MAG-A · R02 · N3'],
    ['JT-PTFE-025-15', 'Joint torique', 'PTFE', 'Ø25 × 1,5', 'Doseur LSR A+B', 3, 6, 'MAG-A · R02 · N3'],
  ]);

  // --- Finished products: min + max, lot, QC
  const pf = mk({
    name: 'Produits finis', code: 'PF', color: '#D9146F', description: 'Produits Poco Baby conditionnés, prêts à expédier.',
    columns: [
      col('Référence', 'reference', { role: 'reference', required: true }),
      col('Désignation', 'text', { role: 'name', required: true }),
      col('Gamme', 'dropdown', { options: ['Biberons', 'Tétines', 'Sucettes', 'Soins', 'Coffrets'] }),
      col('Couleur', 'dropdown', { options: ['Bleu', 'Rose', 'Lilas', 'Vert', 'Transparent', 'Assortis'] }),
      col('Quantité', 'quantity', { role: 'quantity', unit: 'pcs', required: true, default: 0 }),
      col('Stock min', 'number', { role: 'min', unit: 'pcs' }), col('Stock max', 'number', { role: 'max', unit: 'pcs' }),
      col('Emplacement', 'dropdown', { role: 'location', options: ['MAG-PF · Allée 1', 'MAG-PF · Allée 2', 'MAG-PF · Allée 3', 'Zone expédition'] }),
      col('N° de lot', 'text'), col('Date de fabrication', 'date'), col('Contrôle qualité validé', 'checkbox', { default: false }), col('Photo', 'image'),
    ],
  }, [
    ['PB-BIB-180-LIL', 'Biberon Pre-Squeeze 180 ml', 'Biberons', 'Lilas', 1240, 500, 3000, 'MAG-PF · Allée 1', 'L2609-18', '2026-09-18', true],
    ['PB-BIB-270-ROS', 'Biberon Pre-Squeeze 270 ml', 'Biberons', 'Rose', 380, 400, 2500, 'MAG-PF · Allée 1', 'L2609-12', '2026-09-12', true],
    ['PB-TET-NF-M', 'Tétine Natural Flow taille M', 'Tétines', 'Transparent', 2600, 1000, 5000, 'MAG-PF · Allée 2', 'L2609-22', '2026-09-22', true],
    ['PB-SUC-06-BLE', 'Sucette anatomique 0-6 m', 'Sucettes', 'Bleu', 0, 300, 2000, 'MAG-PF · Allée 2', 'L2608-30', '2026-08-30', true],
    ['PB-NAS-4M', 'Embout nasal souple', 'Soins', 'Transparent', 910, 300, 2000, 'MAG-PF · Allée 3', 'L2609-05', '2026-09-05', true],
    ['PB-KIT-7EN1', 'Pack complet bébé 7-en-1', 'Coffrets', 'Assortis', 64, 50, 200, 'Zone expédition', 'L2609-25', '2026-09-25', false],
  ]);

  // --- Spare parts: supplier, price, compatible machine
  const pdr = mk({
    name: 'Pièces de rechange', code: 'PDR', color: '#23884F', description: 'Pièces critiques pour la maintenance des presses et des moules.',
    columns: [
      col('Référence', 'reference', { role: 'reference', required: true }),
      col('Désignation', 'text', { role: 'name', required: true }),
      col('Machine compatible', 'dropdown', { options: ['INJ-01', 'INJ-02', 'INJ-03', 'INJ-04', 'INJ-05', 'Toutes'] }),
      col('Fournisseur', 'text'),
      col('Quantité', 'quantity', { role: 'quantity', unit: 'pcs', required: true, default: 0 }),
      col('Stock min', 'number', { role: 'min', unit: 'pcs' }), col('Stock max', 'number', { role: 'max', unit: 'pcs' }),
      col('Emplacement', 'text', { role: 'location' }), col('Prix unitaire', 'number', { unit: 'TND' }), col('Photo', 'image'), col('Notes', 'longtext'),
    ],
  }, [
    ['PR-CCH-45-60', 'Collier chauffant Ø45 × 60, 230 V 400 W', 'Toutes', 'Thermal Tunisie', 14, 6, 30, 'MAG-M · R01 · N2', 68],
    ['PR-TCJ-15', 'Thermocouple type J, 1,5 m', 'Toutes', 'Thermal Tunisie', 22, 10, 40, 'MAG-M · R01 · N3', 24.5],
    ['PR-CAR-30', 'Clapet anti-retour Ø30', 'INJ-03', 'Haitian Service', 0, 1, 3, 'MAG-M · R02 · N1', 890],
    ['PR-BUS-LSR-02', "Buse d'injection à obturation LSR", 'INJ-02', 'Arburg Service', 2, 1, 4, 'MAG-M · R02 · N2', 1450],
    ['PR-EV-4224', 'Électrovanne 4/2, 24 V DC', 'Toutes', 'Festo', 3, 4, 10, 'MAG-M · R03 · N1', 310],
    ['PR-CPM-01', 'Capteur de pression moule', 'INJ-01', 'Kistler', 1, 1, 3, 'MAG-M · R03 · N2', 2100],
  ]);

  // --- Raw materials: kg, lot, expiry
  const mp = mk({
    name: 'Matières premières', code: 'MP', color: '#B87200', description: 'Silicone LSR et colorants, suivis par lot et date de péremption.',
    columns: [
      col('Référence', 'reference', { role: 'reference', required: true }),
      col('Désignation', 'text', { role: 'name', required: true }), col('Fournisseur', 'text'),
      col('Quantité', 'quantity', { role: 'quantity', unit: 'kg', required: true, default: 0 }),
      col('Stock min', 'number', { role: 'min', unit: 'kg' }), col('Stock max', 'number', { role: 'max', unit: 'kg' }),
      col('Emplacement', 'text', { role: 'location' }), col('N° de lot', 'text'), col('Date de péremption', 'date'),
    ],
  }, [
    ['MP-LSR-50A', 'Silicone LSR 50 Shore A, kit A+B', 'Wacker Chemie', 420, 300, 1200, 'MAG-MP · Zone froide', 'W2607-331', '2027-01-31'],
    ['MP-LSR-40A', 'Silicone LSR 40 Shore A, kit A+B', 'Wacker Chemie', 180, 250, 1000, 'MAG-MP · Zone froide', 'W2607-298', '2027-01-15'],
    ['MP-MM-ROSE', 'Mélange-maître colorant rose', 'Colorant Méditerranée', 12, 10, 40, 'MAG-MP · R01', 'CM-2606-14', '2027-06-30'],
  ]);

  // --- Build a consistent journal ending on today's quantities
  let seedN = 7; const rnd = () => (seedN = (seedN * 9301 + 49297) % 233280) / 233280;
  const users = ['Magasin', 'Production', 'Maintenance', 'Admin'];
  const notesIn = ['Réception fournisseur BL 26-', 'Retour production OF 26-', 'Réception BL 26-'];
    cats.forEach(c => {
    const qCol = roleCol(c, 'quantity'); if (!qCol) return;
    const locCol = roleCol(c, 'location');
    items.filter(i => i.categoryId === c.id).forEach(it => {
      let q = Number(it.values[qCol.id]) || 0; const events = []; const n = 2 + Math.floor(rnd() * 3); let dAgo = Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const isOut = rnd() < 0.55; const base = Math.max(1, Math.round((q || 20) * (0.1 + rnd() * 0.3)));
        let prev, delta, type;
        if (isOut) { type = 'out'; delta = -base; prev = q + base; }
        else { type = 'in'; delta = base; prev = q - base; if (prev < 0) { type = 'out'; delta = -base; prev = q + base; } }
        events.push({ type, qty: Math.abs(delta), prev, next: q, dAgo }); q = prev; dAgo += 1 + Math.floor(rnd() * 5);
      }
      events.push({ type: 'initial', qty: q, prev: 0, next: q, dAgo: 24 + Math.floor(rnd() * 4) });
      const ref = it.values[roleCol(c, 'reference').id]; const nameCol = roleCol(c, 'name');
      const name = nameCol ? it.values[nameCol.id] : [it.values[c.columns[1].id], it.values[c.columns[3].id]].filter(Boolean).join(' · ');
      events.forEach(e => {
        const note = e.type === 'initial' ? 'Inventaire de démarrage' : e.type === 'in' ? notesIn[Math.floor(rnd() * notesIn.length)] + (100 + Math.floor(rnd() * 800)) : (c.code === 'PDR' ? 'Consommation maintenance INJ-0' + (1 + Math.floor(rnd() * 5)) : c.code === 'PF' ? 'Expédition client BL 26-' + (100 + Math.floor(rnd() * 800)) : 'Sortie production OF 26-' + (100 + Math.floor(rnd() * 800)));
        movements.push({ id: uid('m'), date: iso(e.dAgo, 7 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)), itemId: it.id, categoryId: c.id, ref, itemName: name, categoryName: c.name, type: e.type, qty: e.qty, prev: e.prev, next: e.next, user: e.type === 'initial' ? 'Admin' : users[Math.floor(rnd() * 3)], note, location: locCol ? it.values[locCol.id] : '' });
      });
    });
  });
  movements.sort((a, b) => b.date.localeCompare(a.date));
  return { schemaVersion: 1, settings: { company: 'Tunisie Silicone', user: 'Admin', theme: 'system' }, categories: cats, items, movements };
}


/* Real inventory imported from inv.xlsx (30/09/2026). Structure categories are created empty. */
function seedReal() { return seedEmpty(); }

/* ======================= 7. UI PRIMITIVES ======================= */
function toast(msg, kind = '') {
  const root = $('#toasts'); if (!root) return;
  const el = document.createElement('div'); el.className = `toast ${kind}`;
  el.innerHTML = `${ic(kind === 'bad' ? 'alert' : 'check')}<span>${esc(msg)}</span>`; hydrateIcons(el);
  root.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2800);
}

/* Browser / phone back button: pages and open windows are history entries. */
const Nav = { depth: 0, skip: 0, pending: null };
function pushHash(h) {
  if (Nav.skip > 0) { Nav.pending = h; return; }
  try { history.pushState({ sp: 1 }, '', '#' + h); Nav.depth++; } catch (e) { /* sandboxed */ }
}
const Modal = (() => {
  const stack = [];
  function open({ title, sub = '', body = '', foot = '', size = '', onMount, onClose }) {
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="icon-btn" data-close type="button" aria-label="Fermer">${ic('x')}</button></div>
      <div class="modal-body"></div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const bodyEl = $('.modal-body', back); if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
    $('#modalRoot').appendChild(back); hydrateIcons(back);
    let pushed = false; try { history.pushState({ spm: 1 }, '', location.href); pushed = true; } catch (e) { /* sandboxed */ }
    const api = { el: back, body: bodyEl, close, pushed };
    function close(fromPop) { const i = stack.indexOf(api); if (i < 0) return; stack.splice(i, 1); back.remove(); if (pushed && fromPop !== true) { Nav.skip++; try { history.back(); } catch (e) { Nav.skip--; } } onClose && onClose(); }
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    $$('[data-close]', back).forEach(b => b.addEventListener('click', () => close()));
    stack.push(api); onMount && onMount(api);
    const first = $('input:not([type=hidden]):not([type=file]),select,textarea', bodyEl); if (first) setTimeout(() => first.focus(), 30);
    return api;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length && !$('.lightbox')) { closeMenu(); stack[stack.length - 1].close(); } });
  return { open, top: () => stack[stack.length - 1] };
})();

function confirmDialog({ title, message, confirmLabel = 'Confirmer', danger = true }) {
  return new Promise(resolve => {
    let done = false;
    const m = Modal.open({
      title, size: 'narrow',
      body: `<div class="confirm-body"><div class="ic">${ic('alert')}</div><div>${message}</div></div>`,
      foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-accent'}" data-ok type="button">${esc(confirmLabel)}</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    $('[data-ok]', m.el).addEventListener('click', () => { done = true; m.close(); resolve(true); });
    setTimeout(() => $('[data-ok]', m.el).focus(), 40);
  });
}

function openMenu(anchor, entries) {
  const pop = $('#menuPop');
  pop.innerHTML = entries.map((e, i) => e === 'sep' ? '<hr>' : `<button type="button" data-i="${i}" class="${e.danger ? 'danger' : ''}">${ic(e.icon || 'more')}${esc(e.label)}</button>`).join('');
  hydrateIcons(pop); pop.hidden = false;
  const r = anchor.getBoundingClientRect(); const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = Math.min(r.right - w, window.innerWidth - w - 8); left = Math.max(8, left);
  let top = r.bottom + 6; if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  $$('button', pop).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const e = entries[+b.dataset.i]; closeMenu(); e.onClick && e.onClick(); }));
}
function closeMenu() { const p = $('#menuPop'); if (p) p.hidden = true; }
document.addEventListener('click', e => { if (!e.target.closest('#menuPop') && !e.target.closest('[data-menu]')) closeMenu(); });
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', closeMenu, true);

function lightbox(src) {
  const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${src}" alt="">`;
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  lb.addEventListener('click', close); document.addEventListener('keydown', onKey, true); document.body.appendChild(lb);
}

/* ======================= 8. IMAGE HANDLING ======================= */
const ImageTools = {
  /** Reads a File, downsizes it to max 900px and returns a compressed JPEG data URL (keeps localStorage usage low). */
  compress(file, max = 800, quality = 0.76) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) { reject(new Error('Le fichier choisi n’est pas une image.')); return; }
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format d’image non reconnu.'));
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  },
  /** Opens a file picker and resolves with a compressed data URL (or null if cancelled). */
  pick(max, quality) {
    return new Promise(resolve => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', async () => { const f = inp.files[0]; if (!f) return resolve(null); try { resolve(await ImageTools.compress(f, max, quality)); } catch (e) { toast(e.message, 'bad'); resolve(null); } });
      inp.click();
    });
  },
};

/* ======================= 9. NAVIGATION & SHELL ======================= */
const state = {
  view: 'categories', catId: null,
  cat: {}, // per-category UI state: { q, mode, sort:{key,dir} }
  stock: { q: '', cat: '', status: '', sort: { key: 'status', dir: 1 } },
  journal: { q: '', type: '', cat: '', from: '', to: '' },
};
const OPEN_KEY = 'stockpilot.tree.open';
state.open = (() => { try { const r = JSON.parse(localStorage.getItem(OPEN_KEY)); if (Array.isArray(r)) return new Set(r); } catch (e) { /* ignore */ } return null; })();
function saveOpen() { try { localStorage.setItem(OPEN_KEY, JSON.stringify([...state.open])); } catch (e) { /* ignore */ } }
function catUI(id) { const u = state.cat[id] || (state.cat[id] = { q: '', mode: 'table', sort: { key: null, dir: 1 } }); if (!u.sel) u.sel = new Set(); return u; }

function go(view, catId = null) {
  state.view = view; state.catId = catId;
  try { const h = view === 'category' ? 'cat-' + catId : view; if (location.hash.slice(1) !== h) pushHash(h); } catch (e) { /* ignore */ }
  $('#app').classList.remove('nav-open');
  render(); const v = $('#view'); v.scrollTop = 0; window.scrollTo(0, 0);
}
function readHash() {
  let h = ''; try { h = location.hash.slice(1); } catch (e) { /* ignore */ }
  if (h.startsWith('cat-') && Repo.categories.get(h.slice(4))) { state.view = 'category'; state.catId = h.slice(4); }
  else if (['dashboard', 'stock', 'journal', 'categories', 'settings', 'interventions', 'maintenance'].includes(h)) state.view = h;
  else if (!h) state.view = 'categories';
}
window.addEventListener('popstate', () => {
  if (Nav.skip > 0) { Nav.skip--; if (!Nav.skip && Nav.pending) { const h = Nav.pending; Nav.pending = null; pushHash(h); } return; }
  const top = Modal.top(); if (top && top.pushed) { top.close(true); return; }
  if (Nav.depth > 0) Nav.depth--;
  closeMenu(); $('#app').classList.remove('nav-open'); readHash(); render(); window.scrollTo(0, 0);
});
/** Top-left arrow: previous page, or the parent level when there is no history. */
function goBack() {
  if (Modal.top()) { Modal.top().close(); return; }
  if (Nav.depth > 0) { try { history.back(); return; } catch (e) { /* fall through */ } }
  const c = state.view === 'category' ? Repo.categories.get(state.catId) : null;
  if (c && c.parentId) go('category', c.parentId); else go('categories');
}

function renderNav() {
  $$('#mainNav .nav-link, .nav-bottom .nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  const fiOpen = (Repo.raw().interventions || []).filter(f => f.status !== 'closed').length; const fb = $('#fiBadge'); if (fb) { fb.textContent = fiOpen; fb.hidden = !fiOpen; }
  renderMpBadge();
  if (!state.open || ![...state.open].some(id => Repo.categories.get(id))) state.open = new Set(folders().map(f => f.id));
  const activePath = new Set(state.view === 'category' && Repo.categories.get(state.catId) ? catPath(Repo.categories.get(state.catId)).map(x => x.id) : []);
  const tree = (pid, depth) => Repo.categories.children(pid).map(c => {
    const kids = Repo.categories.children(c.id); const open = state.open.has(c.id) || (activePath.has(c.id) && c.id !== state.catId);
    const n = isFolder(c) ? subtreeItems(c).length : Repo.items.byCategory(c.id).length;
    return `<button class="nav-cat ${state.view === 'category' && state.catId === c.id ? 'active' : ''} ${isFolder(c) ? 'is-folder' : ''}" data-cat="${c.id}" type="button" style="padding-left:${8 + depth * 16}px">
      <span class="tw" ${kids.length ? `data-toggle="${c.id}" role="button" aria-label="${open ? 'Replier' : 'Déplier'}"` : ''}>${kids.length ? (open ? '▾' : '▸') : ''}</span>
      ${isFolder(c) ? `<span class="fold" style="color:${c.color}">${ic('folder')}</span>` : `<span class="dot" style="background:${c.color}"></span>`}
      <span class="label">${esc(c.name)}</span><span class="count">${n}</span></button>${kids.length && open ? tree(c.id, depth + 1) : ''}`;
  }).join('');
  $('#navCategories').innerHTML = tree(null, 0) || '<div class="nav-cat" style="cursor:default;color:var(--side-ink-2)">Aucune catégorie</div>';
  hydrateIcons($('#navCategories'));
  $$('#navCategories [data-toggle]').forEach(t => t.addEventListener('click', e => { e.stopPropagation(); const id = t.dataset.toggle; state.open.has(id) ? state.open.delete(id) : state.open.add(id); saveOpen(); renderNav(); }));
  $$('#navCategories [data-cat]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.cat; if (isFolder(Repo.categories.get(id))) { state.open.add(id); saveOpen(); } go('category', id); }));
  const s = Repo.settings.get();
  $('#brandCompany').textContent = 'Gestion de stock';
  $('#userName').textContent = s.user || 'Utilisateur'; $('#userAvatar').textContent = initials(s.user || 'U');
}
function renderCrumbs() {
  const labels = { maintenance: 'Maintenance préventive', interventions: 'Fiches d’intervention', dashboard: 'Tableau de bord', stock: 'Stock', journal: 'Journal de stock', categories: 'Accueil · Catégories', settings: 'Paramètres' };
  let html = `<span class="muted">${esc(Repo.settings.get().company || '')}</span><span class="sep">/</span>`;
  if (state.view === 'category') { const c = Repo.categories.get(state.catId); const path = c ? catPath(c) : []; html += `<span class="muted" data-crumb="" style="cursor:pointer">Catégories</span>` + path.map((x, k) => `<span class="sep">/</span>${k === path.length - 1 ? `<span>${esc(x.name)}</span>` : `<span class="muted" data-crumb="${x.id}" style="cursor:pointer">${esc(x.name)}</span>`}`).join(''); }
  else html += `<span>${labels[state.view] || ''}</span>`;
  $('#crumbs').innerHTML = html;
  const bb = $('#backBtn'); if (bb) bb.hidden = state.view === 'categories';
  $$('#crumbs [data-crumb]').forEach(el => el.addEventListener('click', () => el.dataset.crumb ? go('category', el.dataset.crumb) : go('categories')));
}
function render() {
  if (state.view === 'category' && !Repo.categories.get(state.catId)) state.view = 'categories';
  renderNav(); renderCrumbs(); renderMpBar();
  if (state.view !== 'category') { const sb = $('#selBar'); if (sb) sb.remove(); }
  const v = $('#view');
  const viewFn = state.view === 'category' && isFolder(Repo.categories.get(state.catId)) ? viewFolder : ({ maintenance: viewMaintenance, interventions: viewInterventions, dashboard: viewDashboard, stock: viewStock, journal: viewJournal, categories: viewCategories, category: viewCategory, settings: viewSettings }[state.view] || viewCategories);
  viewFn(v);
  hydrateIcons(v);
}
function applyTheme() {
  const t = Repo.settings.get().theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
}

/* ======================= 10. VIEWS ======================= */
/* ---------- Dashboard ---------- */
function viewDashboard(v) {
  const items = Repo.items.list(); const cats = itemCats(); const sItems = stockItems();
  const low = sItems.filter(i => stockStatus(i) === 'low'); const out = sItems.filter(i => stockStatus(i) === 'out');
  const units = {}; sItems.forEach(i => { const u = qtyUnit(i) || 'u.'; units[u] = (units[u] || 0) + (itemQty(i) || 0); });
  const unitLine = Object.entries(units).sort((a, b) => b[1] - a[1]).map(([u, n]) => `${fmtNum(n)} ${esc(u)}`).join(' · ');
  const mainUnit = Object.entries(units).sort((a, b) => b[1] - a[1])[0];
  const recentMv = Repo.journal.list().slice(0, 8);
  const recentItems = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const alerts = [...out, ...low].sort((a, b) => cmp(stockStatus(a) === 'out' ? 0 : 1, stockStatus(b) === 'out' ? 0 : 1));
  const stockCats = cats.filter(isStockCat);
  const week = Repo.journal.list().filter(m => Date.now() - new Date(m.date) < 7 * 86400000);

  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">Vue d'ensemble · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Tableau de bord</h1></div>
    <div class="actions"><button class="btn" data-go="stock" type="button">${ic('stock')}Voir le stock</button><button class="btn btn-accent" data-act="move" type="button">${ic('swap')}Nouveau mouvement</button></div></div>
  ${spacesHtml()}
  <div class="kpis">
    <div class="kpi"><div class="k-label">${ic('box')}Articles</div><div class="k-val">${fmtNum(items.length)}</div><div class="k-sub">dont ${sItems.length} suivis en stock</div></div>
    <div class="kpi link" data-go="categories"><div class="k-label">${ic('grid')}Catégories</div><div class="k-val">${cats.length}</div><div class="k-sub">${stockCats.length} avec suivi de stock</div></div>
    <div class="kpi"><div class="k-label">${ic('layers')}Stock total</div><div class="k-val">${mainUnit ? fmtNum(mainUnit[1]) : 0}<span style="font-size:16px;color:var(--ink-3)"> ${mainUnit ? esc(mainUnit[0]) : ''}</span></div><div class="k-sub" title="${esc(unitLine)}">${unitLine && Object.keys(units).length > 1 ? esc(unitLine.split(' · ').slice(1).join(' · ')) : 'toutes catégories'}</div></div>
    <div class="kpi warn link" data-status="low"><div class="k-label">${ic('alert')}Stock bas</div><div class="k-val">${low.length}</div><div class="k-sub">au niveau du minimum ou en dessous</div></div>
    <div class="kpi bad link" data-status="out"><div class="k-label">${ic('alert')}Ruptures</div><div class="k-val">${out.length}</div><div class="k-sub">quantité à zéro</div></div>
  </div>
  <div class="dash-grid">
    <div class="col">
      ${mpDashPanel()}
      <section class="panel"><div class="panel-head"><h2>Alertes de stock</h2><span class="count-note">${alerts.length} article${alerts.length > 1 ? 's' : ''} à réapprovisionner</span></div>
        ${alerts.length ? `<div class="table-wrap"><table class="data"><thead><tr><th></th><th>Référence</th><th>Article</th><th class="r">Qté</th><th class="r">Min</th><th>Statut</th><th></th></tr></thead><tbody>
        ${alerts.slice(0, 8).map(i => `<tr data-item="${i.id}"><td style="width:48px">${thumbHtml(i)}</td><td>${itemRef(i) ? `<span class="ref">${esc(itemRef(i))}</span>` : '<span class="muted">—</span>'}</td><td class="clip">${esc(itemName(i))}<div class="muted" style="font-size:12px">${esc(catOf(i).name)}</div></td><td class="r num"><b>${fmtNum(itemQty(i))}</b></td><td class="r num muted">${fmtNum(itemMin(i))}</td><td>${statusBadge(stockStatus(i))}</td><td class="actions"><button class="icon-btn small" data-in="${i.id}" type="button" title="Entrée de stock" aria-label="Entrée de stock">${ic('in')}</button></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty"><b>Aucune alerte</b>Tous les articles suivis sont au-dessus de leur stock minimum.</div>`}
      </section>
      <section class="panel"><div class="panel-head"><h2>Mouvements récents</h2><button class="btn btn-sm btn-ghost" data-go="journal" type="button">Tout le journal</button></div>
        ${recentMv.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Opération</th><th>Article</th><th class="r">Qté</th><th class="r">Après</th></tr></thead><tbody>
        ${recentMv.map(m => `<tr data-item="${m.itemId}"><td class="num" style="white-space:nowrap">${fmtDate(m.date)} <span class="muted">${fmtTime(m.date)}</span></td><td>${opBadge(m.type)}</td><td class="clip">${esc(m.itemName)}<div class="muted mono" style="font-size:11.5px">${esc(m.ref)} · ${esc(m.user)}</div></td><td class="r">${deltaHtml(m)}</td><td class="r num">${fmtNum(m.next)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty"><b>Aucun mouvement</b>Les entrées et sorties apparaîtront ici.</div>`}
      </section>
    </div>
    <div class="col">
      <section class="panel"><div class="panel-head"><h2>État du stock par catégorie</h2></div><div class="panel-body">
        ${stockCats.length ? `<div class="bars">${stockCats.map(c => { const its = Repo.items.byCategory(c.id); const n = its.length || 1; const k = { ok: 0, low: 0, out: 0 }; its.forEach(i => k[stockStatus(i)]++); return `<div class="bar-row" data-cat="${c.id}" style="cursor:pointer"><span class="name">${esc(c.name)}</span><div class="bar-track" title="${k.ok} en stock · ${k.low} stock bas · ${k.out} rupture"><span style="width:${k.ok / n * 100}%;background:var(--ok)"></span><span style="width:${k.low / n * 100}%;background:var(--warn)"></span><span style="width:${k.out / n * 100}%;background:var(--bad)"></span></div><span class="v">${its.length} art.</span></div>`; }).join('')}</div>
        <div class="legend"><span><i style="background:var(--ok)"></i>En stock</span><span><i style="background:var(--warn)"></i>Stock bas</span><span><i style="background:var(--bad)"></i>Rupture</span></div>` : '<div class="empty">Ajoutez une colonne de type Quantité à une catégorie pour suivre son stock.</div>'}
      </div></section>
      <section class="panel"><div class="panel-head"><h2>7 derniers jours</h2></div><div class="panel-body">
        <div class="stock-box" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0">
          <div><span>Entrées</span><b style="color:var(--ok)">${week.filter(m => m.type === 'in').length}</b></div>
          <div><span>Sorties</span><b style="color:var(--bad)">${week.filter(m => m.type === 'out').length}</b></div>
          <div><span>Ajustements</span><b style="color:var(--info)">${week.filter(m => m.type === 'adjust' || m.type === 'transfer').length}</b></div>
        </div></div></section>
      <section class="panel"><div class="panel-head"><h2>Articles ajoutés récemment</h2></div>
        <div class="table-wrap"><table class="data"><tbody>${recentItems.map(i => `<tr data-item="${i.id}"><td style="width:48px">${thumbHtml(i)}</td><td class="clip"><b style="font-weight:600">${esc(itemName(i))}</b><div class="muted" style="font-size:12px">${esc(catOf(i).name)}${itemRef(i) ? ' · ' + esc(itemRef(i)) : ''}</div></td><td class="r muted" style="white-space:nowrap;font-size:12px">${relTime(i.createdAt)}</td></tr>`).join('')}</tbody></table></div>
      </section>
    </div>
  </div>`;
  bindCommon(v); bindMpBlocks(v);
  $$('[data-status]', v).forEach(k => k.addEventListener('click', () => { state.stock.status = k.dataset.status; go('stock'); }));
  $$('[data-space]', v).forEach(k => k.addEventListener('click', () => go('category', k.dataset.space)));
  $$('.bar-row[data-cat]', v).forEach(k => k.addEventListener('click', () => go('category', k.dataset.cat)));
}
/** Top-level choice (Machines / Produits …): one tile per root folder. */
function spacesHtml() {
  const roots = Repo.categories.children(null).filter(isFolder); if (!roots.length) return '';
  return `<div class="spaces">${roots.map(f => { const its = subtreeItems(f); const subs = descendants(f.id).filter(c => !isFolder(c)); const al = its.filter(i => ['low', 'out'].includes(stockStatus(i))).length;
    return `<button class="space" data-space="${f.id}" type="button" style="--c:${f.color}"><span class="space-ic">${ic('folder')}</span><span class="space-t"><b>${esc(f.name)}</b><span>${subs.map(c => esc(c.name)).slice(0, 4).join(' · ') || 'Aucune sous-catégorie'}</span></span><span class="space-n"><b>${its.length}</b>articles${al ? `<em>${al} alerte${al > 1 ? 's' : ''}</em>` : ''}</span></button>`; }).join('')}</div>`;
}
function deltaHtml(m) {
  const d = m.type === 'transfer' ? 0 : m.next - m.prev; const cls = d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero';
  const txt = m.type === 'transfer' ? `${fmtNum(m.qty)}` : (d > 0 ? '+' : d < 0 ? '−' : '±') + fmtNum(Math.abs(d));
  return `<span class="delta ${cls}">${txt}</span>`;
}
/** Shared handlers for generated markup: open item, navigation, quick movements. */
function bindCommon(root) {
  $$('[data-go]', root).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  $$('[data-act="move"]', root).forEach(b => b.addEventListener('click', () => openMovementForm()));
  $$('[data-in]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMovementForm(b.dataset.in, 'in'); }));
  $$('[data-out]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMovementForm(b.dataset.out, 'out'); }));
  $$('tr[data-item], .icard[data-item]', root).forEach(r => r.addEventListener('click', e => { if (e.target.closest('button,a,input')) return; if (Repo.items.get(r.dataset.item)) openItemDetail(r.dataset.item); else toast('Cet article a été supprimé.', 'bad'); }));
}

/* ---------- Stock ---------- */
function viewStock(v) {
  const st = state.stock; const cats = itemCats().filter(isStockCat);
  const all = stockItems(); const counts = { '': all.length, ok: 0, low: 0, out: 0 }; all.forEach(i => counts[stockStatus(i)]++);
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">Inventaire en temps réel</div><h1>Gestion du stock</h1><p>Tous les articles des catégories qui ont une colonne Quantité. Le statut se calcule à partir du stock minimum.</p></div>
    <div class="actions"><button class="btn btn-accent" data-act="move" type="button">${ic('swap')}Nouveau mouvement</button></div></div>
  <section class="panel">
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Statut">${[['', 'Tous'], ['ok', 'En stock'], ['low', 'Stock bas'], ['out', 'Rupture']].map(([k, l]) => `<button type="button" class="${st.status === k ? 'on' : ''}" data-st="${k}" style="padding:6px 12px;font-weight:600;font-size:12.5px">${l} <span class="muted mono" style="margin-left:4px">${counts[k]}</span></button>`).join('')}</div>
      <div class="spacer"></div>
      <label class="field-inline">${ic('search')}<input id="stockQ" type="search" placeholder="Référence ou désignation" value="${esc(st.q)}"></label>
      <select class="select" id="stockCat" aria-label="Catégorie"><option value="">Toutes les catégories</option>${cats.map(c => `<option value="${c.id}" ${st.cat === c.id ? 'selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select>
    </div>
    <div id="stockTable"></div>
  </section>`;
  const draw = () => {
    const q = st.q.trim().toLowerCase();
    let rows = all.filter(i => (!st.cat || i.categoryId === st.cat || linkedFrom('c:' + st.cat).includes(i)) && (!st.status || stockStatus(i) === st.status) && (!q || (itemRef(i) + ' ' + itemName(i) + ' ' + itemLoc(i)).toLowerCase().includes(q)));
    const key = st.sort.key, dir = st.sort.dir; const rank = { out: 0, low: 1, ok: 2 };
    const val = (i) => ({ ref: itemRef(i), name: itemName(i), cat: catOf(i).name, qty: itemQty(i), min: itemMin(i), max: itemMax(i), loc: itemLoc(i), status: rank[stockStatus(i)], last: (lastMovement(i) || {}).date || '' }[key]);
    rows.sort((a, b) => cmp(val(a), val(b)) * dir || cmp(itemRef(a), itemRef(b)));
    const th = (k, l, cls = '') => `<th class="sortable ${cls}" data-sort="${k}">${l}<span class="arr">${key === k ? (dir > 0 ? '▲' : '▼') : ''}</span></th>`;
    $('#stockTable', v).innerHTML = rows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th></th>${th('ref', 'Référence')}${th('name', 'Désignation')}${th('cat', 'Catégorie')}${th('qty', 'Qté', 'r')}${th('min', 'Min / Max', 'r')}<th>Niveau</th>${th('loc', 'Emplacement')}${th('status', 'Statut')}${th('last', 'Dernier mvt')}<th></th></tr></thead><tbody>
      ${rows.map(i => { const lm = lastMovement(i); const u = qtyUnit(i); return `<tr data-item="${i.id}"><td style="width:48px">${thumbHtml(i)}</td><td><span class="ref">${esc(itemRef(i)) || '—'}</span></td><td class="clip" title="${esc(itemName(i))}">${esc(itemName(i))}</td><td><span class="tag" style="box-shadow:inset 3px 0 0 ${catOf(i).color}">${esc(catOf(i).name)}</span></td><td class="r num" style="white-space:nowrap"><b>${fmtNum(itemQty(i))}</b>${u ? ` <span class="muted">${esc(u)}</span>` : ''}</td><td class="r num muted" style="white-space:nowrap">${fmtNum(itemMin(i))} / ${fmtNum(itemMax(i))}</td><td>${levelBar(i)}</td><td class="clip muted">${esc(itemLoc(i)) || '—'}</td><td>${statusBadge(stockStatus(i))}</td><td style="white-space:nowrap">${lm ? `${opBadge(lm.type)} <span class="muted" style="font-size:12px">${relTime(lm.date)}</span>` : '<span class="muted">—</span>'}</td><td class="actions"><button class="icon-btn small" data-in="${i.id}" title="Entrée" aria-label="Entrée" type="button">${ic('in')}</button> <button class="icon-btn small" data-out="${i.id}" title="Sortie" aria-label="Sortie" type="button">${ic('out')}</button></td></tr>`; }).join('')}
      </tbody></table></div><div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="count-note">${rows.length} article${rows.length > 1 ? 's' : ''} affiché${rows.length > 1 ? 's' : ''} sur ${all.length}</span></div>`
      : `<div class="empty"><b>Aucun article ne correspond</b>Modifiez la recherche ou les filtres.</div>`;
    hydrateIcons(v); bindCommon($('#stockTable', v));
    $$('th[data-sort]', v).forEach(h => h.addEventListener('click', () => { const k = h.dataset.sort; st.sort = { key: k, dir: st.sort.key === k ? -st.sort.dir : 1 }; draw(); }));
  };
  $('#stockQ', v).addEventListener('input', debounce(e => { st.q = e.target.value; draw(); }));
  $('#stockCat', v).addEventListener('change', e => { st.cat = e.target.value; draw(); });
  $$('[data-st]', v).forEach(b => b.addEventListener('click', () => { st.status = b.dataset.st; viewStock(v); hydrateIcons(v); }));
  bindCommon(v); draw();
}

/* ---------- Journal ---------- */
function viewJournal(v) {
  const js = state.journal; const cats = itemCats();
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">Traçabilité</div><h1>Journal de stock</h1><p>Chaque entrée, sortie, ajustement ou transfert est enregistré avec la quantité avant et après, l'utilisateur et la note.</p></div>
    <div class="actions"><button class="btn" id="exportCsv" type="button">${ic('download')}Exporter CSV</button><button class="btn btn-accent" data-act="move" type="button">${ic('swap')}Nouveau mouvement</button></div></div>
  <section class="panel">
    <div class="toolbar">
      <label class="field-inline">${ic('search')}<input id="jQ" type="search" placeholder="Référence, article, note, utilisateur" value="${esc(js.q)}"></label>
      <select class="select" id="jType" aria-label="Opération"><option value="">Toutes les opérations</option>${Object.entries(OPS).map(([k, o]) => `<option value="${k}" ${js.type === k ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
      <select class="select" id="jCat" aria-label="Catégorie"><option value="">Toutes les catégories</option>${cats.map(c => `<option value="${c.id}" ${js.cat === c.id ? 'selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select>
      <label class="field-inline" title="Du">Du <input id="jFrom" type="date" value="${esc(js.from)}" style="width:auto"></label>
      <label class="field-inline" title="Au">Au <input id="jTo" type="date" value="${esc(js.to)}" style="width:auto"></label>
    </div>
    <div id="jTable"></div>
  </section>`;
  const filtered = () => {
    const q = js.q.trim().toLowerCase();
    return Repo.journal.list().filter(m => (!js.type || m.type === js.type) && (!js.cat || m.categoryId === js.cat)
      && (!js.from || m.date.slice(0, 10) >= js.from) && (!js.to || m.date.slice(0, 10) <= js.to)
      && (!q || [m.ref, m.itemName, m.note, m.user, m.categoryName].join(' ').toLowerCase().includes(q)));
  };
  const draw = () => {
    const rows = filtered();
    $('#jTable', v).innerHTML = rows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Heure</th><th>Référence</th><th>Article</th><th>Catégorie</th><th>Opération</th><th class="r">Quantité</th><th class="r">Avant</th><th class="r">Après</th><th>Utilisateur</th><th>Note</th></tr></thead><tbody>
      ${rows.slice(0, 400).map(m => `<tr data-item="${m.itemId}"><td class="num" style="white-space:nowrap">${fmtDate(m.date)}</td><td class="num muted">${fmtTime(m.date)}</td><td><span class="ref">${esc(m.ref) || '—'}</span></td><td class="clip" title="${esc(m.itemName)}">${esc(m.itemName)}</td><td class="clip muted">${esc(m.categoryName)}</td><td>${opBadge(m.type)}</td><td class="r">${deltaHtml(m)}</td><td class="r num muted">${fmtNum(m.prev)}</td><td class="r num"><b>${fmtNum(m.next)}</b></td><td>${esc(m.user)}</td><td class="clip muted" title="${esc(m.note)}">${esc(m.note) || '—'}${m.type === 'transfer' && m.toLoc ? ` <span class="tag">${esc(m.fromLoc || '?')} → ${esc(m.toLoc)}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div><div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="count-note">${rows.length} mouvement${rows.length > 1 ? 's' : ''}${rows.length > 400 ? ' · 400 premiers affichés' : ''}</span></div>`
      : `<div class="empty"><b>Aucun mouvement</b>Aucune opération ne correspond aux filtres.</div>`;
    hydrateIcons(v); bindCommon($('#jTable', v));
  };
  $('#jQ', v).addEventListener('input', debounce(e => { js.q = e.target.value; draw(); }));
  $('#jType', v).addEventListener('change', e => { js.type = e.target.value; draw(); });
  $('#jCat', v).addEventListener('change', e => { js.cat = e.target.value; draw(); });
  $('#jFrom', v).addEventListener('change', e => { js.from = e.target.value; draw(); });
  $('#jTo', v).addEventListener('change', e => { js.to = e.target.value; draw(); });
  $('#exportCsv', v).addEventListener('click', () => {
    const rows = filtered(); const head = ['Date', 'Heure', 'Référence', 'Article', 'Catégorie', 'Opération', 'Quantité', 'Avant', 'Après', 'Utilisateur', 'Note'];
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...rows.map(m => [fmtDate(m.date), fmtTime(m.date), m.ref, m.itemName, m.categoryName, OPS[m.type].label, m.qty, m.prev, m.next, m.user, m.note])].map(r => r.map(q).join(';')).join('\r\n');
    downloadText('﻿' + csv, `journal-stock-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  });
  bindCommon(v); draw();
}
function downloadText(text, name, type) {
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast(`Fichier ${name} généré`, 'ok'); }
  catch (e) { toast('Téléchargement impossible dans ce navigateur.', 'bad'); }
}

/* ---------- Categories overview (tree root) & folder pages ---------- */
function coverHtml(c) { return ''; }
async function setCategoryImage(catId, src) { const c = Repo.categories.get(catId); if (!c) return; Repo.categories.update(catId, { image: src || '' }); toast(src ? `Photo de « ${c.name} » enregistrée` : 'Photo retirée', 'ok'); render(); }
async function pickCategoryImage(catId) { const src = await ImageTools.pick(900, 0.78); if (src) setCategoryImage(catId, src); }
/** Category / folder tile: full-bleed cover photo (or brand gradient), title over the image, stats underneath. */
function catCardHtml(c) {
  const folder = isFolder(c);
  const its = folder ? subtreeItems(c) : Repo.items.byCategory(c.id);
  const al = its.filter(i => ['low', 'out'].includes(stockStatus(i))).length;
  const kids = folder ? Repo.categories.children(c.id) : [];
  const sub = folder ? (kids.map(k => k.name).slice(0, 3).join(' · ') + (kids.length > 3 ? ` +${kids.length - 3}` : '') || 'Dossier vide') : (c.description || `${c.columns.length} colonnes${isStockCat(c) ? ' · stock suivi' : ''}`);
  const stats = folder
    ? `<span><b>${kids.length}</b> ${kids.length > 1 ? 'éléments' : 'élément'}</span><span><b>${its.length}</b> article${its.length > 1 ? 's' : ''}</span>`
    : `<span><b>${its.length}</b> article${its.length > 1 ? 's' : ''}</span><span><b>${c.columns.length}</b> colonnes</span>`;
  return `<article class="tile ${folder ? 'is-folder' : ''} ${c.image ? 'has-img' : ''}" data-cat="${c.id}" style="--c:${c.color}" tabindex="0" aria-label="${esc(c.name)}">
    <div class="tile-media">
      ${c.image ? `<img src="${c.image}" alt="" loading="lazy">` : `<div class="tile-ph"><span>${folder ? ic('folder') : esc(c.code)}</span></div>`}
      <div class="tile-shade"></div>
      <span class="tile-kind">${folder ? `${ic('folder')}Dossier` : `${ic('table')}Catégorie`}</span>
      <div class="tile-tools">
        <button type="button" class="tile-btn" data-coverpick="${c.id}" title="${c.image ? 'Changer la photo' : 'Ajouter une photo'}" aria-label="${c.image ? 'Changer la photo' : 'Ajouter une photo'}">${ic('image')}</button>
        <button type="button" class="tile-btn" data-menu="${c.id}" aria-label="Actions">${ic('more')}</button>
      </div>
      <div class="tile-title"><h3>${esc(c.name)}</h3><p>${esc(sub)}</p></div>
    </div>
    <div class="tile-foot">${stats}${al ? `<span class="badge b-low">${al} alerte${al > 1 ? 's' : ''}</span>` : '<span class="tile-ok">Stock OK</span>'}<span class="tile-go" aria-hidden="true">→</span></div>
  </article>`;
}
function newTileHtml(kind, parentId, title, hint) {
  return `<button class="tile tile-new" data-newcat="${kind}" data-parent="${parentId || ''}" type="button"><span class="tile-new-ic">${ic(kind === 'folder' ? 'folder' : 'plus')}</span><b>${esc(title)}</b><span>${esc(hint)}</span></button>`;
}
function bindCatCards(v) {
  $$('.tile [data-coverpick]', v).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); pickCategoryImage(b.dataset.coverpick); }));
  $$('.tile[data-cat]', v).forEach(card => {
    card.addEventListener('dragover', e => { if ([...(e.dataTransfer.items || [])].some(x => x.kind === 'file')) { e.preventDefault(); card.classList.add('drop'); } });
    card.addEventListener('dragleave', () => card.classList.remove('drop'));
    card.addEventListener('drop', async e => { e.preventDefault(); card.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (!f) return; try { setCategoryImage(card.dataset.cat, await ImageTools.compress(f, 900, 0.78)); } catch (err) { toast(err.message, 'bad'); } });
    card.addEventListener('click', e => { if (e.target.closest('[data-menu],[data-coverpick]')) return; go('category', card.dataset.cat); });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === card) go('category', card.dataset.cat); });
  });
  $$('.tile [data-menu]', v).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); categoryMenu(b, b.dataset.menu); }));
  $$('[data-newcat]', v).forEach(b => b.addEventListener('click', () => openCategoryForm(null, { parentId: b.dataset.parent || null, kind: b.dataset.newcat })));
}
/** Home page (step 1): pick a space / category. */
function viewCategories(v) {
  const roots = Repo.categories.children(null); const all = Repo.items.list();
  const alerts = all.filter(i => ['low', 'out'].includes(stockStatus(i))).length; const nCats = itemCats().length;
  const hour = new Date().getHours(); const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  v.innerHTML = `
  <section class="home-hero">
    <div class="hero-text">
      <div class="eyebrow">${esc(hello)}, ${esc(Repo.settings.get().user || '')} · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>Choisissez un espace</h1>
      <p>Ouvrez un dossier ou une catégorie pour voir ses articles, leurs photos et leur stock.</p>
      <div class="hero-stats"><span><b>${roots.length}</b>espace${roots.length > 1 ? 's' : ''}</span><span><b>${nCats}</b>catégorie${nCats > 1 ? 's' : ''}</span><span><b>${all.length}</b>article${all.length > 1 ? 's' : ''}</span><span class="${alerts ? 'warn' : ''}"><b>${alerts}</b>alerte${alerts > 1 ? 's' : ''} stock</span></div>
    </div>
    <div class="hero-actions"><button class="btn btn-light" data-newcat="folder" data-parent="" type="button">${ic('folder')}Nouveau dossier</button><button class="btn btn-accent" data-newcat="items" data-parent="" type="button">${ic('plus')}Nouvelle catégorie</button></div>
  </section>
  <div class="tile-grid">${roots.map(catCardHtml).join('')}${newTileHtml('folder', '', 'Nouveau dossier', 'Ex. Maintenance, Logistique…')}</div>`;
  bindCatCards(v);
}
function viewFolder(v) {
  const f = Repo.categories.get(state.catId); const kids = Repo.categories.children(f.id); const its = subtreeItems(f);
  const alerts = its.filter(i => ['low', 'out'].includes(stockStatus(i))).sort((a, b) => cmp(stockStatus(a) === 'out' ? 0 : 1, stockStatus(b) === 'out' ? 0 : 1));
  const nCats = descendants(f.id).filter(c => !isFolder(c)).length;
  v.innerHTML = `${f.image ? `<div class="page-banner" style="--c:${f.color}"><img src="${f.image}" alt=""><div class="tile-shade"></div></div>` : ''}
  <div class="page-head"><div><div class="eyebrow"><span class="swatch" style="background:${f.color}"></span>Dossier · ${nCats} catégorie${nCats > 1 ? 's' : ''} · ${its.length} article${its.length > 1 ? 's' : ''}</div><h1>${esc(f.name)}</h1>${f.description ? `<p>${esc(f.description)}</p>` : ''}</div>
    <div class="actions"><button class="btn" data-newcat="folder" data-parent="${f.id}" type="button">${ic('folder')}Sous-dossier</button><button class="btn btn-accent" data-newcat="items" data-parent="${f.id}" type="button">${ic('plus')}Nouvelle catégorie</button><button class="icon-btn" id="fMenu" data-menu type="button" aria-label="Plus d'actions">${ic('more')}</button></div></div>
  <div class="tile-grid">${kids.map(catCardHtml).join('')}${newTileHtml('items', f.id, `Nouvelle catégorie dans ${f.name}`, 'Avec ses propres colonnes')}</div>
  ${alerts.length ? `<section class="panel" style="margin-top:18px"><div class="panel-head"><h2>Alertes de stock dans ${esc(f.name)}</h2><span class="count-note">${alerts.length} article${alerts.length > 1 ? 's' : ''}</span></div><div class="table-wrap"><table class="data"><thead><tr><th></th><th>Article</th><th>Catégorie</th><th class="r">Qté</th><th class="r">Min</th><th>Statut</th><th></th></tr></thead><tbody>
    ${alerts.slice(0, 10).map(i => `<tr data-item="${i.id}"><td style="width:48px">${thumbHtml(i)}</td><td class="clip">${esc(itemName(i))}${itemRef(i) ? `<div class="muted mono" style="font-size:11.5px">${esc(itemRef(i))}</div>` : ''}</td><td class="muted">${esc(catOf(i).name)}</td><td class="r num"><b>${fmtNum(itemQty(i))}</b></td><td class="r num muted">${fmtNum(itemMin(i))}</td><td>${statusBadge(stockStatus(i))}</td><td class="actions"><button class="icon-btn small" data-in="${i.id}" type="button" title="Entrée de stock" aria-label="Entrée de stock">${ic('in')}</button></td></tr>`).join('')}
  </tbody></table></div></section>` : ''}`;
  bindCatCards(v); bindCommon(v);
  $('#fMenu', v).addEventListener('click', e => { e.stopPropagation(); categoryMenu(e.currentTarget, f.id); });
}
function categoryMenu(anchor, catId) {
  const c = Repo.categories.get(catId);
  openMenu(anchor, [
    { label: 'Ouvrir', icon: 'eye', onClick: () => go('category', catId) },
    { label: 'Renommer / déplacer', icon: 'edit', onClick: () => openCategoryForm(catId) },
    ...(isFolder(c) ? [{ label: 'Nouvelle catégorie ici', icon: 'plus', onClick: () => openCategoryForm(null, { parentId: catId, kind: 'items' }) }] : [{ label: 'Gérer les colonnes', icon: 'columns', onClick: () => openColumnsManager(catId) }]),
    { label: c.image ? 'Changer la photo' : 'Ajouter une photo', icon: 'image', onClick: () => pickCategoryImage(catId) },
    ...(c.image ? [{ label: 'Retirer la photo', icon: 'x', onClick: () => setCategoryImage(catId, '') }] : []),
    'sep',
    { label: isFolder(c) ? 'Supprimer le dossier' : 'Supprimer la catégorie', icon: 'trash', danger: true, onClick: () => deleteCategory(catId) },
  ]);
}
async function deleteCategory(catId) {
  const c = Repo.categories.get(catId);
  if (isFolder(c)) {
    const kids = Repo.categories.children(c.id); const parent = c.parentId ? Repo.categories.get(c.parentId) : null;
    const ok = await confirmDialog({ title: 'Supprimer le dossier ?', message: `Le dossier <b>${esc(c.name)}</b> sera supprimé. ${kids.length ? `Ses ${kids.length} élément(s) remontent dans <b>${esc(parent ? parent.name : 'la racine')}</b>, aucun article n'est supprimé.` : 'Il est vide.'}`, confirmLabel: 'Supprimer' });
    if (!ok) return; Repo.categories.remove(catId); toast(`Dossier « ${c.name} » supprimé`, 'ok');
    if (state.catId === catId) (c.parentId ? go('category', c.parentId) : go('categories')); else render(); return;
  }
  const n = Repo.items.byCategory(catId).length;
  const ok = await confirmDialog({ title: 'Supprimer la catégorie ?', message: `<b>${esc(c.name)}</b> et ses <b>${n} article${n > 1 ? 's' : ''}</b> seront supprimés. Les mouvements déjà enregistrés restent dans le journal.`, confirmLabel: 'Supprimer' });
  if (!ok) return; Repo.categories.remove(catId); toast(`Catégorie « ${c.name} » supprimée`, 'ok');
  if (state.catId === catId) (c.parentId ? go('category', c.parentId) : go('categories')); else render();
}

/* ---------- Category (dynamic item management) ---------- */
function viewCategory(v) {
  const cat = Repo.categories.get(state.catId); const ui = catUI(cat.id);
  const stock = isStockCat(cat); const imgCol = cat.columns.find(c => c.type === 'image');
  const shownCols = cat.columns.filter(c => c.type !== 'image');
  v.innerHTML = `${cat.image ? `<div class="page-banner" style="--c:${cat.color}"><img src="${cat.image}" alt=""><div class="tile-shade"></div></div>` : ''}
  <div class="page-head"><div><div class="eyebrow"><span class="swatch" style="background:${cat.color}"></span>${cat.parentId ? esc(catPath(cat).slice(0, -1).map(x => x.name).join(' › ')) + ' · ' : ''}${esc(cat.code)} · ${cat.columns.length} colonnes${stock ? ' · stock suivi' : ''}</div><h1>${esc(cat.name)}</h1>${cat.description ? `<p>${esc(cat.description)}</p>` : ''}</div>
    <div class="actions">
      <button class="btn" id="manageCols" type="button">${ic('columns')}Colonnes</button>
      <button class="btn" id="addCol" type="button">${ic('plus')}Ajouter une colonne</button>
      <button class="btn btn-accent" id="addItem" type="button">${ic('plus')}Nouvel article</button>
      <button class="icon-btn" id="catMenu" data-menu type="button" aria-label="Plus d'actions">${ic('more')}</button>
    </div></div>
  ${Repo.categories.children(cat.id).length ? `<div class="subcats">${Repo.categories.children(cat.id).map(sc => { const n = isFolder(sc) ? subtreeItems(sc).length : Repo.items.byCategory(sc.id).length; const al = Repo.items.byCategory(sc.id).filter(i => ['low', 'out'].includes(stockStatus(i))).length; return `<button type="button" class="subcat" data-subcat="${sc.id}" style="--c:${sc.color}"><span class="sc-ic">${ic('folder')}</span><span class="sc-t"><b>${esc(sc.name)}</b><span>${n} article${n > 1 ? 's' : ''}${al ? ` · <em>${al} alerte${al > 1 ? 's' : ''}</em>` : ''}</span></span><span class="sc-go">${ic('back')}</span></button>`; }).join('')}</div>` : ''}
  ${isMouldCat(cat) ? mouldFicheHtml(cat) + mouldHistoryHtml(cat) : ''}
  <div id="catShared"></div>
  <section class="panel">
    <div class="toolbar">
      <label class="field-inline">${ic('search')}<input id="catQ" type="search" placeholder="Rechercher dans ${esc(cat.name.toLowerCase())}" value="${esc(ui.q)}"></label>
      <span class="count-note" id="catCount"></span>
      <div class="spacer"></div>
      <div class="seg" role="group" aria-label="Affichage"><button type="button" class="${ui.mode === 'table' ? 'on' : ''}" data-mode="table" title="Tableau" aria-label="Tableau">${ic('table')}</button><button type="button" class="${ui.mode === 'cards' ? 'on' : ''}" data-mode="cards" title="Cartes" aria-label="Cartes">${ic('cards')}</button></div>
    </div>
    <div id="catItems"></div>
  </section>`;
  bindMouldHistory(v); bindMouldFiche(v, cat);
  $$('[data-subcat]', v).forEach(b => b.addEventListener('click', () => go('category', b.dataset.subcat)));
  const drawShared = () => {
    const shared = []; const box = $('#catShared', v);
    if (!shared.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<section class="panel" style="margin-bottom:18px"><div class="panel-head"><h2>${ic('layers')} Articles en commun avec ${esc(cat.name)}</h2><span class="count-note">${shared.length} article${shared.length > 1 ? 's' : ''} rangé${shared.length > 1 ? 's' : ''} dans une autre catégorie</span></div>
      <div class="table-wrap"><table class="data"><thead><tr><th></th><th>Article</th><th>Rangé dans</th><th class="r">Qté</th><th>Emplacement</th><th>Statut</th></tr></thead><tbody>
      ${shared.map(i => `<tr data-item="${i.id}"><td style="width:48px">${thumbHtml(i)}</td><td class="clip">${esc(itemName(i))}${itemRef(i) ? `<div class="muted mono" style="font-size:11.5px">${esc(itemRef(i))}</div>` : ''}</td><td>${linkChips(['c:' + i.categoryId])}</td><td class="r num">${isStockCat(catOf(i)) ? `<b>${fmtNum(itemQty(i))}</b>` : '—'}</td><td class="muted clip">${esc(itemLoc(i)) || '—'}</td><td>${isStockCat(catOf(i)) ? statusBadge(stockStatus(i)) : ''}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    hydrateIcons(box); bindCommon(box); bindLinkChips(box);
  };
  const draw = () => {
    const q = ui.q.trim().toLowerCase();
    const sharedIds = new Set(linkedFrom('c:' + cat.id).filter(i => i.categoryId !== cat.id).map(i => i.id));
    const hit = (i) => !q || Object.values(i.values).some(x => typeof x !== 'boolean' && !(typeof x === 'string' && x.startsWith('data:')) && String(x).toLowerCase().includes(q));
    let rows = [...Repo.items.byCategory(cat.id), ...[...sharedIds].map(id => Repo.items.get(id))].filter(hit);
    const val = (i, c) => sharedVal(i, c, cat);
    if (ui.sort.key) { const col = cat.columns.find(c => c.id === ui.sort.key); if (col) rows.sort((a, b) => cmp(val(a, col), val(b, col)) * ui.sort.dir); else if (ui.sort.key === '_status') { const r = { out: 0, low: 1, ok: 2, na: 3 }; rows.sort((a, b) => (r[stockStatus(a)] - r[stockStatus(b)]) * ui.sort.dir); } }
    const nSh = rows.filter(i => sharedIds.has(i.id)).length; $('#catCount', v).textContent = `${rows.length} article${rows.length > 1 ? 's' : ''}${nSh ? ` · dont ${nSh} en commun` : ''}`;
    const box = $('#catItems', v);
    if (!Repo.items.byCategory(cat.id).length && !sharedIds.size) { box.innerHTML = `<div class="empty"><b>Aucun article dans cette catégorie</b>Le formulaire se génère à partir des ${cat.columns.length} colonnes définies.<br><button class="btn btn-accent" id="emptyAdd" type="button">${ic('plus')}Ajouter le premier article</button></div>`; $('#emptyAdd', v).addEventListener('click', () => openItemForm(cat.id)); hydrateIcons(box); return; }
    if (!rows.length) { box.innerHTML = '<div class="empty"><b>Aucun résultat</b>Aucun article ne contient ce texte.</div>'; return; }
    if (ui.mode === 'cards') {
      const kvCols = shownCols.filter(c => !['longtext', 'link'].includes(c.type) && c.role !== 'name' && c.role !== 'reference').slice(0, 4);
      box.innerHTML = `<div class="cards">${rows.map(i => { const img = itemImage(i); const sh = sharedIds.has(i.id); return `<article class="icard ${ui.sel.has(i.id) ? 'selected' : ''} ${sh ? 'shared' : ''}" data-item="${i.id}">${sh ? `<span class="shared-tag" title="Rangé dans ${esc(catLabel(catOf(i)))}">↔ Commun · ${esc(catOf(i).name)}</span>` : `<label class="icard-sel" title="Sélectionner"><input type="checkbox" data-sel="${i.id}" ${ui.sel.has(i.id) ? 'checked' : ''} aria-label="Sélectionner"></label>`}<div class="pic">${img ? `<img src="${img}" alt="${esc(itemName(i))}">` : `<div class="ph" style="background:${cat.color}">${esc(cat.code)}</div>`}${stock ? statusBadge(stockStatus(i)) : ''}</div>
        <div class="body">${itemRef(i) ? `<span><span class="ref">${esc(itemRef(i))}</span></span>` : ''}<div class="title">${esc(itemName(i))}</div>${linkCols(cat).map(lc => linkChips(i.values[lc.id], { empty: '' })).join('')}<div class="kv">${kvCols.map(c => { const x = val(i, c); return `<span>${esc(c.name)}</span><b>${c.type === 'checkbox' ? (x ? 'Oui' : 'Non') : c.type === 'date' ? fmtDate(x) : (x === undefined || x === null || x === '' ? '—' : esc(x) + (c.unit ? ' ' + esc(c.unit) : ''))}</b>`; }).join('')}</div></div>
        <div class="foot"><span class="muted" style="font-size:12px">${relTime(i.updatedAt)}</span><button class="icon-btn small" data-menu="${i.id}" type="button" aria-label="Actions">${ic('more')}</button></div></article>`; }).join('')}</div>`;
    } else {
      const th = (id, l, cls = '') => `<th class="sortable ${cls}" data-sort="${id}">${esc(l)}<span class="arr">${ui.sort.key === id ? (ui.sort.dir > 0 ? '▲' : '▼') : ''}</span></th>`;
      box.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th class="selcell"><input type="checkbox" class="selall" aria-label="Tout sélectionner" ${rows.some(i => !sharedIds.has(i.id)) && rows.filter(i => !sharedIds.has(i.id)).every(i => ui.sel.has(i.id)) ? 'checked' : ''}></th>${imgCol ? '<th></th>' : ''}${shownCols.map(c => th(c.id, c.name + (c.unit ? ` (${c.unit})` : ''), ['number', 'quantity'].includes(c.type) ? 'r' : '')).join('')}${stock ? th('_status', 'Statut') : ''}<th></th></tr></thead><tbody>
        ${rows.map(i => { const sh = sharedIds.has(i.id); return `<tr data-item="${i.id}" class="${ui.sel.has(i.id) ? 'selected' : ''} ${sh ? 'shared' : ''}"><td class="selcell">${sh ? `<span class="shared-ic" title="Article en commun, rangé dans ${esc(catLabel(catOf(i)))}">↔</span>` : `<input type="checkbox" data-sel="${i.id}" ${ui.sel.has(i.id) ? 'checked' : ''} aria-label="Sélectionner">`}</td>${imgCol ? `<td style="width:48px">${thumbHtml(i)}</td>` : ''}${shownCols.map((c, k) => `<td class="${['number', 'quantity'].includes(c.type) ? 'r' : ''} ${['text', 'longtext'].includes(c.type) ? 'clip' : ''}">${['number', 'quantity'].includes(c.type) ? displayValue(Object.assign({}, c, { unit: '' }), val(i, c), true) : displayValue(c, val(i, c), true)}${sh && k === 0 ? ` <span class="shared-tag inline">↔ ${esc(catOf(i).name)}</span>` : ''}</td>`).join('')}${stock ? `<td>${statusBadge(stockStatus(i))}</td>` : ''}<td class="actions"><button class="icon-btn small" data-menu="${i.id}" type="button" aria-label="Actions">${ic('more')}</button></td></tr>`; }).join('')}
      </tbody></table></div>`;
      $$('th[data-sort]', box).forEach(h => h.addEventListener('click', () => { const k = h.dataset.sort; ui.sort = { key: k, dir: ui.sort.key === k ? -ui.sort.dir : 1 }; draw(); }));
    }
    hydrateIcons(box); bindCommon(box); bindLinkChips(box);
    $$('[data-menu]', box).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); itemMenu(b, b.dataset.menu); }));
    $$('[data-sel]', box).forEach(cb => { cb.addEventListener('click', e => e.stopPropagation()); cb.addEventListener('change', () => { cb.checked ? ui.sel.add(cb.dataset.sel) : ui.sel.delete(cb.dataset.sel); const row = cb.closest('[data-item]'); if (row) row.classList.toggle('selected', cb.checked); const all = $('.selall', box); if (all) all.checked = rows.filter(i => !sharedIds.has(i.id)).every(i => ui.sel.has(i.id)); drawSelBar(); }); });
    const all = $('.selall', box); if (all) all.addEventListener('change', () => { rows.filter(i => !sharedIds.has(i.id)).forEach(i => all.checked ? ui.sel.add(i.id) : ui.sel.delete(i.id)); draw(); });
    drawSelBar();
  };
  /* selection bar: move several articles at once */
  const drawSelBar = () => {
    [...ui.sel].forEach(id => { const it = Repo.items.get(id); if (!it || it.categoryId !== cat.id) ui.sel.delete(id); });
    let bar = $('#selBar'); const n = ui.sel.size;
    if (!n) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'selBar'; bar.className = 'sel-bar'; document.body.appendChild(bar); }
    bar.innerHTML = `<b>${n}</b><span>article${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}</span><button class="btn btn-sm btn-accent" type="button" data-sb="move">${ic('folder')}Déplacer vers…</button><button class="btn btn-sm" type="button" data-sb="link">↔ En commun avec…</button><button class="btn btn-sm" type="button" data-sb="all">Tout sélectionner</button><button class="icon-btn small" type="button" data-sb="clear" aria-label="Annuler la sélection">${ic('x')}</button>`;
    hydrateIcons(bar);
    $('[data-sb="move"]', bar).addEventListener('click', () => openMoveDialog([...ui.sel], cat.id, () => { ui.sel.clear(); }));
    $('[data-sb="link"]', bar).addEventListener('click', () => openLinkDialog([...ui.sel], cat.id, () => { ui.sel.clear(); }));
    $('[data-sb="all"]', bar).addEventListener('click', () => { Repo.items.byCategory(cat.id).forEach(i => ui.sel.add(i.id)); draw(); });
    $('[data-sb="clear"]', bar).addEventListener('click', () => { ui.sel.clear(); draw(); });
  };
  drawShared();
  $('#catQ', v).addEventListener('input', debounce(e => { ui.q = e.target.value; draw(); }));
  $$('[data-mode]', v).forEach(b => b.addEventListener('click', () => { ui.mode = b.dataset.mode; $$('[data-mode]', v).forEach(x => x.classList.toggle('on', x === b)); draw(); }));
  $('#addItem', v).addEventListener('click', () => openItemForm(cat.id));
  $('#addCol', v).addEventListener('click', () => openColumnForm(cat.id));
  $('#manageCols', v).addEventListener('click', () => openColumnsManager(cat.id));
  $('#catMenu', v).addEventListener('click', e => { e.stopPropagation(); openMenu(e.currentTarget, [
    { label: 'Renommer / déplacer', icon: 'edit', onClick: () => openCategoryForm(cat.id) },
    { label: 'Gérer les colonnes', icon: 'columns', onClick: () => openColumnsManager(cat.id) },
    'sep', { label: 'Supprimer la catégorie', icon: 'trash', danger: true, onClick: () => deleteCategory(cat.id) }]); });
  draw();
}
function itemMenu(anchor, itemId) {
  const it = Repo.items.get(itemId); const stock = isStockCat(catOf(it)) && !isNonStockItem(it);
  openMenu(anchor, [
    { label: 'Voir le détail', icon: 'eye', onClick: () => openItemDetail(itemId) },
    { label: 'Modifier', icon: 'edit', onClick: () => openItemForm(it.categoryId, itemId) },
    { label: 'Dupliquer', icon: 'copy', onClick: () => duplicateItem(itemId) },
    { label: 'Déplacer vers…', icon: 'folder', onClick: () => openMoveDialog([itemId], it.categoryId) },
    { label: 'En commun avec…', icon: 'layers', onClick: () => openLinkDialog([itemId], it.categoryId) },
    ...(stock ? [{ label: 'Mouvement de stock', icon: 'swap', onClick: () => openMovementForm(itemId) }] : []),
    'sep', { label: 'Supprimer', icon: 'trash', danger: true, onClick: () => deleteItem(itemId) },
  ]);
}
async function deleteItem(itemId) {
  const it = Repo.items.get(itemId);
  const ok = await confirmDialog({ title: "Supprimer l'article ?", message: `<b>${esc(itemName(it))}</b>${itemRef(it) ? ` (<span class="mono">${esc(itemRef(it))}</span>)` : ''} sera supprimé définitivement. Son historique reste visible dans le journal.`, confirmLabel: 'Supprimer' });
  if (!ok) return; Repo.items.remove(itemId); const top = Modal.top(); if (top && top.el.dataset.item === itemId) top.close(); toast('Article supprimé', 'ok'); render();
}
function duplicateItem(itemId) {
  const it = Repo.items.get(itemId); const cat = catOf(it); const values = clone(it.values);
  const refCol = roleCol(cat, 'reference'); if (refCol && values[refCol.id]) values[refCol.id] = values[refCol.id] + '-COPIE';
  const qCol = roleCol(cat, 'quantity'); if (qCol) values[qCol.id] = 0;
  const copy = Repo.items.create(cat.id, values); toast('Article dupliqué, quantité remise à zéro', 'ok'); render(); openItemForm(cat.id, copy.id);
}

/* ---------- Settings ---------- */
function viewSettings(v) {
  const s = Repo.settings.get(); const used = StorageAdapter.usage(); const quota = 5 * 1024 * 1024; const db = Repo.raw();
  const imgs = db.items.reduce((n, i) => n + Object.values(i.values).filter(x => typeof x === 'string' && x.startsWith('data:image')).length, 0);
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">Configuration</div><h1>Paramètres</h1></div></div>
  <div class="settings-grid">
    <section class="panel"><div class="panel-head"><h2>Société et utilisateur</h2></div><div class="panel-body"><div class="form-grid">
      <div class="fg"><label for="setCompany">Nom de la société</label><input class="input" id="setCompany" value="${esc(s.company)}"></div>
      <div class="fg"><label for="setUser">Utilisateur courant</label><input class="input" id="setUser" value="${esc(s.user)}"><span class="hint">Enregistré dans chaque mouvement du journal.</span></div>
      <div class="fg"><label for="setTheme">Thème</label><select class="select full" id="setTheme"><option value="system" ${s.theme === 'system' ? 'selected' : ''}>Selon le système</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Clair</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Sombre</option></select></div>
      <div class="fg full"><button class="btn btn-accent" id="saveSettings" type="button" style="align-self:flex-start">Enregistrer</button></div>
    </div></div></section>
    <section class="panel"><div class="panel-head"><h2>Sauvegarde</h2><span class="sync-inline" data-state="${Cloud.status()}">${Cloud.online() ? 'En ligne : chaque modification est enregistrée automatiquement' : 'Local : données enregistrées dans ce navigateur uniquement'}</span></div><div class="panel-body">
      <div style="display:flex;justify-content:space-between;font-size:13px"><span>${(used / 1024).toFixed(0)} Ko utilisés</span><span class="muted">≈ 5 Mo disponibles dans le navigateur</span></div>
      <div class="storage-meter"><span style="width:${Math.min(100, used / quota * 100)}%"></span></div>
      <p class="muted" style="font-size:12.5px;margin:6px 0 14px">${db.categories.length} catégories · ${db.items.length} articles · ${db.movements.length} mouvements · ${imgs} image${imgs > 1 ? 's' : ''}. Les images sont compressées à 800 px avant l'enregistrement.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn" id="exportJson" type="button">${ic('download')}Sauvegarder (JSON)</button>
        <button class="btn" id="copyJson" type="button">${ic('copy')}Copier la sauvegarde</button>
        <button class="btn" id="importJson" type="button">${ic('upload')}Restaurer une sauvegarde</button>
      </div>
    </div></section>
    ${FB.on ? `<section class="panel"><div class="panel-head"><h2>Compte</h2></div><div class="panel-body"><p style="margin:0 0 12px">Compte <b>${esc((FB.auth.currentUser || {}).email || '')}</b> · profil de cet appareil : <b>${esc(Repo.settings.get().user || '')}</b>. Les données sont enregistrées en ligne et partagées entre le PC et les téléphones.</p><div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" id="chgProfile" type="button">${ic('swap')}Changer de profil</button><button class="btn" id="signOut" type="button">${ic('x')}Se déconnecter</button></div></div></section>` : ''}
    <section class="panel" ${FB.on ? 'hidden' : ''}><div class="panel-head"><h2>Jeux de données</h2></div><div class="panel-body">
      <p class="muted" style="margin:0 0 14px">« Inventaire initial » remet les 15 pièces de rechange importées depuis inv.xlsx. « Démo » charge un exemple complet (machines, joints, produits finis…) pour tester.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" id="resetReal" type="button">Revenir à l'inventaire initial</button><button class="btn" id="resetDemo" type="button">Charger la démo</button><button class="btn btn-danger" id="wipe" type="button">${ic('trash')}Tout effacer</button></div>
    </div></section>
    <section class="panel" ${FB.on || Cloud.online() ? 'hidden' : ''}><div class="panel-head"><h2>Brancher une base de données</h2></div><div class="panel-body">
      <p class="muted" style="margin:0 0 10px">L'interface ne lit et n'écrit que via <span class="mono">Repo</span>. Pour passer sur un serveur, remplacez <span class="mono">StorageAdapter</span> dans <span class="mono">app.js</span> par des appels à votre API :</p>
      <pre class="code">GET  /api/db          → load()
PUT  /api/db          → save(db)
POST /api/movements   → Repo.journal.add(m)</pre>
    </div></section>
  </div>`;
  $('#saveSettings', v).addEventListener('click', () => { Repo.settings.update({ company: $('#setCompany', v).value.trim() || 'Ma société', user: $('#setUser', v).value.trim() || 'Utilisateur', theme: $('#setTheme', v).value }); applyTheme(); renderNav(); renderCrumbs(); toast('Paramètres enregistrés', 'ok'); });
  $('#exportJson', v).addEventListener('click', exportBackup);
  const so = $('#signOut', v); if (so) so.addEventListener('click', signOutFirebase);
  const cp = $('#chgProfile', v); if (cp) cp.addEventListener('click', async () => { if (await chooseProfile(true)) { renderNav(); render(); toast('Profil changé', 'ok'); } });
  $('#copyJson', v).addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(Repo.raw())); toast('Sauvegarde copiée dans le presse-papiers', 'ok'); } catch (e) { toast('Copie refusée par le navigateur.', 'bad'); } });
  $('#importJson', v).addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.addEventListener('change', () => { const f = inp.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = async () => { try { const d = JSON.parse(fr.result); if (!d.categories || !d.items || !d.movements) throw new Error(); if (await confirmDialog({ title: 'Restaurer cette sauvegarde ?', message: `Les données actuelles seront remplacées par ${d.categories.length} catégories et ${d.items.length} articles.`, confirmLabel: 'Restaurer' })) { Repo.replace(d); applyTheme(); toast('Sauvegarde restaurée', 'ok'); go('dashboard'); } } catch (e) { toast("Ce fichier n'est pas une sauvegarde StockPilot valide.", 'bad'); } }; fr.readAsText(f); });
    inp.click();
  });
  $('#resetDemo', v).addEventListener('click', async () => { if (await confirmDialog({ title: 'Charger la démo ?', message: 'Toutes vos données actuelles seront remplacées par les données de démonstration.', confirmLabel: 'Charger la démo' })) { Repo.reset(seedDemo); state.cat = {}; toast('Démo rechargée', 'ok'); go('categories'); } });
  $('#resetReal', v).addEventListener('click', async () => { if (await confirmDialog({ title: "Revenir à l'inventaire initial ?", message: 'Toutes vos données actuelles seront remplacées par les 15 pièces importées depuis inv.xlsx.', confirmLabel: 'Remplacer' })) { Repo.reset(seedReal); state.cat = {}; toast('Inventaire initial chargé', 'ok'); go('categories'); } });
  $('#wipe', v).addEventListener('click', async () => { if (await confirmDialog({ title: 'Tout effacer ?', message: 'Catégories, articles, images et journal seront supprimés. Pensez à sauvegarder avant.', confirmLabel: 'Tout effacer' })) { const s0 = Repo.settings.get(); Repo.replace({ schemaVersion: 1, settings: s0, categories: [], items: [], movements: [] }); toast('Données effacées', 'ok'); go('categories'); } });
}


/* ======================= 10b. FICHES D'INTERVENTION MAINTENANCE (FQ03.Ps.MNT.05) =======================
   One record per intervention, mirroring the paper form. Text fields accept @mentions of any item or category:
   the text keeps "@Label", and `mentions` maps each label to its ref (i:<itemId> / c:<catId>). */
const FI_CODE = 'FQ03.Ps.MNT.05 V1';
const FI_STATUS = { open: { label: 'Ouverte', cls: 'b-low' }, progress: { label: 'En cours', cls: 'b-info' }, closed: { label: 'Clôturée', cls: 'b-ok' } };
const FI_NATURES = ['Électrique', 'Mécanique', 'Automate', 'Autres'];
const FI_TEXT_FIELDS = [['description', "Description de l'anomalie ou des travaux demandés"], ['diagnostic', 'Diagnostic et analyse des causes'], ['travaux', 'Travaux réalisés']];

const fiList = () => Repo.raw().interventions || (Repo.raw().interventions = []);
function fiNextNumber() {
  const y = new Date().getFullYear(); const pre = `FI-${y}-`;
  const max = fiList().filter(f => (f.number || '').startsWith(pre)).reduce((m, f) => Math.max(m, parseInt(f.number.slice(pre.length), 10) || 0), 0);
  return pre + String(max + 1).padStart(3, '0');
}
function fiDuration(f) {
  if (!f.stopAt || !f.restartAt) return '';
  const a = new Date(f.stopAt), b = new Date(f.restartAt); if (isNaN(a) || isNaN(b) || b < a) return '';
  const min = Math.round((b - a) / 60000); const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}
/** All refs a fiche touches (equipment, mentions, parts) — used to list fiches on an item page. */
function fiRefs(f) {
  const set = new Set(f.equipment || []);
  Object.values(f.mentions || {}).forEach(r => set.add(r));
  (f.parts || []).forEach(p => { if (p.itemId) set.add('i:' + p.itemId); });
  return set;
}
const fiForRef = (ref) => fiList().filter(f => fiRefs(f).has(ref)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/* ---------- mention rendering ---------- */
function mentionText(text, mentions) {
  let html = esc(text || '');
  const labels = Object.keys(mentions || {}).sort((a, b) => b.length - a.length);
  labels.forEach(label => {
    const l = refLabel(mentions[label]); const token = esc('@' + label);
    const chip = l ? `<button type="button" class="linkchip mention" data-goref="${l.kind}:${l.id}" style="--c:${l.color}" title="${esc(l.sub ? l.sub + ' › ' : '')}${esc(l.name)}">${ic(l.kind === 'c' ? 'folder' : 'box')}<span>${esc(label)}</span></button>` : `<span class="muted">@${esc(label)}</span>`;
    html = html.split(token).join(chip);
  });
  return html.replace(/\n/g, '<br>') || '<span class="muted">—</span>';
}
/** Everything that can be mentioned or chosen as equipment: items of every category + categories/folders. */
function mentionCandidates() {
  const items = Repo.items.list().map(i => { const c = catOf(i); return { ref: 'i:' + i.id, label: (itemName(i) + (itemRef(i) ? ' ' + itemRef(i) : '')).replace(/\s+/g, ' ').trim(), sub: c ? catLabel(c) : '', color: c ? c.color : '#888', kind: 'i' }; });
  const cats = Repo.categories.list().map(c => ({ ref: 'c:' + c.id, label: c.name, sub: isFolder(c) ? 'Dossier' : 'Catégorie', color: c.color, kind: 'c' }));
  return [...items, ...cats];
}
/** Turns a textarea into a @mention field. `mentions` is shared by the whole form. */
function attachMentions(ta, mentions, onChange) {
  const pop = document.createElement('div'); pop.className = 'mention-pop'; pop.hidden = true; ta.parentNode.style.position = 'relative'; ta.parentNode.appendChild(pop);
  let hits = [], idx = 0, start = -1;
  const close = () => { pop.hidden = true; start = -1; };
  const query = () => {
    const pos = ta.selectionStart; const before = ta.value.slice(0, pos); const at = before.lastIndexOf('@');
    if (at < 0 || (at > 0 && !/\s|[(,.;:]/.test(before[at - 1]))) return null;
    const q = before.slice(at + 1); if (q.length > 40 || /\n/.test(q)) return null; return { at, q };
  };
  const draw = () => {
    const r = query(); if (!r) return close(); start = r.at; const q = r.q.toLowerCase();
    hits = mentionCandidates().filter(c => !q || (c.label + ' ' + c.sub).toLowerCase().includes(q)).slice(0, 8); idx = 0;
    if (!hits.length) { pop.innerHTML = '<div class="mp-empty">Aucun article ni catégorie ne correspond</div>'; pop.hidden = false; return; }
    pop.innerHTML = `<div class="mp-head">Mentionner un article ou une catégorie</div>` + hits.map((h, k) => `<button type="button" class="mp-item ${k === idx ? 'on' : ''}" data-k="${k}"><span class="dot" style="background:${h.color}"></span><span class="t"><b>${esc(h.label)}</b><span>${esc(h.sub)}</span></span></button>`).join('');
    pop.hidden = false;
    $$('.mp-item', pop).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); pick(+b.dataset.k); }));
  };
  const pick = (k) => {
    const h = hits[k]; if (!h || start < 0) return;
    let label = h.label; let n = 2; while (mentions[label] && mentions[label] !== h.ref) label = `${h.label} (${n++})`;
    mentions[label] = h.ref;
    const pos = ta.selectionStart; ta.value = ta.value.slice(0, start) + '@' + label + ' ' + ta.value.slice(pos);
    const caret = start + label.length + 2; ta.setSelectionRange(caret, caret); ta.focus(); close(); onChange && onChange();
  };
  ta.addEventListener('input', () => { draw(); onChange && onChange(); });
  ta.addEventListener('click', draw);
  ta.addEventListener('keydown', e => {
    if (pop.hidden || !hits.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; $$('.mp-item', pop).forEach((b, k) => b.classList.toggle('on', k === idx)); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(idx); }
    else if (e.key === 'Escape') { e.stopPropagation(); close(); }
  });
  ta.addEventListener('blur', () => setTimeout(close, 150));
}

/* ---------- list view ---------- */
state.fi = { q: '', status: '', type: '' };
function viewInterventions(v) {
  const st = state.fi; const all = fiList();
  const month = new Date().toISOString().slice(0, 7);
  const k = { open: all.filter(f => f.status === 'open').length, progress: all.filter(f => f.status === 'progress').length, closedMonth: all.filter(f => f.status === 'closed' && (f.date || '').startsWith(month)).length, mc: all.filter(f => f.type === 'MC').length, mp: all.filter(f => f.type === 'MP').length };
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">${FI_CODE} · Maintenance</div><h1>Fiches d'intervention</h1><p>Demandes et rapports d'intervention sur les machines, moules et installations, avec les pièces consommées.</p></div>
    <div class="actions"><button class="btn btn-accent" id="fiNew" type="button">${ic('plus')}Nouvelle fiche</button></div></div>
  <div class="kpis fi-kpis">
    <div class="kpi warn link" data-fist="open"><div class="k-label">${ic('alert')}Ouvertes</div><div class="k-val">${k.open}</div><div class="k-sub">en attente d'intervention</div></div>
    <div class="kpi link" data-fist="progress"><div class="k-label">${ic('clock')}En cours</div><div class="k-val">${k.progress}</div><div class="k-sub">intervention démarrée</div></div>
    <div class="kpi link" data-fist="closed"><div class="k-label">${ic('check')}Clôturées ce mois</div><div class="k-val">${k.closedMonth}</div><div class="k-sub">${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div></div>
    <div class="kpi"><div class="k-label">${ic('settings')}Curatif / Préventif</div><div class="k-val">${k.mc}<span style="font-size:18px;color:var(--ink-3)"> / ${k.mp}</span></div><div class="k-sub">MC / MP, toutes fiches</div></div>
  </div>
  <section class="panel">
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Statut">${[['', 'Toutes'], ['open', 'Ouvertes'], ['progress', 'En cours'], ['closed', 'Clôturées']].map(([s, l]) => `<button type="button" class="${st.status === s ? 'on' : ''}" data-fis="${s}" style="padding:6px 12px;font-weight:600;font-size:12.5px">${l}</button>`).join('')}</div>
      <select class="select" id="fiType" aria-label="Type"><option value="">MP et MC</option><option value="MP" ${st.type === 'MP' ? 'selected' : ''}>MP · Préventive</option><option value="MC" ${st.type === 'MC' ? 'selected' : ''}>MC · Curative</option></select>
      <div class="spacer"></div>
      <label class="field-inline">${ic('search')}<input id="fiQ" type="search" placeholder="N°, équipement, description, pièce…" value="${esc(st.q)}"></label>
    </div>
    <div id="fiTable"></div>
  </section>`;
  const draw = () => {
    const q = st.q.trim().toLowerCase();
    const rows = all.filter(f => (!st.status || f.status === st.status) && (!st.type || f.type === st.type) && (!q || [f.number, f.description, f.diagnostic, f.travaux, f.provider, f.maintenanceBy, ...(f.equipment || []).map(r => (refLabel(r) || {}).name), ...(f.parts || []).map(p => p.label)].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));
    $('#fiTable', v).innerHTML = rows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>N°</th><th>Date</th><th>Équipement / installation</th><th>Description</th><th>Type</th><th>Nature</th><th>Acteur</th><th>Durée</th><th>Statut</th></tr></thead><tbody>
      ${rows.map(f => `<tr data-fi="${f.id}"><td><span class="ref">${esc(f.number)}</span></td><td class="num" style="white-space:nowrap">${fmtDate(f.date)}</td><td>${linkChips(f.equipment)}</td><td class="clip" style="max-width:320px">${esc((f.description || '').slice(0, 90))}${clBadge(f)}</td><td>${f.type ? `<span class="tag">${f.type}</span>` : '—'}</td><td class="muted">${esc((f.natures || []).join(', ')) || '—'}</td><td class="muted">${esc(f.actor || '—')}</td><td class="num">${fiDuration(f) || '—'}</td><td><span class="badge ${FI_STATUS[f.status || 'open'].cls}">${FI_STATUS[f.status || 'open'].label}</span></td></tr>`).join('')}
      </tbody></table></div>`
      : `<div class="empty"><b>${all.length ? 'Aucune fiche ne correspond' : 'Aucune fiche d’intervention'}</b>${all.length ? 'Modifiez la recherche ou les filtres.' : 'Créez la première fiche : équipement, description, diagnostic, travaux et pièces.'}${all.length ? '' : `<br><button class="btn btn-accent" id="fiNew2" type="button">${ic('plus')}Nouvelle fiche</button>`}</div>`;
    hydrateIcons(v); bindLinkChips($('#fiTable', v));
    $$('tr[data-fi]', v).forEach(r => r.addEventListener('click', e => { if (e.target.closest('button')) return; openFicheDetail(r.dataset.fi); }));
    const n2 = $('#fiNew2', v); if (n2) n2.addEventListener('click', () => openFicheForm());
  };
  $('#fiNew', v).addEventListener('click', () => openFicheForm());
  $$('[data-fis]', v).forEach(b => b.addEventListener('click', () => { st.status = b.dataset.fis; viewInterventions(v); hydrateIcons(v); }));
  $$('[data-fist]', v).forEach(b => b.addEventListener('click', () => { st.status = b.dataset.fist; viewInterventions(v); hydrateIcons(v); }));
  $('#fiType', v).addEventListener('change', e => { st.type = e.target.value; draw(); });
  $('#fiQ', v).addEventListener('input', debounce(e => { st.q = e.target.value; draw(); }));
  draw();
}

/* ---------- form ---------- */
function openFicheForm(id, preset = {}) {
  const f0 = id ? fiList().find(x => x.id === id) : null;
  const now = new Date(); const today = now.toISOString().slice(0, 10); const hm = now.toTimeString().slice(0, 5);
  const f = f0 ? clone(f0) : Object.assign({ number: fiNextNumber(), status: 'open', date: today, time: hm, maintenanceBy: Repo.settings.get().user || '', equipment: [], mentions: {}, natures: [], parts: [], type: 'MC', actor: 'Interne', consumeStock: true }, preset);
  f.mentions = f.mentions || {}; f.parts = f.parts || []; f.equipment = f.equipment || [];
  const cands = mentionCandidates();
  const stockable = Repo.items.list().filter(i => isStockCat(catOf(i)) && !isNonStockItem(i));
  const partOptions = `<option value="">— Choisir dans le stock —</option>` + itemCats().filter(isStockCat).map(c => `<optgroup label="${esc(catLabel(c))}">${Repo.items.byCategory(c.id).map(i => `<option value="${i.id}">${esc((itemRef(i) ? itemRef(i) + ' — ' : '') + itemName(i))} (${fmtNum(itemQty(i))} ${esc(qtyUnit(i))})</option>`).join('')}</optgroup>`).join('') + `<option value="__free">Autre (saisie libre)</option>`;
  const locked = !!f.stockApplied;
  const m = Modal.open({
    title: f0 ? `Fiche ${f.number}` : 'Nouvelle fiche d’intervention', sub: `${FI_CODE} · Fiche d’intervention maintenance`, size: 'wide fi-modal',
    body: `<div class="fi-form">
      <div class="fi-band"><div><span class="muted">N°</span> <b class="mono">${esc(f.number)}</b></div>
        <div class="seg" id="fiStatus">${Object.entries(FI_STATUS).map(([k, s]) => `<button type="button" data-st="${k}" class="${f.status === k ? 'on' : ''}" style="padding:6px 12px;font-weight:600;font-size:12.5px">${s.label}</button>`).join('')}</div></div>

      <div class="fi-sec"><div class="fi-sec-h">Équipement / Installation associés</div>
        <div class="linkfield" id="fiEq"><div class="linksel"></div>
          <select class="select full" id="fiEqAdd"><option value="">+ Ajouter une machine, un moule, un produit ou une catégorie…</option>
            <optgroup label="Articles (machines, moules, produits, pièces)">${cands.filter(c => c.kind === 'i').map(c => `<option value="${c.ref}">${esc(c.sub)} › ${esc(c.label)}</option>`).join('')}</optgroup>
            <optgroup label="Catégories et dossiers">${cands.filter(c => c.kind === 'c').map(c => `<option value="${c.ref}">${esc(c.label)}</option>`).join('')}</optgroup></select></div></div>
      <div id="fiCL"></div>

      ${FI_TEXT_FIELDS.slice(0, 1).map(([k, l]) => `<div class="fi-sec"><div class="fi-sec-h">${l}</div><div class="fi-ta"><textarea class="textarea" id="fi_${k}" rows="3" placeholder="Décrivez… tapez @ pour mentionner une pièce, un produit ou une machine">${esc(f[k] || '')}</textarea></div><div class="fi-prev" id="fiprev_${k}"></div></div>`).join('')}

      <div class="fi-grid2">
        <div class="fi-sec"><div class="fi-sec-h">Demande · Service maintenance</div><div class="form-grid">
          <div class="fg"><label for="fiDate">Date</label><input class="input" type="date" id="fiDate" value="${esc(f.date || '')}"></div>
          <div class="fg"><label for="fiTime">Heure</label><input class="input" type="time" id="fiTime" value="${esc(f.time || '')}"></div>
          <div class="fg full"><label for="fiMaint">Service maintenance</label><input class="input" id="fiMaint" value="${esc(f.maintenanceBy || '')}" placeholder="Nom"></div>
          <div class="fg full"><label class="check"><input type="checkbox" id="fiVisaM" ${f.visaMaintenance ? 'checked' : ''}>Visa service maintenance</label></div></div></div>
        <div class="fi-sec"><div class="fi-sec-h">Prestataire de service</div><div class="form-grid">
          <div class="fg"><label for="fiPDate">Date</label><input class="input" type="date" id="fiPDate" value="${esc(f.providerDate || '')}"></div>
          <div class="fg"><label for="fiPTime">Heure</label><input class="input" type="time" id="fiPTime" value="${esc(f.providerTime || '')}"></div>
          <div class="fg full"><label for="fiProv">Prestataire</label><input class="input" id="fiProv" value="${esc(f.provider || '')}" placeholder="Société ou technicien"></div>
          <div class="fg full"><label class="check"><input type="checkbox" id="fiVisaP" ${f.visaProvider ? 'checked' : ''}>Visa prestataire</label></div></div></div>
      </div>

      <div class="fi-grid3">
        <div class="fi-sec"><div class="fi-sec-h">Type de maintenance</div><div class="fi-radios">${[['MP', 'MP · Préventive'], ['MC', 'MC · Curative']].map(([k, l]) => `<label class="check"><input type="radio" name="fiType" value="${k}" ${f.type === k ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
        <div class="fi-sec"><div class="fi-sec-h">Nature</div><div class="fi-radios">${FI_NATURES.map(n => `<label class="check"><input type="checkbox" name="fiNat" value="${esc(n)}" ${f.natures.includes(n) ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div></div>
        <div class="fi-sec"><div class="fi-sec-h">Acteur</div><div class="fi-radios">${['Interne', 'Externe (prestation)'].map(a => `<label class="check"><input type="radio" name="fiActor" value="${esc(a)}" ${f.actor === a ? 'checked' : ''}>${esc(a)}</label>`).join('')}</div></div>
      </div>

      ${FI_TEXT_FIELDS.slice(1).map(([k, l]) => `<div class="fi-sec"><div class="fi-sec-h">${l}</div><div class="fi-ta"><textarea class="textarea" id="fi_${k}" rows="3" placeholder="Tapez @ pour mentionner une pièce, un produit ou une machine">${esc(f[k] || '')}</textarea></div><div class="fi-prev" id="fiprev_${k}"></div></div>`).join('')}

      <div class="fi-sec"><div class="fi-sec-h">Pièces de rechange et consommables ${locked ? '<span class="badge b-ok" style="margin-left:8px">Sorties du stock</span>' : ''}</div>
        <div class="fi-parts" id="fiParts"></div>
        ${locked ? '<p class="muted" style="font-size:12.5px;margin:6px 0 0">Ces pièces ont déjà été sorties du stock (voir le journal). Pour corriger, faites un mouvement de stock.</p>' : `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px"><button class="btn btn-sm" id="fiAddPart" type="button">${ic('plus')}Ajouter une pièce</button><label class="check" style="font-size:13px"><input type="checkbox" id="fiConsume" ${f.consumeStock ? 'checked' : ''}>Sortir ces pièces du stock à l’enregistrement</label></div>`}
      </div>

      <div class="fi-grid3">
        <div class="fg"><label for="fiStop">Heure d’arrêt</label><input class="input" type="datetime-local" id="fiStop" value="${esc(f.stopAt || '')}"></div>
        <div class="fg"><label for="fiRestart">Heure de reprise</label><input class="input" type="datetime-local" id="fiRestart" value="${esc(f.restartAt || '')}"></div>
        <div class="fg"><label>Durée de l’intervention</label><div class="fi-dur" id="fiDur">—</div></div>
      </div>
      <div class="fi-grid2">
        <div class="fg"><label for="fiResp">Responsable maintenance</label><input class="input" id="fiResp" value="${esc(f.respMaintenance || '')}"><label class="check" style="margin-top:6px"><input type="checkbox" id="fiVisaR" ${f.visaResp ? 'checked' : ''}>Visa</label></div>
        <div class="fg"><label for="fiReq">Service demandeur</label><input class="input" id="fiReq" value="${esc(f.requester || '')}"><label class="check" style="margin-top:6px"><input type="checkbox" id="fiVisaReq" ${f.visaRequester ? 'checked' : ''}>Visa</label></div>
      </div>
    </div>`,
    foot: `${f0 ? `<button class="btn btn-ghost left" id="fiDel" type="button" style="color:var(--bad)">${ic('trash')}Supprimer</button>` : ''}<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="fiSave" type="button">${f0 ? 'Enregistrer' : 'Créer la fiche'}</button>`,
  });
  // status
  $$('#fiStatus [data-st]', m.el).forEach(b => b.addEventListener('click', () => { f.status = b.dataset.st; $$('#fiStatus [data-st]', m.el).forEach(x => x.classList.toggle('on', x === b)); }));
  // equipment chips
  function drawCL() { renderChecklist(f, $('#fiCL', m.el)); }
  const drawEq = () => {
    drawCL();
    $('#fiEq .linksel', m.el).innerHTML = f.equipment.length ? f.equipment.map(r => { const l = refLabel(r); return l ? `<span class="linkchip static" style="--c:${l.color}">${ic(l.kind === 'c' ? 'folder' : 'settings')}<span>${esc(l.name)}</span><button type="button" data-unlink="${r}" aria-label="Retirer">×</button></span>` : ''; }).join('') : '<span class="muted" style="font-size:12.5px">Aucun équipement choisi</span>';
    hydrateIcons(m.el); $$('#fiEqAdd option', m.el).forEach(o => { if (o.value) o.disabled = f.equipment.includes(o.value); });
    $$('#fiEq [data-unlink]', m.el).forEach(b => b.addEventListener('click', () => { f.equipment = f.equipment.filter(x => x !== b.dataset.unlink); drawEq(); }));
  };
  $('#fiEqAdd', m.el).addEventListener('change', e => { if (e.target.value && !f.equipment.includes(e.target.value)) f.equipment.push(e.target.value); e.target.value = ''; drawEq(); });
  drawEq();
  // mention fields + live preview
  FI_TEXT_FIELDS.forEach(([k]) => { const ta = $('#fi_' + k, m.el); const prev = $('#fiprev_' + k, m.el);
    const upd = () => { const used = Object.keys(f.mentions).some(lb => ta.value.includes('@' + lb)); prev.innerHTML = used ? `<span class="muted" style="font-size:11.5px">Aperçu :</span> ${mentionText(ta.value, f.mentions)}` : ''; hydrateIcons(prev); bindLinkChips(prev); };
    attachMentions(ta, f.mentions, upd); upd(); });
  // parts
  const drawParts = () => {
    const box = $('#fiParts', m.el);
    box.innerHTML = f.parts.length ? `<table class="data fi-ptable"><thead><tr><th>Pièce / référence</th><th class="r" style="width:110px">Qté</th>${locked ? '' : '<th style="width:40px"></th>'}</tr></thead><tbody>${f.parts.map((p, k) => {
      const it = p.itemId && Repo.items.get(p.itemId);
      return `<tr style="cursor:default"><td>${locked || it ? (it ? linkChips(['i:' + it.id]) + (it ? ` <span class="muted" style="font-size:12px">stock : ${fmtNum(itemQty(it))} ${esc(qtyUnit(it))}</span>` : '') : esc(p.label)) : ''}${!locked && !it ? `<div style="display:flex;gap:6px"><select class="select full" data-psel="${k}">${partOptions}</select>${p.free ? `<input class="input" data-plabel="${k}" value="${esc(p.label || '')}" placeholder="Désignation / référence">` : ''}</div>` : ''}</td>
        <td class="r">${locked ? `<b>${fmtNum(p.qty)}</b>` : `<input class="input num" type="number" min="0" step="any" data-pqty="${k}" value="${esc(p.qty ?? '')}" style="width:90px;text-align:right">`}</td>${locked ? '' : `<td><button class="icon-btn small" data-prm="${k}" type="button" aria-label="Retirer">${ic('x')}</button></td>`}</tr>`; }).join('')}</tbody></table>`
      : '<p class="muted" style="font-size:12.5px;margin:0">Aucune pièce. Ajoutez les pièces de rechange et consommables utilisés.</p>';
    hydrateIcons(box); bindLinkChips(box);
    $$('[data-psel]', box).forEach(s => { const k = +s.dataset.psel; if (f.parts[k].free) s.value = '__free'; s.addEventListener('change', () => { if (s.value === '__free') { f.parts[k].free = true; f.parts[k].itemId = ''; } else if (s.value) { f.parts[k] = { itemId: s.value, qty: f.parts[k].qty || 1, label: itemName(Repo.items.get(s.value)) }; } drawParts(); }); });
    $$('[data-plabel]', box).forEach(i => i.addEventListener('input', () => { f.parts[+i.dataset.plabel].label = i.value; }));
    $$('[data-pqty]', box).forEach(i => i.addEventListener('input', () => { f.parts[+i.dataset.pqty].qty = i.value === '' ? '' : Number(i.value); }));
    $$('[data-prm]', box).forEach(b => b.addEventListener('click', () => { f.parts.splice(+b.dataset.prm, 1); drawParts(); }));
  };
  const ap = $('#fiAddPart', m.el); if (ap) ap.addEventListener('click', () => { f.parts.push({ itemId: '', qty: 1, label: '' }); drawParts(); });
  drawParts();
  // duration
  const syncDur = () => { $('#fiDur', m.el).textContent = fiDuration({ stopAt: $('#fiStop', m.el).value, restartAt: $('#fiRestart', m.el).value }) || '—'; };
  $('#fiStop', m.el).addEventListener('change', syncDur); $('#fiRestart', m.el).addEventListener('change', syncDur); syncDur();
  // delete
  const del = $('#fiDel', m.el); if (del) del.addEventListener('click', async () => { if (!(await confirmDialog({ title: 'Supprimer la fiche ?', message: `La fiche <b>${esc(f.number)}</b> sera supprimée. Les mouvements de stock déjà enregistrés restent dans le journal.`, confirmLabel: 'Supprimer' }))) return; Repo.interventions.remove(f.id); m.close(); toast('Fiche supprimée', 'ok'); render(); });
  // save
  $('#fiSave', m.el).addEventListener('click', () => {
    const val = (s) => $(s, m.el).value.trim();
    Object.assign(f, { date: val('#fiDate'), time: val('#fiTime'), maintenanceBy: val('#fiMaint'), visaMaintenance: $('#fiVisaM', m.el).checked, providerDate: val('#fiPDate'), providerTime: val('#fiPTime'), provider: val('#fiProv'), visaProvider: $('#fiVisaP', m.el).checked,
      type: ($('[name=fiType]:checked', m.el) || {}).value || '', natures: $$('[name=fiNat]:checked', m.el).map(x => x.value), actor: ($('[name=fiActor]:checked', m.el) || {}).value || '',
      stopAt: val('#fiStop'), restartAt: val('#fiRestart'), respMaintenance: val('#fiResp'), visaResp: $('#fiVisaR', m.el).checked, requester: val('#fiReq'), visaRequester: $('#fiVisaReq', m.el).checked });
    FI_TEXT_FIELDS.forEach(([k]) => f[k] = $('#fi_' + k, m.el).value);
    // keep only mentions still present in a text field
    const allText = FI_TEXT_FIELDS.map(([k]) => f[k]).join('\n'); Object.keys(f.mentions).forEach(lb => { if (!allText.includes('@' + lb)) delete f.mentions[lb]; });
    if (!f.equipment.length && !f.description.trim()) { toast("Choisissez un équipement ou décrivez l'anomalie.", 'bad'); return; }
    f.parts = f.parts.filter(p => p.itemId || (p.label || '').trim()).map(p => Object.assign(p, { qty: Number(p.qty) || 0 }));
    const cons = $('#fiConsume', m.el); if (cons) f.consumeStock = cons.checked;
    clSync(f);
    if (f.checklist) { if (f.checklist.visa && !f.checklist.visaBy) f.checklist.visaBy = f.respMaintenance || ''; if (f.status === 'closed') { const pb = clProblem(f.checklist); if (pb) { toast(pb, 'bad'); const el = $('#fiCL', m.el); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } } }
    // stock exit for parts (once)
    if (!f.stockApplied && f.consumeStock) {
      const lines = f.parts.filter(p => p.itemId && p.qty > 0 && Repo.items.get(p.itemId));
      const short = lines.find(p => { const it = Repo.items.get(p.itemId); return (itemQty(it) || 0) < p.qty; });
      if (short) { const it = Repo.items.get(short.itemId); toast(`Stock insuffisant pour ${itemName(it)} : ${fmtNum(itemQty(it))} disponible(s).`, 'bad'); return; }
      lines.forEach(p => { const it = Repo.items.get(p.itemId); const qc = roleCol(catOf(it), 'quantity'); const q0 = itemQty(it) || 0; const v = clone(it.values); v[qc.id] = q0 - p.qty; Repo.items.update(it.id, v); logMovement(Repo.items.get(it.id), 'out', p.qty, q0, q0 - p.qty, `Intervention ${f.number}`); });
      if (lines.length) { f.stockApplied = true; toast(`${lines.length} pièce(s) sortie(s) du stock`, 'ok'); }
    }
    if (f0) Repo.interventions.update(f); else Repo.interventions.create(f);
    toast(`Fiche ${f.number} enregistrée`, 'ok'); m.close(); render();
  });
}

/* ---------- detail (paper layout) ---------- */
function openFicheDetail(id) {
  const f = fiList().find(x => x.id === id); if (!f) return;
  const chk = (b) => `<span class="fi-box ${b ? 'on' : ''}">${b ? '✓' : ''}</span>`;
  const m = Modal.open({
    title: `Fiche ${f.number}`, sub: `${FI_CODE} · ${fmtDate(f.date)} ${esc(f.time || '')}`, size: 'wide fi-modal',
    body: `<div class="fi-paper">
      <div class="fi-head"><div class="fi-logo"><img src="logo-tunisie-silicone.png" alt="Tunisie Silicone"></div><div class="fi-title"><b>TUNISIE SILICONE</b><span>Fiche d’intervention maintenance</span></div><div class="fi-meta"><span>Code : ${FI_CODE}</span><span>N° ${esc(f.number)}</span><span class="badge ${FI_STATUS[f.status || 'open'].cls}">${FI_STATUS[f.status || 'open'].label}</span></div></div>
      <div class="fi-row two"><div><h4>Équipement / Installation associés</h4>${linkChips(f.equipment)}</div><div><h4>Description de l’anomalie ou des travaux demandés</h4><div class="fi-text">${mentionText(f.description, f.mentions)}</div></div></div>
      <div class="fi-row two"><div><h4>Service maintenance</h4><p>${fmtDate(f.date)} · ${esc(f.time || '—')}<br>${esc(f.maintenanceBy || '—')} ${chk(f.visaMaintenance)} Visa</p></div><div><h4>Prestataire de service</h4><p>${f.providerDate ? fmtDate(f.providerDate) : '—'} · ${esc(f.providerTime || '—')}<br>${esc(f.provider || '—')} ${chk(f.visaProvider)} Visa</p></div></div>
      <div class="fi-row three"><div><h4>Type de maintenance</h4><p>${chk(f.type === 'MP')} MP · Préventive<br>${chk(f.type === 'MC')} MC · Curative</p></div><div><h4>Nature</h4><p>${FI_NATURES.map(n => `${chk((f.natures || []).includes(n))} ${n}`).join('<br>')}</p></div><div><h4>Acteur</h4><p>${chk(f.actor === 'Interne')} Interne<br>${chk((f.actor || '').startsWith('Externe'))} Externe (prestation)</p></div></div>
      <div class="fi-row"><div><h4>Diagnostic et analyse des causes</h4><div class="fi-text">${mentionText(f.diagnostic, f.mentions)}</div></div></div>
      <div class="fi-row two wide-left"><div><h4>Travaux réalisés</h4><div class="fi-text">${mentionText(f.travaux, f.mentions)}</div></div><div><h4>Pièces de rechange et consommables</h4>${(f.parts || []).length ? `<table class="data"><thead><tr><th>Référence</th><th class="r">Qté</th></tr></thead><tbody>${f.parts.map(p => `<tr style="cursor:default"><td>${p.itemId && Repo.items.get(p.itemId) ? linkChips(['i:' + p.itemId]) : esc(p.label || '—')}</td><td class="r num"><b>${fmtNum(p.qty)}</b></td></tr>`).join('')}</tbody></table>${f.stockApplied ? '<p class="muted" style="font-size:12px;margin:6px 0 0">Sorties du stock enregistrées dans le journal.</p>' : ''}` : '<p class="muted">—</p>'}</div></div>
      ${clPaperHtml(f)}
      <div class="fi-row three"><div><h4>Heure d’arrêt</h4><p>${f.stopAt ? fmtDateTime(f.stopAt) : '—'}</p></div><div><h4>Heure de reprise</h4><p>${f.restartAt ? fmtDateTime(f.restartAt) : '—'}</p></div><div><h4>Durée de l’intervention</h4><p><b>${fiDuration(f) || '—'}</b></p></div></div>
      <div class="fi-row two"><div><h4>Responsable maintenance</h4><p>${esc(f.respMaintenance || '—')} ${chk(f.visaResp)} Visa</p></div><div><h4>Service demandeur</h4><p>${esc(f.requester || '—')} ${chk(f.visaRequester)} Visa</p></div></div>
      <p class="fi-foot">MP : Maintenance Préventive · MC : Maintenance curative</p>
    </div>`,
    foot: `<button class="btn" data-close type="button">Fermer</button><button class="btn btn-accent" id="fiEdit" type="button">${ic('edit')}Modifier</button>`,
  });
  bindLinkChips(m.el);
  $('#fiEdit', m.el).addEventListener('click', () => { m.close(); openFicheForm(id); });
}
/** Small list of fiches touching a ref, for item details. */
function fichesBlock(ref) {
  const list = fiForRef(ref); if (!list.length) return '';
  return `<div class="section-title">Fiches d’intervention (${list.length})</div><div class="fi-mini">${list.slice(0, 8).map(f => `<button type="button" class="fi-mini-row" data-openfi="${f.id}"><span class="ref">${esc(f.number)}</span><span class="muted">${fmtDate(f.date)}</span><span class="clip">${esc((f.description || f.travaux || '').slice(0, 70))}</span><span class="badge ${FI_STATUS[f.status || 'open'].cls}">${FI_STATUS[f.status || 'open'].label}</span></button>`).join('')}</div>`;
}

const MP_SEED = {"mp": [["TYM-UI", "Unitée d'injection", "", "Nettoyage de l'armoire Electrique et vérification fusible, câblage )", "T", ""], ["TYM-UI", "Unitée d'injection", "", "Vérification Niveau d'huile", "A", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Démontage + nettoyage au essence après alcool", "C", "Après arrêt > 7 jours"], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Vérification de l'Etanchiété des joint Mélangeur", "T", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Graissage Roulement Melangeur si nécessaire", "T", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Graissage de toutes les surfaces où de la rouille apparaît int/ext.", "T", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Verification cablage air , eau interieur de machine", "T", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Changement Roulement", "A", ""], ["TYM-UI", "Unitée d'injection", "Mélangeur statique + vis dynamique", "Inspection mécanique : usure, pales, rotation", "T", ""], ["TYM-UI", "Unitée d'injection", "Cylindre", "Vérification Joint Mélangeur changer si necessaire", "T", ""], ["TYM-UI", "Unitée d'injection", "Cylindre", "Vidange complète + nettoyage intérieur cylindre", "C", "Après arrêt > 10 jours"], ["TYM-UI", "Unitée d'injection", "Cylindre", "Inspection piston : usure, étanchéité", "T", ""], ["TYM-UI", "Unitée d'injection", "Cylindre", "Contrôle des résidus ou dépôts de silicone", "T", ""], ["TYM-MP", "Metering Pump", "", "Purger l’unité d’injection Part A pour éviter polymérisation précoce", "C", "2,5 jours sans production"], ["TYM-MP", "Metering Pump", "", "Vidange de A & B (comme AB) selon protocole", "C", "3,5 jours sans production"], ["TYM-MP", "Metering Pump", "", "Vérification visuelle du fonctionnement des verins", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Vidange systeme de refroidissement", "S", ""], ["TYM-EAU", "Système de refroidissement", "", "Changement flexible eau", "A", ""], ["TYM-EAU", "Système de refroidissement", "", "Nettoyage des Ventilateurs", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Nettoyage four interne / externe", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Vérification visuelle des résistance four (automate)", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Vérification visuelle des joints Porte", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Nettoyage armoire Electrique Four avec air ( a bas pression )", "T", ""], ["TYM-EAU", "Système de refroidissement", "", "Dépoussièrage armoire electirque", "T", ""], ["COM", "Compresseur", "", "Vidange compresseur", "C", "Si necessaire"], ["COM", "Compresseur", "", "Vérification niveau d'huile", "T", ""], ["COM", "Compresseur", "", "Changement filtres", "C", "Si necessaire"], ["", "Palan de levage portique", "", "Garaissage des chaines", "A", ""], ["", "Armoire electrique", "", "Dépoussiérage de l'armoire Electrique", "A", ""], ["MC", "Machine de Conditionnement", "", "Verification etape de coditionnement (visuelle)", "T", ""], ["MC", "Machine de Conditionnement", "", "Verification moule de conditionnement ( soudage )", "T", ""], ["MC", "Machine de Conditionnement", "", "Verification etat de plateau machine ( visuelle )", "T", ""], ["W-FC1", "Four de cuisson", "", "Nettoyage four interne / externe", "T", ""], ["W-FC1", "Four de cuisson", "", "Vérification des résistance four", "T", ""], ["W-FC1", "Four de cuisson", "", "Vérification des joints Porte", "T", ""], ["MP", "Machine de perçage", "", "Verification la bon fonctionnement de machine", "T", ""], ["", "Moule d'injection silicone & plastique", "", "Nettoyage / entretien", "A", "Avant chaque production"]], "cal": [["Compresseur", "Manomètre 1", "CAI963497", "bar", 12, "2025-07-07", "N°P/689/25/3", "2026-07-07", "validé"], ["Soupape", "Manomètre 1", "Néant", "bar", 12, "2025-07-07", "N°P/690/25/3", "2026-07-07", "validé"], ["Pompe Colorant", "Manomètre 1", "90700005", "bar", 12, "2025-07-17", "N° P/ 015/25/6", "2026-07-07", "validé"], ["Metering Pump", "Manomètre 1", "Néant", "bar", 12, "2025-07-07", "N°P/688/25/3", "2026-07-07", "validé"], ["Metering Pump", "Manomètre 2", "9070005", "bar", 12, "2025-07-07", "N°P/68/.25/3", "2026-07-07", "validé"], ["Unité d'injection", "Manomètre 5", "12860007", "bar", 12, "2025-07-07", "N°P/686/25/3", "2026-07-07", "validé"], ["Unité d'injection", "Manomètre 6", "Néant", "bar", 12, "2025-07-07", "N°P/685/25/3", "2026-07-07", "validé"], ["Unité d'injection", "Thermocouple 1", "Néant", "T°C", 24, "2025-07-07", "N°T/540/25/1", "2027-07-07", "validé"], ["Unité d'injection", "Thermocouple 2", "Néant", "T°C", 24, "2025-07-07", "N°T/541/25/1", "2027-07-07", "validé"], ["Unité d'injection", "Thermocouple 3", "Néant", "T°C", 24, "2025-07-07", "N°T/539/25/1", "2027-07-07", "validé"], ["Unité d'injection", "Thermocouple 4", "Néant", "T°C", 24, "2025-07-07", "N°T/53725/1", "2027-07-07", "validé"], ["Unité d'injection", "Thermocouple 5", "Néant", "T°C", 24, "2025-07-07", "N°T/536/25/1", "2027-07-07", "validé"], ["Unité d'injection", "Thermocouple 6", "Néant", "T°C", 24, "2025-07-07", "N°T/538/25/1", "2027-07-07", "validé"], ["Système de refroidissement", "Sonde de T°C", "WS1714629", "bar", 12, "2025-07-07", "N°T/542/25/1", "2026-07-07", "validé"], ["Four de cuisson", "Thermocouple 1", "WS1709089", "T°C", 24, "2025-07-17", "N°T/558/25/1", "2027-07-07", "validé"], ["Machine de Conditionnement", "Manomètre 1", "9030004", "bar", 12, "2025-07-17", "N°P/014/25/6", "2026-07-07", "validé"], ["Machine de Conditionnement", "Ampérage ( Qualification )", "", "Amp", 12, "", "", "", "validé"]]};

/* ======================= 10c. PLANNING DE MAINTENANCE PRÉVENTIVE (FQ01.Ps.MNT.05) + ÉTALONNAGE (FQ05.Ps.MNT.05) =======================
   One record per task (kind 'mp') or per measuring device (kind 'cal'). Each record carries its next due date;
   marking it done stores the history line, moves the due date by one period and can create a closed MP fiche. */
const MP_CODE = 'FQ01.Ps.MNT.05 V3'; const CAL_CODE = 'FQ05.Ps.MNT.05 V1';
const MP_FREQ = {
  W: { label: 'Hebdomadaire', short: 'Hebdo', days: 7 },
  M: { label: 'Mensuel', short: 'Mens.', months: 1 },
  T: { label: 'Trimestriel', short: 'Trim.', months: 3 },
  S: { label: 'Semestriel', short: 'Sem.', months: 6 },
  A: { label: 'Annuel', short: 'Ann.', months: 12 },
  B: { label: 'Tous les 2 ans', short: '2 ans', months: 24 },
  C: { label: 'Conditionnel', short: 'Cond.' },
};
const MP_ST = {
  late: { label: 'En retard', cls: 'b-out' }, soon: { label: 'À faire', cls: 'b-low' }, ok: { label: 'Planifiée', cls: 'b-ok' },
  cond: { label: 'Sur condition', cls: 'b-na' }, none: { label: 'À planifier', cls: 'b-na' },
};
const ymd = (d) => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const parseYmd = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); const x = new Date(y, (m || 1) - 1, d || 1); return isNaN(x) ? null : x; };
const todayYmd = () => ymd(new Date());
function addPeriod(s, freq, k = 1) {
  const f = MP_FREQ[freq]; const d = parseYmd(s); if (!f || !d || (!f.days && !f.months)) return '';
  if (f.days) d.setDate(d.getDate() + f.days * k);
  else { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + f.months * k); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  return ymd(d);
}
const daysUntil = (s) => { const d = parseYmd(s); if (!d) return null; const t = parseYmd(todayYmd()); return Math.round((d - t) / 86400000); };

/** Builds the initial plan from the company sheet. Dates of the MP tasks are placeholders spread over each period;
    calibration dates come from the sheet. Deterministic (same ids/dates on every device the same day). */
function seedMaintenance(d) {
  let s = 977; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const t0 = parseYmd(todayYmd()); const at = (n) => { const x = new Date(t0); x.setDate(x.getDate() + n); return ymd(x); };
  const guess = (name) => guessEquipRef(d, name);
  const created = new Date(t0).toISOString(); let n = 0;
  const mk = (o) => Object.assign({ id: 'mp-' + String(++n).padStart(3, '0'), order: n, createdAt: created, active: true, history: [], ref: '', lastDone: '', nextDue: '' }, o);
  const out = [];
  MP_SEED.mp.forEach(([code, name, comp, task, freq, cond]) => {
    const t = mk({ kind: 'mp', equipCode: code, equipName: name, component: comp, task, freq, condition: cond, ref: guess(name) });
    const f = MP_FREQ[freq];
    if (f && f.months) {
      const span = f.months * 30; const r = rnd();
      const off = r < 0.14 ? -Math.ceil(rnd() * 20) : r < 0.32 ? Math.floor(rnd() * 8) : 8 + Math.floor(rnd() * Math.max(10, span - 8));
      t.nextDue = at(off); const last = addPeriod(t.nextDue, freq, -1); if (last <= todayYmd()) t.lastDone = last;
    }
    out.push(t);
  });
  MP_SEED.cal.forEach(([eq, device, serial, unit, months, last, cert, next, result]) => {
    const freq = months === 24 ? 'B' : 'A';
    out.push(mk({ kind: 'cal', equipCode: '', equipName: eq, component: '', task: device, device, serial, unit, freq, condition: '', cert, result, lastDone: last, nextDue: next || at(15 + Math.floor(rnd() * 60)), ref: guess(eq) }));
  });
  return out;
}
function guessEquipRef(d, name) {
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const n = norm(name); if (n.length < 4) return '';
  const it = (d.items || []).find(i => { const c = (d.categories || []).find(x => x.id === i.categoryId); if (!c) return false; const nc = c.columns.find(x => x.role === 'name'); const v = norm(nc ? i.values[nc.id] : ''); return v && v.length > 3 && (v === n || v.includes(n)); });
  if (it) return 'i:' + it.id;
  const c = (d.categories || []).find(x => { const v = norm(x.name); return v.length > 3 && (v === n || n.startsWith(v) || v.startsWith(n)); });
  return c ? 'c:' + c.id : '';
}

const mpList = () => Repo.raw().mp || (Repo.raw().mp = []);
const mpAlertDays = () => { const v = Number(Repo.settings.get().mpAlertDays); return isNaN(v) || v < 0 ? 7 : v; };
function mpStatus(t) {
  if (t.freq === 'C' && !t.nextDue) return 'cond';
  const n = daysUntil(t.nextDue); if (n === null) return 'none';
  if (n < 0) return 'late'; if (n <= mpAlertDays()) return 'soon'; return 'ok';
}
const mpActive = () => mpList().filter(t => t.active !== false);
function mpCounts() {
  const a = mpActive(); const k = { late: 0, soon: 0, calLate: 0, month: 0 }; const mo = todayYmd().slice(0, 7);
  a.forEach(t => { const s = mpStatus(t); if (s === 'late') { k.late++; if (t.kind === 'cal') k.calLate++; } if (s === 'soon') k.soon++; if ((t.nextDue || '').startsWith(mo)) k.month++; });
  return k;
}
const mpDueList = () => mpActive().filter(t => ['late', 'soon'].includes(mpStatus(t))).sort((a, b) => (a.nextDue || '').localeCompare(b.nextDue || ''));
function dueText(t) {
  const n = daysUntil(t.nextDue); if (n === null) return t.freq === 'C' ? esc(t.condition || 'Sur condition') : 'Non planifiée';
  if (n < 0) return `<b style="color:var(--bad)">${-n} j de retard</b>`; if (n === 0) return '<b style="color:var(--warn)">Aujourd’hui</b>'; if (n === 1) return 'Demain';
  return n <= mpAlertDays() ? `<b style="color:var(--warn)">dans ${n} j</b>` : `dans ${n} j`;
}
function mpEquipHtml(t, withCode = true) {
  const l = t.ref && refLabel(t.ref);
  const code = withCode && t.equipCode ? `<span class="ref">${esc(t.equipCode)}</span> ` : '';
  return code + (l ? `<button type="button" class="linkchip" data-goref="${l.kind}:${l.id}" style="--c:${l.color}" title="Ouvrir ${esc(l.name)}">${ic(l.kind === 'c' ? 'folder' : 'settings')}<span>${esc(t.equipName || l.name)}</span></button>` : `<span>${esc(t.equipName || '—')}</span>`);
}
const mpStBadge = (t) => { const s = MP_ST[mpStatus(t)]; return `<span class="badge ${s.cls}">${s.label}</span>`; };
/** Occurrences of the task in `year`: month (0-11) → date, projected from nextDue in both directions. */
function mpMonths(t, year) {
  const f = MP_FREQ[t.freq]; const out = new Map(); if (!t.nextDue || !f || (!f.months && !f.days)) return out;
  for (let k = -60; k <= 60; k++) { const s = addPeriod(t.nextDue, t.freq, k); const y = +s.slice(0, 4); if (y === year && !out.has(+s.slice(5, 7) - 1)) out.set(+s.slice(5, 7) - 1, s); if (y > year) break; }
  return out;
}

/* ---------- shell: sidebar badge, alert bar, daily reminder ---------- */
function renderMpBadge() {
  const b = $('#mpBadge'); if (!b) return; const k = mpCounts(); const n = k.late + k.soon;
  b.textContent = n; b.hidden = !n; b.classList.toggle('hot', !!k.late);
  b.title = `${k.late} en retard · ${k.soon} à faire sous ${mpAlertDays()} j`;
}
let mpBarDismissed = '';
function renderMpBar() {
  const bar = $('#mpBar'); if (!bar) return; const k = mpCounts(); const sig = `${k.late}/${k.soon}/${todayYmd()}`;
  if (!(k.late + k.soon) || state.view === 'maintenance' || mpBarDismissed === sig) { bar.hidden = true; return; }
  bar.hidden = false; bar.className = 'mp-bar' + (k.late ? ' late' : '');
  bar.innerHTML = `<span class="mp-bar-ic">${ic('bell')}</span><span class="mp-bar-t"><b>Maintenance préventive</b> · ${k.late ? `<b>${k.late}</b> en retard` : ''}${k.late && k.soon ? ' · ' : ''}${k.soon ? `<b>${k.soon}</b> à faire sous ${mpAlertDays()} jours` : ''}${k.calLate ? ` <span class="mp-bar-sub">(dont ${k.calLate} étalonnage${k.calLate > 1 ? 's' : ''})</span>` : ''}</span>
    <button class="btn btn-sm" type="button" data-mpgo>Voir le planning</button><button class="icon-btn small" type="button" data-mpx aria-label="Masquer">${ic('x')}</button>`;
  hydrateIcons(bar);
  $('[data-mpgo]', bar).addEventListener('click', () => { state.mp.tab = 'due'; go('maintenance'); });
  $('[data-mpx]', bar).addEventListener('click', () => { mpBarDismissed = sig; bar.hidden = true; });
}
const REMIND_KEY = 'stockpilot.mp.reminded';
/** Once a day, at opening: a reminder window with everything late or due soon, plus a system notification when allowed. */
function mpReminder(force) {
  const due = mpDueList(); if (!due.length) { if (force) toast('Aucune tâche en retard ni à faire prochainement.', 'ok'); return; }
  let last = ''; try { last = localStorage.getItem(REMIND_KEY) || ''; } catch (e) { /* ignore */ }
  if (!force && last === todayYmd()) return;
  if (Modal.top()) { if (!force) setTimeout(() => mpReminder(false), 4000); return; }
  try { localStorage.setItem(REMIND_KEY, todayYmd()); } catch (e) { /* ignore */ }
  const k = mpCounts();
  try { if (window.Notification && Notification.permission === 'granted') new Notification('StockPilot · Maintenance préventive', { body: `${k.late} tâche(s) en retard, ${k.soon} à faire sous ${mpAlertDays()} jours.`, tag: 'sp-mp' }); } catch (e) { /* not allowed here */ }
  if (Modal.top()) return;
  const m = Modal.open({
    title: 'Rappel · Maintenance préventive', sub: `${k.late} en retard · ${k.soon} à faire sous ${mpAlertDays()} jours`, size: 'wide',
    body: `<div class="mp-remind">${due.slice(0, 10).map(t => `<div class="mp-rrow ${mpStatus(t)}"><div class="mp-rdate"><b>${fmtDate(t.nextDue)}</b><span>${dueText(t)}</span></div><div class="mp-rtask"><b>${esc(t.task)}</b><span>${t.kind === 'cal' ? 'Étalonnage · ' : ''}${mpEquipHtml(t)}${t.component ? ' · ' + esc(t.component) : ''}</span></div><button class="btn btn-sm btn-accent" type="button" data-mpdone="${t.id}">${ic('check')}Réalisée</button></div>`).join('')}
      ${due.length > 10 ? `<p class="muted" style="margin:8px 0 0">… et ${due.length - 10} autre(s).</p>` : ''}</div>`,
    foot: `<button class="btn" data-close type="button">Plus tard</button><button class="btn btn-accent" id="mpRGo" type="button">${ic('calendar')}Ouvrir le planning</button>`,
  });
  bindLinkChips(m.el);
  $$('[data-mpdone]', m.el).forEach(b => b.addEventListener('click', () => { m.close(); openMpDone(b.dataset.mpdone); }));
  $('#mpRGo', m.el).addEventListener('click', () => { m.close(); state.mp.tab = 'due'; go('maintenance'); });
}

/* ---------- main view ---------- */
state.mp = { tab: 'due', q: '', eq: '', year: new Date().getFullYear() };
function viewMaintenance(v) {
  const st = state.mp; const k = mpCounts(); const all = mpList();
  const equips = [...new Map(all.map(t => [(t.equipCode || '') + '|' + t.equipName, t])).values()];
  const calLate = all.filter(t => t.kind === 'cal' && mpStatus(t) === 'late').length;
  v.innerHTML = `
  <div class="page-head"><div><div class="eyebrow">${MP_CODE} · Maintenance</div><h1>Planning de maintenance préventive</h1><p>Chaque tâche a sa fréquence et sa prochaine échéance. L’application vous alerte dès qu’une échéance approche ; marquez la tâche réalisée pour planifier la suivante.</p></div>
    <div class="actions"><label class="field-inline mp-days" title="Délai d’alerte">${ic('bell')}<span>Alerter</span><select id="mpDays" aria-label="Alerter combien de jours avant">${[1, 3, 7, 14, 30].map(n => `<option value="${n}" ${mpAlertDays() === n ? 'selected' : ''}>${n} j avant</option>`).join('')}</select></label>
    <button class="btn" id="mpNotif" type="button">${ic('bell')}Notifications</button><button class="btn btn-accent" id="mpNew" type="button">${ic('plus')}Nouvelle tâche</button></div></div>
  <div class="kpis fi-kpis">
    <div class="kpi bad link" data-mpk="late"><div class="k-label">${ic('alert')}En retard</div><div class="k-val">${k.late}</div><div class="k-sub">échéance dépassée</div></div>
    <div class="kpi warn link" data-mpk="soon"><div class="k-label">${ic('clock')}À faire</div><div class="k-val">${k.soon}</div><div class="k-sub">dans les ${mpAlertDays()} prochains jours</div></div>
    <div class="kpi link" data-mpk="month"><div class="k-label">${ic('calendar')}Ce mois-ci</div><div class="k-val">${k.month}</div><div class="k-sub">${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div></div>
    <div class="kpi link ${calLate ? 'bad' : ''}" data-mptab="cal"><div class="k-label">${ic('adjust')}Étalonnage</div><div class="k-val">${all.filter(t => t.kind === 'cal').length}</div><div class="k-sub">${calLate ? `${calLate} en retard` : 'instruments suivis'}</div></div>
  </div>
  <section class="panel">
    <div class="toolbar">
      <div class="seg" role="tablist">${[['due', 'Échéancier'], ['plan', 'Planning annuel'], ['cal', 'Étalonnage']].map(([t, l]) => `<button type="button" class="${st.tab === t ? 'on' : ''}" data-mptab="${t}" style="padding:6px 12px;font-weight:600;font-size:12.5px">${l}</button>`).join('')}</div>
      ${st.tab === 'plan' ? `<div class="mp-year"><button class="icon-btn small" data-y="-1" type="button" aria-label="Année précédente">‹</button><b>${st.year}</b><button class="icon-btn small" data-y="1" type="button" aria-label="Année suivante">›</button></div>` : ''}
      <div class="spacer"></div>
      <select class="select" id="mpEq" aria-label="Équipement"><option value="">Tous les équipements</option>${equips.filter(t => st.tab === 'cal' ? t.kind === 'cal' : t.kind !== 'cal').map(t => { const key = (t.equipCode || '') + '|' + t.equipName; return `<option value="${esc(key)}" ${st.eq === key ? 'selected' : ''}>${esc((t.equipCode ? t.equipCode + ' · ' : '') + t.equipName)}</option>`; }).join('')}</select>
      <label class="field-inline">${ic('search')}<input id="mpQ" type="search" placeholder="Tâche, équipement, composant…" value="${esc(st.q)}"></label>
    </div>
    <div id="mpBody"></div>
  </section>`;
  const filt = (t) => { const q = st.q.trim().toLowerCase(); return (!st.eq || ((t.equipCode || '') + '|' + t.equipName) === st.eq) && (!q || [t.equipCode, t.equipName, t.component, t.task, t.condition, t.serial, t.cert].join(' ').toLowerCase().includes(q)); };
  const draw = () => {
    const body = $('#mpBody', v);
    if (st.tab === 'due') body.innerHTML = mpDueHtml(all.filter(t => t.kind !== 'cal' && filt(t)), all.filter(t => t.kind === 'cal' && filt(t) && ['late', 'soon'].includes(mpStatus(t))));
    else if (st.tab === 'plan') body.innerHTML = mpPlanHtml(all.filter(t => t.kind !== 'cal' && filt(t)), st.year);
    else body.innerHTML = mpCalHtml(all.filter(t => t.kind === 'cal' && filt(t)));
    hydrateIcons(body); bindLinkChips(body);
    $$('[data-mpdone]', body).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openMpDone(b.dataset.mpdone); }));
    $$('[data-mpedit]', body).forEach(r => r.addEventListener('click', e => { if (e.target.closest('button:not([data-mpedit])')) return; openMpForm(r.dataset.mpedit); }));
  };
  $$('[data-mptab]', v).forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.mptab; st.eq = ''; viewMaintenance(v); hydrateIcons(v); }));
  $$('[data-mpk]', v).forEach(b => b.addEventListener('click', () => { st.tab = 'due'; st.eq = ''; st.q = ''; viewMaintenance(v); hydrateIcons(v); const el = $(`#mpSec-${b.dataset.mpk === 'month' ? 'ok' : b.dataset.mpk}`, v) || $('#mpBody', v); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  $$('[data-y]', v).forEach(b => b.addEventListener('click', () => { st.year += +b.dataset.y; viewMaintenance(v); hydrateIcons(v); }));
  $('#mpEq', v).addEventListener('change', e => { st.eq = e.target.value; draw(); });
  $('#mpQ', v).addEventListener('input', debounce(e => { st.q = e.target.value; draw(); }));
  $('#mpDays', v).addEventListener('change', e => { Repo.settings.update({ mpAlertDays: Number(e.target.value) }); render(); });
  $('#mpNew', v).addEventListener('click', () => openMpForm(null, st.tab === 'cal' ? 'cal' : 'mp'));
  $('#mpNotif', v).addEventListener('click', async () => {
    try {
      if (!window.Notification) throw new Error('x');
      const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (p !== 'granted') throw new Error('x');
      new Notification('StockPilot', { body: 'Notifications activées : vous serez prévenu à l’ouverture quand une maintenance est due.' }); toast('Notifications activées', 'ok');
    } catch (e) { toast('Le navigateur bloque les notifications ici : l’alerte s’affichera dans l’application (bandeau + rappel).', 'bad'); }
  });
  draw();
}
function mpRow(t) {
  return `<tr data-mpedit="${t.id}" class="mp-tr ${mpStatus(t)}"><td class="num" style="white-space:nowrap">${t.nextDue ? `<b>${fmtDate(t.nextDue)}</b>` : '<span class="muted">—</span>'}<div style="font-size:12px">${dueText(t)}</div></td>
    <td>${mpEquipHtml(t)}</td><td class="muted">${esc(t.component || '')}</td><td class="mp-task">${esc(t.task)}${t.condition && t.freq !== 'C' ? `<div class="muted" style="font-size:12px">${esc(t.condition)}</div>` : ''}</td>
    <td><span class="tag">${MP_FREQ[t.freq] ? MP_FREQ[t.freq].label : '—'}</span></td><td class="num muted" style="white-space:nowrap">${t.lastDone ? fmtDate(t.lastDone) : '—'}</td><td>${mpStBadge(t)}</td>
    <td class="actions"><button class="btn btn-sm ${['late', 'soon'].includes(mpStatus(t)) ? 'btn-accent' : ''}" type="button" data-mpdone="${t.id}">${ic('check')}Réalisée</button></td></tr>`;
}
const MP_HEAD = '<thead><tr><th>Échéance</th><th>Équipement</th><th>Composant</th><th>Travaux de maintenance</th><th>Fréquence</th><th>Dernière</th><th>Statut</th><th></th></tr></thead>';
function mpDueHtml(tasks, cals) {
  const by = (s) => tasks.filter(t => mpStatus(t) === s).sort((a, b) => (a.nextDue || '').localeCompare(b.nextDue || ''));
  const sec = (id, title, list, note) => list.length ? `<div class="mp-sec" id="mpSec-${id}"><div class="mp-sec-h ${id}"><span>${title}</span><span class="muted">${list.length} tâche${list.length > 1 ? 's' : ''}${note ? ' · ' + note : ''}</span></div><div class="table-wrap"><table class="data mp-table">${MP_HEAD}<tbody>${list.map(mpRow).join('')}</tbody></table></div></div>` : '';
  const late = by('late'), soon = by('soon'), ok = by('ok'), cond = [...by('cond'), ...by('none')];
  if (!tasks.length && !cals.length) return `<div class="empty"><b>Aucune tâche</b>Ajoutez une tâche de maintenance préventive ou modifiez les filtres.</div>`;
  return sec('late', 'En retard', late) + (cals.length ? `<div class="mp-sec"><div class="mp-sec-h late"><span>Étalonnages à faire</span><span class="muted">${cals.length}</span></div><div class="table-wrap"><table class="data mp-table">${MP_HEAD}<tbody>${cals.map(mpRow).join('')}</tbody></table></div></div>` : '')
    + sec('soon', `À faire sous ${mpAlertDays()} jours`, soon) + sec('ok', 'Planifiées', ok) + sec('cond', 'Sur condition (à déclencher selon l’arrêt ou le besoin)', cond);
}
function mpPlanHtml(tasks, year) {
  if (!tasks.length) return '<div class="empty"><b>Aucune tâche</b></div>';
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const nowM = new Date().getFullYear() === year ? new Date().getMonth() : -1; let prev = '';
  const sorted = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  return `<div class="table-wrap"><table class="data mp-plan"><thead><tr><th>Équipement</th><th>Travaux</th><th>Fréq.</th>${months.map((m, i) => `<th class="c ${i === nowM ? 'now' : ''}">${m}</th>`).join('')}</tr></thead><tbody>
    ${sorted.map(t => { const key = (t.equipCode || '') + '|' + t.equipName; const first = key !== prev; prev = key; const occ = mpMonths(t, year);
      const done = new Set((t.history || []).filter(h => (h.date || '').startsWith(year + '-')).map(h => +h.date.slice(5, 7) - 1));
      return `<tr data-mpedit="${t.id}" class="${first ? 'grp' : ''}"><td>${first ? mpEquipHtml(t) : ''}</td><td class="mp-task">${t.component ? `<span class="muted">${esc(t.component)} · </span>` : ''}${esc(t.task)}</td><td><span class="tag">${MP_FREQ[t.freq] ? MP_FREQ[t.freq].short : '—'}</span></td>
        ${months.map((_, i) => { let c = '', x = '';
          if (t.freq === 'C') c = 'cond';
          else if (done.has(i)) { c = 'done'; x = '✓'; }
          else if (occ.has(i)) { const d = occ.get(i); if (d < t.nextDue) { c = 'past'; x = '✓'; } else if (d === t.nextDue && d < todayYmd()) { c = 'late'; x = '!'; } else { c = 'plan'; x = '●'; } }
          return `<td class="c mpc ${c} ${i === nowM ? 'now' : ''}" title="${occ.has(i) ? fmtDate(occ.get(i)) : ''}">${x}</td>`; }).join('')}</tr>`; }).join('')}
  </tbody></table></div><div class="legend" style="padding:10px 16px"><span><i style="background:var(--brand-blue,#1E5FD2)"></i>Prévue</span><span><i style="background:var(--ok)"></i>Réalisée</span><span><i style="background:var(--bad)"></i>En retard</span><span><i style="background:var(--line)"></i>Sur condition</span></div>`;
}
function mpCalHtml(list) {
  if (!list.length) return '<div class="empty"><b>Aucun instrument</b>Ajoutez un manomètre, un thermocouple ou une sonde à étalonner.</div>';
  let prev = '';
  return `<div class="mp-cal-note muted">${CAL_CODE} · Planning annuel d’étalonnage</div><div class="table-wrap"><table class="data mp-table"><thead><tr><th>Équipement</th><th>Dispositif</th><th>N° de série</th><th>Unité</th><th>Fréquence</th><th>Dernier étalonnage</th><th>N° certificat</th><th>Prochain</th><th>Statut</th><th>Résultat</th><th></th></tr></thead><tbody>
    ${list.sort((a, b) => (a.order || 0) - (b.order || 0)).map(t => { const first = t.equipName !== prev; prev = t.equipName; return `<tr data-mpedit="${t.id}" class="mp-tr ${mpStatus(t)} ${first ? 'grp' : ''}"><td>${first ? mpEquipHtml(t, false) : ''}</td><td><b style="font-weight:600">${esc(t.device || t.task)}</b></td><td class="mono muted">${esc(t.serial || '—')}</td><td>${esc(t.unit || '')}</td><td><span class="tag">${MP_FREQ[t.freq] ? MP_FREQ[t.freq].label : '—'}</span></td><td class="num">${t.lastDone ? fmtDate(t.lastDone) : '—'}</td><td class="mono" style="font-size:12px">${esc(t.cert || '—')}</td><td class="num" style="white-space:nowrap">${t.nextDue ? `<b>${fmtDate(t.nextDue)}</b>` : '—'}<div style="font-size:12px">${dueText(t)}</div></td><td>${mpStBadge(t)}</td><td>${t.result ? `<span class="badge ${/non/i.test(t.result) ? 'b-out' : 'b-ok'}">${esc(t.result)}</span>` : '—'}</td>
      <td class="actions"><button class="btn btn-sm ${['late', 'soon'].includes(mpStatus(t)) ? 'btn-accent' : ''}" type="button" data-mpdone="${t.id}">${ic('check')}Étalonné</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
}

/* ---------- mark done ---------- */
function openMpDone(id) {
  const t = mpList().find(x => x.id === id); if (!t) return; const cal = t.kind === 'cal'; const mentions = {};
  const m = Modal.open({
    title: cal ? 'Étalonnage réalisé' : 'Tâche réalisée', sub: `${esc(t.equipCode ? t.equipCode + ' · ' : '')}${esc(t.equipName)}${t.component ? ' · ' + esc(t.component) : ''}`, size: 'narrow',
    body: `<div class="mp-done-task"><b>${esc(t.task)}</b><span>${MP_FREQ[t.freq] ? MP_FREQ[t.freq].label : ''} · échéance ${t.nextDue ? fmtDate(t.nextDue) : '—'}</span></div>
      <div class="form-grid">
        <div class="fg"><label for="mdDate">Date de réalisation</label><input class="input" type="date" id="mdDate" value="${todayYmd()}" max="${todayYmd()}"></div>
        <div class="fg"><label for="mdBy">Réalisée par</label><input class="input" id="mdBy" value="${esc(Repo.settings.get().user || '')}"></div>
        ${cal ? `<div class="fg"><label for="mdCert">N° certificat</label><input class="input" id="mdCert" placeholder="N°P/…"></div><div class="fg"><label for="mdRes">Résultat</label><select class="select" id="mdRes"><option>validé</option><option>non conforme</option></select></div>` : ''}
        <div class="fg full"><label for="mdNote">Observations</label><div class="fi-ta"><textarea class="textarea" id="mdNote" rows="3" placeholder="Constat, pièces changées… tapez @ pour mentionner une pièce"></textarea></div></div>
        ${t.freq !== 'C' ? `<div class="fg"><label for="mdNext">Prochaine échéance</label><input class="input" type="date" id="mdNext"></div>` : '<div class="fg"></div>'}
        <div class="fg" style="align-self:end">${cal ? '' : `<label class="check"><input type="checkbox" id="mdFi" checked>Créer la fiche d’intervention (MP)</label>`}</div>
      </div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="mdSave" type="button">${ic('check')}Valider</button>`,
  });
  attachMentions($('#mdNote', m.el), mentions);
  const nx = $('#mdNext', m.el); const sync = () => { if (nx) nx.value = addPeriod($('#mdDate', m.el).value, t.freq); };
  $('#mdDate', m.el).addEventListener('change', sync); sync();
  $('#mdSave', m.el).addEventListener('click', () => {
    const date = $('#mdDate', m.el).value; if (!date) { toast('Indiquez la date de réalisation.', 'bad'); return; }
    const by = $('#mdBy', m.el).value.trim(); const note = $('#mdNote', m.el).value.trim();
    Object.keys(mentions).forEach(lb => { if (!note.includes('@' + lb)) delete mentions[lb]; });
    const h = { date, by, note, mentions };
    if (cal) { h.cert = $('#mdCert', m.el).value.trim(); h.result = $('#mdRes', m.el).value; }
    const fiBox = $('#mdFi', m.el);
    if (fiBox && fiBox.checked) {
      const mould = isMouldRelated(t.ref);
      const f = Repo.interventions.create({ number: fiNextNumber(), status: mould ? 'progress' : 'closed', checklist: mould ? newChecklist(mouldFromRef(t.ref), MP_FREQ[t.freq] && MP_FREQ[t.freq].months === 12 ? 'Annuel' : 'Après production') : undefined, date, time: '', maintenanceBy: by, visaMaintenance: true, type: 'MP', natures: [], actor: 'Interne', equipment: t.ref ? [t.ref] : [],
        description: `Maintenance préventive (${MP_FREQ[t.freq] ? MP_FREQ[t.freq].label.toLowerCase() : ''}) · ${t.equipCode ? t.equipCode + ' ' : ''}${t.equipName}${t.component ? ' / ' + t.component : ''} : ${t.task}`,
        diagnostic: '', travaux: note, mentions: Object.assign({}, mentions), parts: [], consumeStock: false, respMaintenance: by, mpTaskId: t.id });
      h.fiId = f.id; h.fiNumber = f.number;
    }
    const u = clone(t); u.history = [h, ...(t.history || [])].slice(0, 60); u.lastDone = date;
    if (cal) { if (h.cert) u.cert = h.cert; u.result = h.result; }
    if (t.freq !== 'C') u.nextDue = (nx && nx.value) || addPeriod(date, t.freq);
    Repo.mp.update(u); m.close();
    if (h.fiId && fiList().find(x => x.id === h.fiId).checklist) { render(); toast(`Remplissez la check-list moule de la fiche ${h.fiNumber}`, 'ok'); openFicheForm(h.fiId); return; }
    toast(h.fiNumber ? `Tâche validée · fiche ${h.fiNumber} créée` : 'Tâche validée, prochaine échéance planifiée', 'ok'); render();
  });
}

/* ---------- create / edit ---------- */
function openMpForm(id, kind = 'mp') {
  const t0 = id ? mpList().find(x => x.id === id) : null; const t = t0 ? clone(t0) : { kind, freq: kind === 'cal' ? 'A' : 'T', active: true, history: [], ref: '', nextDue: todayYmd(), lastDone: '' };
  const cal = t.kind === 'cal'; const cands = mentionCandidates();
  const equips = [...new Map(mpList().filter(x => x.kind === t.kind).map(x => [x.equipName, x])).values()];
  const m = Modal.open({
    title: t0 ? (cal ? 'Instrument à étalonner' : 'Tâche de maintenance préventive') : (cal ? 'Nouvel instrument à étalonner' : 'Nouvelle tâche préventive'), sub: cal ? CAL_CODE : MP_CODE, size: 'wide',
    body: `<div class="form-grid">
      ${cal ? '' : `<div class="fg"><label for="mfCode">Code machine</label><input class="input mono" id="mfCode" value="${esc(t.equipCode || '')}" placeholder="TYM-UI"></div>`}
      <div class="fg ${cal ? 'full' : ''}"><label for="mfName">Désignation machine / équipement</label><input class="input" id="mfName" list="mfNames" value="${esc(t.equipName || '')}" placeholder="Unité d’injection"><datalist id="mfNames">${equips.map(x => `<option value="${esc(x.equipName)}">`).join('')}</datalist></div>
      <div class="fg full"><label for="mfRef">Lien avec la machine dans le logiciel</label><select class="select full" id="mfRef"><option value="">— Aucun lien —</option>
        <optgroup label="Articles (machines, moules…)">${cands.filter(c => c.kind === 'i').map(c => `<option value="${c.ref}" ${t.ref === c.ref ? 'selected' : ''}>${esc(c.sub)} › ${esc(c.label)}</option>`).join('')}</optgroup>
        <optgroup label="Catégories et dossiers">${cands.filter(c => c.kind === 'c').map(c => `<option value="${c.ref}" ${t.ref === c.ref ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</optgroup></select>
        <span class="hint">Un clic sur l’équipement dans le planning ouvrira cette page.</span></div>
      ${cal ? `<div class="fg"><label for="mfDev">Dispositif</label><input class="input" id="mfDev" value="${esc(t.device || t.task || '')}" placeholder="Manomètre 1"></div>
        <div class="fg"><label for="mfSer">N° de série</label><input class="input mono" id="mfSer" value="${esc(t.serial || '')}"></div>
        <div class="fg"><label for="mfUnit">Unité</label><input class="input" id="mfUnit" value="${esc(t.unit || '')}" placeholder="bar, T°C…"></div>
        <div class="fg"><label for="mfCert">N° certificat</label><input class="input mono" id="mfCert" value="${esc(t.cert || '')}"></div>`
      : `<div class="fg"><label for="mfComp">Composant</label><input class="input" id="mfComp" value="${esc(t.component || '')}" placeholder="Cylindre, mélangeur…"></div>
        <div class="fg full"><label for="mfTask">Travaux de maintenance</label><textarea class="textarea" id="mfTask" rows="2">${esc(t.task || '')}</textarea></div>`}
      <div class="fg"><label for="mfFreq">Fréquence</label><select class="select" id="mfFreq">${Object.entries(MP_FREQ).filter(([k]) => !cal || k !== 'C').map(([k, f]) => `<option value="${k}" ${t.freq === k ? 'selected' : ''}>${f.label}</option>`).join('')}</select></div>
      <div class="fg"><label for="mfCond">Autres / condition</label><input class="input" id="mfCond" value="${esc(t.condition || '')}" placeholder="Après arrêt > 7 jours, si nécessaire…"></div>
      <div class="fg"><label for="mfLast">Dernière réalisation</label><input class="input" type="date" id="mfLast" value="${esc(t.lastDone || '')}"></div>
      <div class="fg"><label for="mfNext">Prochaine échéance</label><input class="input" type="date" id="mfNext" value="${esc(t.nextDue || '')}"><span class="hint">Laisser vide pour une tâche sur condition.</span></div>
      <div class="fg full"><label class="check"><input type="checkbox" id="mfActive" ${t.active !== false ? 'checked' : ''}>Tâche active (comptée dans les alertes)</label></div>
    </div>
    ${(t.history || []).length ? `<div class="section-title">Historique (${t.history.length})</div><div class="fi-mini">${t.history.map(h => `<div class="fi-mini-row mp-hist"><span class="num"><b>${fmtDate(h.date)}</b></span><span class="muted">${esc(h.by || '')}</span><span class="clip">${h.note ? mentionText(h.note, h.mentions) : '<span class="muted">—</span>'}${h.cert ? ` · <span class="mono">${esc(h.cert)}</span>` : ''}</span>${h.fiId && fiList().some(f => f.id === h.fiId) ? `<button type="button" class="btn btn-sm" data-openfi="${h.fiId}">${ic('wrench')}${esc(h.fiNumber || 'Fiche')}</button>` : '<span></span>'}</div>`).join('')}</div>` : ''}`,
    foot: `${t0 ? `<button class="btn btn-ghost left" id="mfDel" type="button" style="color:var(--bad)">${ic('trash')}Supprimer</button><button class="btn" id="mfDone" type="button">${ic('check')}Marquer réalisée</button>` : ''}<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="mfSave" type="button">${t0 ? 'Enregistrer' : 'Ajouter'}</button>`,
  });
  bindLinkChips(m.el);
  $$('[data-openfi]', m.el).forEach(b => b.addEventListener('click', () => { m.close(); openFicheDetail(b.dataset.openfi); }));
  const fr = $('#mfFreq', m.el); const last = $('#mfLast', m.el); const next = $('#mfNext', m.el);
  const autoNext = () => { if (last.value && fr.value !== 'C') next.value = addPeriod(last.value, fr.value); };
  last.addEventListener('change', autoNext); fr.addEventListener('change', () => { if (fr.value === 'C' && !t0) next.value = ''; else autoNext(); });
  const d = $('#mfDone', m.el); if (d) d.addEventListener('click', () => { m.close(); openMpDone(t.id); });
  const del = $('#mfDel', m.el); if (del) del.addEventListener('click', async () => { if (!(await confirmDialog({ title: 'Supprimer la tâche ?', message: `<b>${esc(t.task)}</b> sera retirée du planning.`, confirmLabel: 'Supprimer' }))) return; Repo.mp.remove(t.id); m.close(); toast('Tâche supprimée', 'ok'); render(); });
  $('#mfSave', m.el).addEventListener('click', () => {
    const val = (s) => { const e = $(s, m.el); return e ? e.value.trim() : ''; };
    Object.assign(t, { equipCode: val('#mfCode'), equipName: val('#mfName'), ref: val('#mfRef'), freq: fr.value, condition: val('#mfCond'), lastDone: last.value, nextDue: next.value, active: $('#mfActive', m.el).checked });
    if (cal) Object.assign(t, { device: val('#mfDev'), task: val('#mfDev'), serial: val('#mfSer'), unit: val('#mfUnit'), cert: val('#mfCert') });
    else Object.assign(t, { component: val('#mfComp'), task: val('#mfTask') });
    if (!t.equipName || !t.task) { toast(cal ? 'Indiquez l’équipement et le dispositif.' : 'Indiquez l’équipement et les travaux.', 'bad'); return; }
    if (t0) Repo.mp.update(t); else Repo.mp.create(t);
    toast(t0 ? 'Tâche enregistrée' : 'Tâche ajoutée au planning', 'ok'); m.close(); render();
  });
}

/* ---------- blocks used elsewhere ---------- */
function mpDashPanel() {
  const due = mpDueList(); const k = mpCounts();
  return `<section class="panel mp-dash ${k.late ? 'late' : ''}"><div class="panel-head"><h2>${ic('calendar')} Maintenance préventive</h2><button class="btn btn-sm btn-ghost" data-go="maintenance" type="button">Planning</button></div>
    ${due.length ? `<div class="table-wrap"><table class="data"><tbody>${due.slice(0, 6).map(t => `<tr data-mpopen="${t.id}"><td class="num" style="white-space:nowrap;width:1%"><b>${fmtDate(t.nextDue)}</b><div style="font-size:12px">${dueText(t)}</div></td><td class="clip"><b style="font-weight:600">${esc(t.task)}</b><div class="muted" style="font-size:12px">${t.kind === 'cal' ? 'Étalonnage · ' : ''}${esc((t.equipCode ? t.equipCode + ' · ' : '') + t.equipName)}</div></td><td class="actions"><button class="btn btn-sm btn-accent" data-mpdone="${t.id}" type="button">${ic('check')}Réalisée</button></td></tr>`).join('')}</tbody></table></div>${due.length > 6 ? `<div class="muted" style="padding:8px 16px;font-size:12.5px">+ ${due.length - 6} autre(s)</div>` : ''}`
    : `<div class="empty"><b>Rien à faire cette semaine</b>Aucune tâche en retard ni due sous ${mpAlertDays()} jours.</div>`}</section>`;
}
function bindMpBlocks(root) {
  $$('[data-mpdone]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const top = Modal.top(); if (top) top.close(); openMpDone(b.dataset.mpdone); }));
  $$('[data-mpopen]', root).forEach(r => r.addEventListener('click', e => { if (e.target.closest('button')) return; const top = Modal.top(); if (top) top.close(); openMpForm(r.dataset.mpopen); }));
}
/** Preventive tasks linked to a ref (item page). */
function mpBlock(ref) {
  const list = mpList().filter(t => t.ref === ref); if (!list.length) return '';
  return `<div class="section-title">Maintenance préventive (${list.length})</div><div class="fi-mini">${list.sort((a, b) => (a.nextDue || '9').localeCompare(b.nextDue || '9')).slice(0, 10).map(t => `<button type="button" class="fi-mini-row" data-mpopen="${t.id}"><span class="num">${t.nextDue ? fmtDate(t.nextDue) : '—'}</span><span class="tag">${MP_FREQ[t.freq] ? MP_FREQ[t.freq].short : ''}</span><span class="clip">${esc(t.task)}</span>${mpStBadge(t)}</button>`).join('')}</div>`;
}

/* ======================= 10d. CHECK-LIST MAINTENANCE MOULE (FQ0.Ps.MNT.05 V1) =======================
   Any fiche whose equipment is a mould (a category under a "Moule" folder, or an item of such a category)
   carries the mould check-list. It must be fully answered (Oui / Non, observation for each Non) to close the fiche.
   The answers stay inside the fiche, so the mould page shows the full history. */
const CL_CODE = 'FQ0.Ps.MNT.05 V1';
const CL_FREQ = ['Après production', 'Annuel'];
const MOULD_CL = ['Nettoyage circuit de matière', 'Nettoyage valve', 'Nettoyage pin valve', 'Nettoyage piston', 'Nettoyage cold runner system of valve', 'Nettoyage pad attache of valve',
  'Nettoyage des surfaces du moule INT/EXT', 'Lubrification colonnes de guidage moule', 'Nettoyage et lubrification du système d’éjection', 'Vérification de l’état de moule (usures…)',
  'Vérification du serrage des boulons de moule (déformation, filetage…)', 'Débouchage et nettoyage circuit d’eau de moule', 'Polissage empreinte moule fixe / mobile', 'Ajustage partie mécanique de moule',
  'Élimination des rouilles des surfaces interne/externe du moule', 'Vérification de l’état de moule complet', 'Inspection visuelle de toutes les parties',
  'Graissage des différentes parties du moule sur toutes les liaisons mécaniques critiques', 'Ajustement de composants (valve, pin…)', 'Vérification d’étanchéité système hydraulique', 'Vérification des résistances de moule'];

const isMouldPath = (c) => !!c && catPath(c).some(x => /moule/i.test(x.name));
/** Mould = a non-folder category in a "Moule" branch. */
const isMouldCat = (c) => !!c && !isFolder(c) && isMouldPath(c) && !(c.parentId && !isFolder(Repo.categories.get(c.parentId)));
const mouldCats = () => itemCats().filter(isMouldCat);
/** The check-list applies only when the mould itself (a mould category) is chosen as equipment — not a part of it. */
function isMouldRelated(ref) { return !!ref && ref[0] === 'c' && isMouldCat(Repo.categories.get(ref.slice(2))); }
const mouldFromRef = (ref) => isMouldRelated(ref) ? ref : '';
const newChecklist = (mouldRef = '', freq = CL_FREQ[0]) => ({ code: CL_CODE, mouldRef, freq, items: MOULD_CL.map(label => ({ label, ans: '', obs: '' })), visa: false, visaBy: '' });
const clAnswered = (cl) => cl.items.filter(i => i.ans).length;
const clNon = (cl) => cl.items.filter(i => i.ans === 'non');
/** Adds / removes the check-list when the fiche's equipment changes. */
function clSync(f) {
  const related = (f.equipment || []).some(isMouldRelated); const mould = (f.equipment || []).map(mouldFromRef).find(Boolean) || '';
  if (related && !f.checklist) f.checklist = newChecklist(mould);
  else if (!related && f.checklist && !clAnswered(f.checklist)) delete f.checklist;
  if (f.checklist && !f.checklist.mouldRef && mould) f.checklist.mouldRef = mould;
}
/** Problems that block closing the fiche ('' when the check-list is complete). */
function clProblem(cl) {
  if (!cl) return '';
  if (!cl.mouldRef) return 'Check-list moule : choisissez le moule.';
  const miss = cl.items.filter(i => !i.ans).length; if (miss) return `Check-list moule incomplète : ${miss} ligne${miss > 1 ? 's' : ''} sans réponse Oui / Non.`;
  const noObs = clNon(cl).filter(i => !(i.obs || '').trim()).length; if (noObs) return `Check-list moule : ajoutez une observation pour ${noObs > 1 ? 'les ' + noObs + ' lignes' : 'la ligne'} « Non ».`;
  return '';
}
function clBadge(f) {
  const cl = f.checklist; if (!cl) return '';
  const n = clAnswered(cl), t = cl.items.length, non = clNon(cl).length;
  return ` <span class="badge ${n < t ? 'b-low' : non ? 'b-out' : 'b-ok'}" title="Check-list maintenance moule">Check-list ${n}/${t}${non ? ` · ${non} non` : ''}</span>`;
}

/* ---------- form section (inside the fiche form) ---------- */
function renderChecklist(f, box) {
  if (!box) return; clSync(f); const cl = f.checklist;
  if (!cl) { box.innerHTML = ''; return; }
  const moulds = mouldCats();
  box.innerHTML = `<div class="fi-sec cl-sec"><div class="fi-sec-h cl-h"><span>${ic('check')} Check-list maintenance moule <span class="muted mono" style="font-weight:500">${CL_CODE}</span></span><span class="badge" id="clCount"></span></div>
    <div class="cl-top">
      <div class="fg"><label for="clMould">Moule</label><select class="select" id="clMould"><option value="">— Choisir le moule —</option>${moulds.map(c => `<option value="c:${c.id}" ${cl.mouldRef === 'c:' + c.id ? 'selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select></div>
      <div class="fg"><label>Fréquence</label><div class="fi-radios row">${CL_FREQ.map(x => `<label class="check"><input type="radio" name="clFreq" value="${esc(x)}" ${cl.freq === x ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div></div>
      <div class="fg" style="align-self:end;justify-self:end"><button class="btn btn-sm" type="button" id="clAllYes">${ic('check')}Tout « Oui »</button></div>
    </div>
    <div class="table-wrap"><table class="data cl-table"><thead><tr><th>Intervention</th><th class="c">Oui</th><th class="c">Non</th><th>Observations</th></tr></thead><tbody>
      ${cl.items.map((it, k) => `<tr class="cl-row ${it.ans}" data-k="${k}"><td>${esc(it.label)}</td>
        <td class="c"><label class="cl-pick yes"><input type="radio" name="cl_${k}" value="oui" ${it.ans === 'oui' ? 'checked' : ''} aria-label="Oui"><span>✓</span></label></td>
        <td class="c"><label class="cl-pick no"><input type="radio" name="cl_${k}" value="non" ${it.ans === 'non' ? 'checked' : ''} aria-label="Non"><span>✗</span></label></td>
        <td><input class="input cl-obs" data-obs="${k}" value="${esc(it.obs || '')}" placeholder="${it.ans === 'non' ? 'Observation obligatoire' : ''}"></td></tr>`).join('')}
    </tbody></table></div>
    <div class="cl-foot"><label class="check"><input type="checkbox" id="clVisa" ${cl.visa ? 'checked' : ''}>Visa responsable maintenance</label><input class="input" id="clVisaBy" value="${esc(cl.visaBy || '')}" placeholder="Nom du responsable" style="max-width:260px"><span class="muted" style="font-size:12px">Obligatoire pour clôturer la fiche : toutes les lignes cochées, et une observation pour chaque « Non ».</span></div>
  </div>`;
  hydrateIcons(box);
  const count = () => { const n = clAnswered(cl), non = clNon(cl).length; const b = $('#clCount', box); b.textContent = `${n}/${cl.items.length}${non ? ` · ${non} non` : ''}`; b.className = 'badge ' + (n < cl.items.length ? 'b-low' : non ? 'b-out' : 'b-ok'); };
  $('#clMould', box).addEventListener('change', e => { cl.mouldRef = e.target.value; });
  $$('[name=clFreq]', box).forEach(r => r.addEventListener('change', () => { cl.freq = r.value; }));
  $$('.cl-row', box).forEach(tr => { const k = +tr.dataset.k; $$('input[type=radio]', tr).forEach(r => r.addEventListener('change', () => { cl.items[k].ans = r.value; tr.className = 'cl-row ' + r.value; $('.cl-obs', tr).placeholder = r.value === 'non' ? 'Observation obligatoire' : ''; count(); })); });
  $$('[data-obs]', box).forEach(i => i.addEventListener('input', () => { cl.items[+i.dataset.obs].obs = i.value; }));
  $('#clAllYes', box).addEventListener('click', () => { cl.items.forEach(i => { if (!i.ans) i.ans = 'oui'; }); renderChecklist(f, box); });
  $('#clVisa', box).addEventListener('change', e => { cl.visa = e.target.checked; });
  $('#clVisaBy', box).addEventListener('input', e => { cl.visaBy = e.target.value; });
  count();
}

/* ---------- paper view (fiche detail) ---------- */
function clPaperHtml(f) {
  const cl = f.checklist; if (!cl) return '';
  const mould = cl.mouldRef ? linkChips([cl.mouldRef]) : '<span class="muted">—</span>';
  const box = (b) => `<span class="fi-box ${b ? 'on' : ''}">${b ? '✓' : ''}</span>`;
  return `<div class="fi-row cl-paper"><div><h4>Check-list maintenance moule · ${CL_CODE}</h4>
    <div class="cl-ph"><span>Date : <b>${fmtDate(f.date)}</b></span><span>Moule : ${mould}</span><span>Fréquence : ${CL_FREQ.map(x => `${box(cl.freq === x)} ${esc(x)}`).join(' &nbsp; ')}</span></div>
    <table class="data cl-table"><thead><tr><th>Intervention</th><th class="c">Oui</th><th class="c">Non</th><th>Observations</th></tr></thead><tbody>
      ${cl.items.map(i => `<tr class="cl-row ${i.ans}" style="cursor:default"><td>${esc(i.label)}</td><td class="c">${i.ans === 'oui' ? '<b class="cl-y">✓</b>' : ''}</td><td class="c">${i.ans === 'non' ? '<b class="cl-n">✗</b>' : ''}</td><td>${esc(i.obs || '')}</td></tr>`).join('')}
    </tbody></table>
    <p style="margin:8px 0 0">${box(cl.visa)} Visa responsable maintenance ${cl.visaBy ? '· <b>' + esc(cl.visaBy) + '</b>' : ''}</p></div></div>`;
}

/* ---------- mould page: history + quick start ---------- */
const mouldFiches = (catId) => fiList().filter(f => f.checklist && f.checklist.mouldRef === 'c:' + catId).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));
/* ---------- Fiche de vie du moule (identification, caractéristiques, consommables, photos) ---------- */
const FV_FIELDS = [['code', 'Code interne'], ['designation', 'Désignation'], ['type', 'Type'], ['serie', 'N° de série'], ['dateEntree', 'Entrée en exploitation'], ['fournisseur', 'Fournisseur'],
  ['hauteur', 'Hauteur'], ['epaisseur', 'Épaisseur'], ['longueur', 'Longueur'], ['largeur', 'Largeur'], ['accessoire', 'Accessoire'], ['empreintes', 'Nombre d’empreintes'], ['gravure', 'Gravure'], ['poids', 'Poids'], ['canaux', 'Canaux']];
function mouldFicheHtml(cat) {
  const f = cat.fiche || {};
  const has = FV_FIELDS.some(([k]) => f[k]) || cat.image || f.photoProduit;
  const cell = (k, l) => f[k] ? `<div class="fv-f"><span>${l}</span><b>${esc(f[k])}</b></div>` : '';
  const photo = (src, l) => src ? `<figure class="fv-ph" data-fvimg="${l}"><img src="${src}" alt=""><figcaption>${l}</figcaption></figure>` : '';
  return `<section class="panel fv" style="margin-bottom:18px"><div class="panel-head"><h2>${ic('layers')} Fiche de vie du moule</h2>
    <button class="btn btn-sm" type="button" id="fvEdit">${ic('edit')}${has ? 'Modifier' : 'Remplir la fiche'}</button></div>
    ${has ? `<div class="fv-body"><div class="fv-photos">${photo(cat.image, 'Moule')}${photo(f.photoProduit, 'Produit fini')}</div>
      <div class="fv-info"><h3>Identification</h3><div class="fv-grid">${FV_FIELDS.slice(0, 6).map(([k, l]) => cell(k, l)).join('')}</div>
      <h3>Caractéristiques techniques</h3><div class="fv-grid">${FV_FIELDS.slice(6).map(([k, l]) => cell(k, l)).join('')}</div>
      ${(f.consommables || []).length ? `<h3>Consommables</h3><div class="fv-tags">${f.consommables.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
      ${(f.historique || []).length ? `<h3>Suivi des travaux (fiche papier)</h3><div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Travaux / nettoyage</th><th>Consommation</th></tr></thead><tbody>${f.historique.map(([d, t, c]) => `<tr><td class="num" style="white-space:nowrap">${esc(fmtDate(d))}</td><td>${esc(t)}</td><td>${esc(c || '—')}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></div>`
      : `<div class="empty"><b>Fiche de vie vide</b>Ajoutez le n° de série, le fournisseur, les dimensions et les photos du moule.</div>`}</section>`;
}
function bindMouldFiche(root, cat) {
  $$('[data-fvimg] img', root).forEach(i => i.addEventListener('click', () => lightbox(i.src)));
  const b = $('#fvEdit', root); if (b) b.addEventListener('click', () => openMouldFicheForm(cat.id));
}
function openMouldFicheForm(catId) {
  const cat = Repo.categories.get(catId); const f = Object.assign({}, cat.fiche || {}); const img = { moule: cat.image || '', produit: f.photoProduit || '' };
  const m = Modal.open({ title: 'Fiche de vie du moule', sub: esc(cat.name), size: 'wide',
    body: `<div class="form-grid">${FV_FIELDS.map(([k, l]) => `<div class="fg"><label for="fv_${k}">${l}</label><input class="input" id="fv_${k}" value="${esc(f[k] || '')}"></div>`).join('')}
      <div class="fg full"><label for="fv_cons">Consommables (séparés par des virgules)</label><input class="input" id="fv_cons" value="${esc((f.consommables || []).join(', '))}"></div>
      ${['moule', 'produit'].map(k => `<div class="fg"><label>Photo ${k === 'moule' ? 'du moule' : 'du produit fini'}</label><div class="fv-pick" data-fvp="${k}"><div class="preview">${img[k] ? `<img src="${img[k]}" alt="">` : icon('image')}</div><button class="btn btn-sm" type="button">${ic('upload')}Choisir</button></div></div>`).join('')}</div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="fvSave" type="button">Enregistrer</button>` });
  $$('[data-fvp]', m.el).forEach(box => $('button', box).addEventListener('click', async () => { const src = await ImageTools.pick(); if (src) { img[box.dataset.fvp] = src; $('.preview', box).innerHTML = `<img src="${src}" alt="">`; } }));
  $('#fvSave', m.el).addEventListener('click', () => {
    const nf = {}; FV_FIELDS.forEach(([k]) => { const v = $('#fv_' + k, m.el).value.trim(); if (v) nf[k] = v; });
    nf.consommables = $('#fv_cons', m.el).value.split(',').map(x => x.trim()).filter(Boolean); if (img.produit) nf.photoProduit = img.produit; if ((cat.fiche || {}).historique) nf.historique = cat.fiche.historique;
    Repo.categories.update(cat.id, { fiche: nf, image: img.moule || cat.image || '' }); m.close(); toast('Fiche de vie enregistrée', 'ok'); render();
  });
}
function mouldHistoryHtml(cat) {
  const list = mouldFiches(cat.id); const last = list.find(f => f.status === 'closed');
  const ago = last ? Math.round((parseYmd(todayYmd()) - parseYmd(last.date)) / 86400000) : null;
  return `<section class="panel cl-hist" style="margin-bottom:18px"><div class="panel-head"><h2>${ic('wrench')} Historique maintenance moule</h2>
    <span class="count-note">${last ? `Dernière maintenance : <b>${fmtDate(last.date)}</b> (${ago === 0 ? 'aujourd’hui' : `il y a ${ago} j`}) · ` : 'Aucune maintenance enregistrée · '}${list.length} fiche${list.length > 1 ? 's' : ''}</span>
    <button class="btn btn-sm btn-accent" type="button" data-clnew="${cat.id}">${ic('check')}Nouvelle maintenance (check-list)</button></div>
    ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Fiche</th><th>Fréquence</th><th>Check-list</th><th>Points « Non »</th><th>Visa</th><th>Statut</th></tr></thead><tbody>
      ${list.map(f => { const cl = f.checklist; const non = clNon(cl); return `<tr data-fi="${f.id}"><td class="num" style="white-space:nowrap"><b>${fmtDate(f.date)}</b></td><td><span class="ref">${esc(f.number)}</span></td><td><span class="tag">${esc(cl.freq || '')}</span></td><td>${clBadge(f)}</td><td class="clip" style="max-width:240px;white-space:normal">${non.length ? non.map(i => `<div><b>${esc(i.label)}</b>${i.obs ? ` <span class="muted">— ${esc(i.obs)}</span>` : ''}</div>`).join('') : '<span class="muted">—</span>'}</td><td>${cl.visa ? `<span class="badge b-ok">✓ ${esc(cl.visaBy || 'Visé')}</span>` : '<span class="muted">—</span>'}</td><td><span class="badge ${FI_STATUS[f.status || 'open'].cls}">${FI_STATUS[f.status || 'open'].label}</span></td></tr>`; }).join('')}
    </tbody></table></div>` : `<div class="empty"><b>Pas encore d’historique</b>Chaque intervention sur ce moule passe par la check-list ; elle apparaîtra ici.</div>`}</section>`;
}
function bindMouldHistory(root) {
  $$('[data-clnew]', root).forEach(b => b.addEventListener('click', () => openFicheForm(null, { equipment: ['c:' + b.dataset.clnew], type: 'MP', status: 'progress', natures: ['Mécanique'], description: 'Maintenance moule — check-list' })));
  $$('tr[data-fi]', root).forEach(r => r.addEventListener('click', () => openFicheDetail(r.dataset.fi)));
}

/** Value of a (possibly shared) article for a column of the category being displayed. */
function sharedVal(item, col, cat) {
  if (item.categoryId === cat.id) return item.values[col.id];
  const src = catOf(item); if (!src) return undefined;
  let sc = col.role ? roleCol(src, col.role) : null;
  if (!sc) sc = src.columns.find(x => normName(x.name) === normName(col.name));
  if (!sc && ['image', 'link'].includes(col.type)) sc = src.columns.find(x => x.type === col.type);
  return sc ? item.values[sc.id] : undefined;
}
/** Links articles to another category ("En commun avec"): they stay where they are, are listed there too, and their stock is counted once. */
function linkItemsTo(ids, ref) {
  let n = 0;
  ids.forEach(id => {
    const it = Repo.items.get(id); const c = it && catOf(it); if (!c || ref === 'c:' + c.id) return;
    let lc = c.columns.find(x => x.type === 'link');
    if (!lc) { lc = { id: uid('f'), name: 'En commun avec', type: 'link', required: false, default: '', options: [], role: '', unit: '' }; const li = c.columns.findIndex(x => x.role === 'location'); c.columns.splice(li >= 0 ? li + 1 : c.columns.length, 0, lc); }
    const cur = Array.isArray(it.values[lc.id]) ? it.values[lc.id] : [];
    if (!cur.includes(ref)) { it.values[lc.id] = [...cur, ref]; it.updatedAt = new Date().toISOString(); n++; }
  });
  if (n) Repo.commit();
  return n;
}
function openLinkDialog(ids, fromCatId, onDone) {
  const targets = itemCats().filter(c => c.id !== fromCatId);
  const m = Modal.open({ title: `Mettre en commun ${ids.length} article${ids.length > 1 ? 's' : ''}`, sub: 'Les articles restent à leur place et apparaissent aussi dans la catégorie choisie. Le stock est compté une seule fois.', size: 'narrow',
    body: `<div class="fg"><label for="lkTarget">En commun avec</label><select class="select full" id="lkTarget">${targets.map(c => `<option value="c:${c.id}">${esc(catLabel(c))}</option>`).join('')}</select></div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="lkGo" type="button">↔ Mettre en commun</button>` });
  $('#lkGo', m.el).addEventListener('click', () => { const ref = $('#lkTarget', m.el).value; const n = linkItemsTo(ids, ref); m.close(); onDone && onDone(); const t = refLabel(ref); toast(n ? `${n} article${n > 1 ? 's' : ''} en commun avec ${t ? t.name : ''}` : 'Déjà en commun', 'ok'); render(); });
}

/* ======================= 10e. DÉPLACER DES ARTICLES =======================
   Moves articles to another category (or to a new sub-category). Values follow by column role, then by column
   name; a column the target lacks is added to it, so nothing is lost. */
const normName = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function planMove(ids, target) {
  const add = []; const map = new Map(); // srcCatId -> {srcColId: targetColId}
  ids.map(id => Repo.items.get(id)).filter(Boolean).forEach(it => {
    const src = catOf(it); if (!src || map.has(src.id)) return; const m = {};
    src.columns.forEach(sc => {
      let tc = sc.role ? target.columns.find(x => x.role === sc.role) : null;
      if (!tc) tc = target.columns.find(x => normName(x.name) === normName(sc.name) && (x.type === sc.type || (['number', 'quantity'].includes(x.type) && ['number', 'quantity'].includes(sc.type)) || (['text', 'longtext', 'reference', 'dropdown'].includes(x.type) && ['text', 'longtext', 'reference', 'dropdown'].includes(sc.type))));
      if (!tc && ['image', 'link'].includes(sc.type)) tc = target.columns.find(x => x.type === sc.type);
      if (!tc) tc = add.find(a => normName(a.name) === normName(sc.name) && a.type === sc.type);
      if (!tc) { const used = ids.some(id => { const i = Repo.items.get(id); return i && i.categoryId === src.id && ![undefined, null, ''].includes(i.values[sc.id]) && !(Array.isArray(i.values[sc.id]) && !i.values[sc.id].length); }); if (!used) return;
        tc = Object.assign(clone(sc), { id: uid('f'), role: sc.role && !target.columns.some(x => x.role === sc.role) ? sc.role : '' }); add.push(tc); }
      m[sc.id] = tc.id;
    });
    map.set(src.id, m);
  });
  return { add, map };
}
function moveItems(ids, targetId) {
  const target = Repo.categories.get(targetId); if (!target) return 0;
  const { add, map } = planMove(ids, target);
  add.forEach(c => target.columns.push(c));
  let n = 0; const now = new Date().toISOString();
  ids.forEach(id => {
    const it = Repo.items.get(id); if (!it || it.categoryId === targetId) return; const m = map.get(it.categoryId) || {};
    const v = {}; Object.entries(m).forEach(([s, t]) => { const tc = target.columns.find(x => x.id === t); if (it.values[s] !== undefined && tc) v[t] = castValue(tc, it.values[s]); });
    it.values = v; it.categoryId = targetId; it.updatedAt = now; n++;
    Repo.journal.list().forEach(mv => { if (mv.itemId === id) { mv.categoryId = targetId; mv.categoryName = target.name; } });
  });
  if (n) Repo.commit();
  return n;
}
function openMoveDialog(ids, fromCatId, onDone) {
  const from = Repo.categories.get(fromCatId); const targets = itemCats().filter(c => c.id !== fromCatId);
  const parents = [from, ...Repo.categories.list().filter(c => c.id !== fromCatId)].filter(Boolean);
  const m = Modal.open({
    title: `Déplacer ${ids.length} article${ids.length > 1 ? 's' : ''}`, sub: from ? `Depuis ${esc(catLabel(from))}` : '', size: 'narrow',
    body: `<div class="mv-opts">
      <label class="mv-opt"><input type="radio" name="mvMode" value="exist" ${targets.length ? 'checked' : 'disabled'}><span><b>Dans une catégorie existante</b></span></label>
      <select class="select full" id="mvTarget" ${targets.length ? '' : 'disabled'}>${targets.map(c => `<option value="${c.id}">${esc(catLabel(c))}</option>`).join('')}</select>
      <label class="mv-opt"><input type="radio" name="mvMode" value="new" ${targets.length ? '' : 'checked'}><span><b>Dans un nouveau sous-dossier</b><span class="muted">mêmes colonnes que ${esc(from ? from.name : '')}</span></span></label>
      <div class="mv-new"><input class="input" id="mvName" placeholder="Nom (ex. Joints, Résistances…)"><select class="select full" id="mvParent">${parents.map(c => `<option value="${c.id}">Dans : ${esc(catLabel(c))}</option>`).join('')}</select></div>
      <div class="mv-note muted" id="mvNote"></div></div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="mvGo" type="button">${ic('folder')}Déplacer</button>`,
  });
  const mode = () => ($('[name=mvMode]:checked', m.el) || {}).value;
  const note = () => {
    const el = $('#mvNote', m.el);
    if (mode() === 'exist') { const t = Repo.categories.get($('#mvTarget', m.el).value); const { add } = t ? planMove(ids, t) : { add: [] }; el.textContent = add.length ? `Colonnes ajoutées à « ${t.name} » pour ne rien perdre : ${add.map(c => c.name).join(', ')}.` : 'Toutes les informations ont une colonne correspondante.'; }
    else el.textContent = 'Le sous-dossier est créé avec les colonnes de la catégorie actuelle.';
  };
  $$('[name=mvMode]', m.el).forEach(r => r.addEventListener('change', note)); $('#mvTarget', m.el).addEventListener('change', () => { $('[value=exist]', m.el).checked = true; note(); });
  $('#mvName', m.el).addEventListener('focus', () => { $('[value=new]', m.el).checked = true; note(); });
  note();
  $('#mvGo', m.el).addEventListener('click', () => {
    let targetId = $('#mvTarget', m.el).value;
    if (mode() === 'new') {
      const name = $('#mvName', m.el).value.trim(); if (!name) { toast('Donnez un nom au sous-dossier.', 'bad'); $('#mvName', m.el).focus(); return; }
      const parentId = $('#mvParent', m.el).value; const tpl = from || Repo.categories.get(Repo.items.get(ids[0]).categoryId);
      const cols = tpl.columns.map(c => Object.assign(clone(c), { id: uid('f') }));
      const nc = Repo.categories.create({ kind: 'items', parentId, name, color: (Repo.categories.get(parentId) || {}).color || PALETTE[Repo.categories.list().length % PALETTE.length], columns: cols, description: '' });
      // map by position: same column structure
      targetId = nc.id;
    }
    const target = Repo.categories.get(targetId);
    const n = moveItems(ids, targetId); m.close(); onDone && onDone();
    toast(`${n} article${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''} vers ${target.name}`, 'ok'); render();
  });
}

/* ======================= 11. FORMS ======================= */
/* ---------- Category form ---------- */
const CATEGORY_TEMPLATES = {
  stock: { label: 'Articles stockés', hint: 'Référence, désignation, quantité, min, max, emplacement, image, notes', cols: () => [
    { name: 'Référence', type: 'reference', role: 'reference', required: true }, { name: 'Désignation', type: 'text', role: 'name', required: true },
    { name: 'Quantité', type: 'quantity', role: 'quantity', required: true, default: 0, unit: 'pcs' }, { name: 'Stock min', type: 'number', role: 'min', unit: 'pcs' },
    { name: 'Stock max', type: 'number', role: 'max', unit: 'pcs' }, { name: 'Emplacement', type: 'text', role: 'location' }, { name: 'En commun avec', type: 'link' }, { name: 'Image', type: 'image' }, { name: 'Notes', type: 'longtext' }] },
  equipment: { label: 'Équipements', hint: 'Référence, désignation, fabricant, modèle, n° de série, statut, emplacement, image', cols: () => [
    { name: 'Référence', type: 'reference', role: 'reference', required: true }, { name: 'Désignation', type: 'text', role: 'name', required: true },
    { name: 'Fabricant', type: 'text' }, { name: 'Modèle', type: 'text' }, { name: 'N° de série', type: 'text' },
    { name: 'Statut', type: 'dropdown', options: ['En service', 'En maintenance', 'Hors service'], default: 'En service' }, { name: 'Emplacement', type: 'text', role: 'location' }, { name: 'Image', type: 'image' }] },
  blank: { label: 'Vide', hint: 'Référence et désignation seulement, vous ajoutez le reste', cols: () => [
    { name: 'Référence', type: 'reference', role: 'reference', required: true }, { name: 'Désignation', type: 'text', role: 'name', required: true }] },
};
function openCategoryForm(catId, opts = {}) {
  const c = catId ? Repo.categories.get(catId) : null; let kind = c ? (c.kind || 'items') : (opts.kind || 'items');
  let color = c ? c.color : (opts.parentId && Repo.categories.get(opts.parentId) ? Repo.categories.get(opts.parentId).color : PALETTE[Repo.categories.list().length % PALETTE.length]); let tpl = 'stock';
  const blocked = c ? new Set([c.id, ...descendants(c.id).map(x => x.id)]) : new Set();
  const parentOpts = folders().filter(f => !blocked.has(f.id)).sort((a, b) => catLabel(a).localeCompare(catLabel(b), 'fr'));
  const curParent = c ? (c.parentId || '') : (opts.parentId || '');
  const noun = () => kind === 'folder' ? 'le dossier' : 'la catégorie';
  const m = Modal.open({
    title: c ? (kind === 'folder' ? 'Modifier le dossier' : 'Modifier la catégorie') : 'Nouveau', sub: c ? esc(catLabel(c)) : 'Il apparaîtra dans l’arborescence de la barre latérale.',
    body: `<div class="form-grid">
      ${c ? '' : `<div class="fg full"><label>Type</label><div class="seg" id="cKind"><button type="button" data-k="items" class="${kind === 'items' ? 'on' : ''}" style="padding:8px 14px;gap:6px;display:flex;font-weight:600">${ic('table')}Catégorie d'articles</button><button type="button" data-k="folder" class="${kind === 'folder' ? 'on' : ''}" style="padding:8px 14px;gap:6px;display:flex;font-weight:600">${ic('folder')}Dossier</button></div><span class="hint" id="cKindHint"></span></div>`}
      <div class="fg full"><label for="cName">Nom<span class="req">*</span></label><input class="input" id="cName" value="${esc(c ? c.name : '')}" placeholder="Ex. Composants hydrauliques"></div>
      <div class="fg full"><label for="cParent">Emplacement dans l’arborescence</label><select class="select full" id="cParent"><option value="">Racine (espace principal)</option>${parentOpts.map(f => `<option value="${f.id}" ${f.id === curParent ? 'selected' : ''}>${esc(catLabel(f))}</option>`).join('')}</select></div>
      <div class="fg"><label for="cCode">Code court</label><input class="input mono" id="cCode" maxlength="4" value="${esc(c ? c.code : '')}" placeholder="HYD"><span class="hint">Affiché quand un article n'a pas d'image.</span></div>
      <div class="fg"><label>Couleur</label><div id="cColors" style="display:flex;flex-wrap:wrap;gap:6px">${PALETTE.map(p => `<button type="button" data-c="${p}" aria-label="Couleur ${p}" style="width:26px;height:26px;border-radius:6px;border:2px solid ${p === color ? 'var(--ink)' : 'transparent'};background:${p};cursor:pointer"></button>`).join('')}</div></div>
      <div class="fg full"><label for="cDesc">Description</label><input class="input" id="cDesc" value="${esc(c ? c.description : '')}" placeholder="Facultatif"></div>
      <div class="fg full"><label>Photo de couverture</label><div class="img-field" id="cImg"><div class="preview" style="width:150px;height:90px">${c && c.image ? `<img src="${c.image}" alt="">` : ic('image')}</div><div><div class="btns"><button class="btn btn-sm" id="cImgPick" type="button">${ic('upload')}${c && c.image ? 'Remplacer' : 'Choisir une photo'}</button><button class="btn btn-sm btn-ghost" id="cImgRm" type="button" ${c && c.image ? '' : 'hidden'}>${ic('trash')}Retirer</button></div><span class="hint">Affichée sur la carte, par exemple la photo du moule ou de la machine.</span></div></div></div>
      ${c ? '' : `<div class="fg full" id="cTplWrap"><label>Colonnes de départ</label><div style="display:grid;gap:8px">${Object.entries(CATEGORY_TEMPLATES).map(([k, t]) => `<label class="check" style="align-items:flex-start;border:1px solid var(--line);border-radius:8px;padding:10px 12px"><input type="radio" name="tpl" value="${k}" ${k === tpl ? 'checked' : ''} style="margin-top:3px"><span><b>${t.label}</b><br><span class="muted" style="font-weight:400;font-size:12.5px">${t.hint}</span></span></label>`).join('')}</div><span class="hint">Vous pourrez ajouter, renommer ou supprimer chaque colonne ensuite.</span></div>`}
    </div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="cSave" type="button">${c ? 'Enregistrer' : 'Créer'}</button>`,
  });
  const syncKind = () => {
    $$('#cKind [data-k]', m.el).forEach(b => b.classList.toggle('on', b.dataset.k === kind));
    const tw = $('#cTplWrap', m.el); if (tw) tw.hidden = kind === 'folder';
    const h = $('#cKindHint', m.el); if (h) h.textContent = kind === 'folder' ? 'Un dossier regroupe des catégories (ex. Machines → Presses, Pièces de rechange).' : 'Une catégorie contient des articles avec ses propres colonnes.';
    $('#cName', m.el).placeholder = kind === 'folder' ? 'Ex. Machines, Produits, Maintenance' : 'Ex. Composants hydrauliques';
    const sv = $('#cSave', m.el); if (!c) sv.textContent = kind === 'folder' ? 'Créer le dossier' : 'Créer la catégorie';
  };
  $$('#cKind [data-k]', m.el).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; syncKind(); }));
  $$('#cColors [data-c]', m.el).forEach(b => b.addEventListener('click', () => { color = b.dataset.c; $$('#cColors [data-c]', m.el).forEach(x => x.style.borderColor = x === b ? 'var(--ink)' : 'transparent'); }));
  $$('[name=tpl]', m.el).forEach(r => r.addEventListener('change', () => tpl = r.value));
  let image = c ? (c.image || '') : '';
  const setImg = (src) => { image = src || ''; $('#cImg .preview', m.el).innerHTML = image ? `<img src="${image}" alt="">` : icon('image'); $('#cImgRm', m.el).hidden = !image; $('#cImgPick', m.el).lastChild.textContent = image ? 'Remplacer' : 'Choisir une photo'; };
  $('#cImgPick', m.el).addEventListener('click', async () => { const src = await ImageTools.pick(700, 0.75); if (src) setImg(src); });
  $('#cImgRm', m.el).addEventListener('click', () => setImg(''));
  syncKind();
  const save = () => {
    const name = $('#cName', m.el).value.trim(); if (!name) { $('#cName', m.el).closest('.fg').classList.add('invalid'); $('#cName', m.el).focus(); return; }
    const parentId = $('#cParent', m.el).value || null;
    if (Repo.categories.children(parentId).some(x => x.name.toLowerCase() === name.toLowerCase() && x !== c)) { toast(`Ce nom existe déjà à cet endroit de l’arborescence.`, 'bad'); return; }
    const code = ($('#cCode', m.el).value.trim() || initials(name)).toUpperCase().slice(0, 4); const description = $('#cDesc', m.el).value.trim();
    if (parentId) { state.open = state.open || new Set(); state.open.add(parentId); saveOpen(); }
    if (c) { Repo.categories.update(c.id, { name, code, color, description, parentId, image }); toast(`${kind === 'folder' ? 'Dossier' : 'Catégorie'} mis à jour`, 'ok'); m.close(); render(); }
    else {
      const cols = kind === 'folder' ? [] : CATEGORY_TEMPLATES[tpl].cols().map(x => Object.assign({ id: uid('f'), required: false, default: '', options: [], role: '', unit: '' }, x));
      const nc = Repo.categories.create({ kind, parentId, name, code, color, description, columns: cols }); if (image) Repo.categories.update(nc.id, { image });
      if (kind === 'folder') { state.open = state.open || new Set(); state.open.add(nc.id); saveOpen(); }
      toast(`${kind === 'folder' ? 'Dossier' : 'Catégorie'} « ${name} » créé${kind === 'folder' ? '' : 'e'}`, 'ok'); m.close(); go('category', nc.id);
    }
  };
  $('#cSave', m.el).addEventListener('click', save);
  $('#cName', m.el).addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
}

/* ---------- Columns manager ---------- */
function openColumnsManager(catId) {
  const m = Modal.open({ title: 'Colonnes de la catégorie', sub: esc(Repo.categories.get(catId).name), size: 'wide', body: '<div id="colMgr"></div>',
    foot: `<button class="btn left" id="cmAdd" type="button">${ic('plus')}Ajouter une colonne</button><button class="btn btn-dark" data-close type="button">Terminé</button>` });
  const draw = () => {
    const cat = Repo.categories.get(catId);
    $('#colMgr', m.el).innerHTML = `<p class="muted" style="margin:0 0 12px;font-size:13px">L'ordre ci-dessous est celui du tableau et du formulaire. Le <b>rôle</b> relie une colonne au module Stock (quantité, minimum, emplacement…).</p>
      <div class="col-list">${cat.columns.map((c, i) => `<div class="col-row"><span class="pos">${i + 1}</span><span class="nm">${esc(c.name)}${c.required ? ' <span style="color:var(--bad)">*</span>' : ''}<small>${c.default !== '' && c.default !== undefined && c.type !== 'image' ? 'Défaut : ' + esc(c.type === 'checkbox' ? (c.default ? 'coché' : 'non coché') : c.default) : c.type === 'dropdown' ? esc((c.options || []).join(', ')) : '&nbsp;'}</small></span>
        <span class="c-type"><span class="type-pill">${esc(FIELD_TYPES[c.type])}${c.unit ? ' · ' + esc(c.unit) : ''}</span></span>
        <span class="c-meta">${c.role ? `<span class="role-pill">${esc(ROLES[c.role])}</span>` : (roleCol(cat, 'reference') === c ? '<span class="role-pill">Référence article</span>' : roleCol(cat, 'quantity') === c ? '<span class="role-pill">Quantité en stock</span>' : '')}</span>
        <span class="btns"><button class="icon-btn small" data-up="${c.id}" ${i === 0 ? 'disabled' : ''} type="button" aria-label="Monter">${ic('up')}</button><button class="icon-btn small" data-down="${c.id}" ${i === cat.columns.length - 1 ? 'disabled' : ''} type="button" aria-label="Descendre">${ic('down')}</button><button class="icon-btn small" data-edit="${c.id}" type="button" aria-label="Modifier">${ic('edit')}</button><button class="icon-btn small" data-del="${c.id}" type="button" aria-label="Supprimer">${ic('trash')}</button></span></div>`).join('') || '<div class="empty">Aucune colonne.</div>'}</div>`;
    hydrateIcons(m.el);
    $$('[data-up]', m.el).forEach(b => b.addEventListener('click', () => { Repo.columns.move(catId, b.dataset.up, -1); draw(); render(); }));
    $$('[data-down]', m.el).forEach(b => b.addEventListener('click', () => { Repo.columns.move(catId, b.dataset.down, 1); draw(); render(); }));
    $$('[data-edit]', m.el).forEach(b => b.addEventListener('click', () => openColumnForm(catId, b.dataset.edit, draw)));
    $$('[data-del]', m.el).forEach(b => b.addEventListener('click', () => deleteColumn(catId, b.dataset.del, draw)));
  };
  $('#cmAdd', m.el).addEventListener('click', () => openColumnForm(catId, null, draw));
  draw();
}
async function deleteColumn(catId, colId, after) {
  const cat = Repo.categories.get(catId); const col = cat.columns.find(c => c.id === colId);
  const isQty = roleCol(cat, 'quantity') === col;
  const ok = await confirmDialog({ title: 'Supprimer la colonne ?', message: `La colonne <b>${esc(col.name)}</b> et ses valeurs dans ${Repo.items.byCategory(catId).length} article(s) seront supprimées.${isQty ? '<br><br><b>Attention :</b> c\'est la colonne de quantité, cette catégorie ne sera plus suivie dans le stock.' : ''}`, confirmLabel: 'Supprimer' });
  if (!ok) return; Repo.columns.remove(catId, colId); toast(`Colonne « ${col.name} » supprimée`, 'ok'); after && after(); render();
}

/* ---------- Column form ---------- */
function openColumnForm(catId, colId, after) {
  const cat = Repo.categories.get(catId); const col = colId ? cat.columns.find(c => c.id === colId) : null;
  let options = col ? [...(col.options || [])] : [];
  const m = Modal.open({
    title: col ? 'Modifier la colonne' : 'Ajouter une colonne', sub: esc(cat.name),
    body: `<div class="form-grid">
      <div class="fg"><label for="fName">Nom de la colonne<span class="req">*</span></label><input class="input" id="fName" value="${esc(col ? col.name : '')}" placeholder="Ex. Pression"></div>
      <div class="fg"><label for="fType">Type de champ</label><select class="select full" id="fType">${Object.entries(FIELD_TYPES).map(([k, l]) => `<option value="${k}" ${(col ? col.type : 'text') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="fg full" id="fOptsWrap"><label>Choix de la liste</label><div class="options-editor" id="fOpts"></div><span class="hint">Tapez un choix puis Entrée.</span></div>
      <div class="fg" id="fUnitWrap"><label for="fUnit">Unité</label><input class="input" id="fUnit" value="${esc(col ? col.unit || '' : '')}" placeholder="pcs, kg, bar, mm…"></div>
      <div class="fg" id="fDefWrap"><label for="fDef">Valeur par défaut</label><div id="fDefSlot"></div></div>
      <div class="fg" id="fRoleWrap"><label for="fRole">Rôle dans le stock</label><select class="select full" id="fRole"></select><span class="hint">Relie la colonne aux calculs de stock.</span></div>
      <div class="fg full"><div class="switch-row"><label class="check"><input type="checkbox" id="fReq" ${col && col.required ? 'checked' : ''}>Champ obligatoire</label>${col ? '' : '<label class="check"><input type="checkbox" id="fApply" checked>Appliquer la valeur par défaut aux articles existants</label>'}</div></div>
    </div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="fSave" type="button">${col ? 'Enregistrer' : 'Ajouter la colonne'}</button>`,
  });
  const typeSel = $('#fType', m.el);
  const drawOpts = () => {
    const ed = $('#fOpts', m.el);
    ed.innerHTML = options.map((o, i) => `<span class="opt">${esc(o)}<button type="button" data-rm="${i}" aria-label="Retirer">×</button></span>`).join('') + '<input id="fOptIn" placeholder="Ajouter un choix…">';
    $$('[data-rm]', ed).forEach(b => b.addEventListener('click', () => { options.splice(+b.dataset.rm, 1); drawOpts(); drawDefault(); }));
    const inp = $('#fOptIn', ed);
    inp.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) { e.preventDefault(); const v = inp.value.trim(); inp.value = ''; if (!options.includes(v)) options.push(v); drawOpts(); drawDefault(); $('#fOptIn', m.el).focus(); } else if (e.key === 'Backspace' && !inp.value && options.length) { options.pop(); drawOpts(); drawDefault(); $('#fOptIn', m.el).focus(); } });
    inp.addEventListener('blur', () => { const v = inp.value.trim(); if (!v) return; inp.value = ''; setTimeout(() => { if (!options.includes(v)) options.push(v); drawOpts(); drawDefault(); }, 0); });
  };
  const drawDefault = () => {
    const t = typeSel.value; const cur = $('#fDef', m.el) ? readDef() : (col ? col.default : '');
    let h;
    if (t === 'checkbox') h = `<label class="check" style="padding:8px 0"><input type="checkbox" id="fDef" ${cur === true || cur === 'true' ? 'checked' : ''}>Coché par défaut</label>`;
    else if (t === 'dropdown') h = `<select class="select full" id="fDef"><option value="">Aucune</option>${options.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (t === 'image' || t === 'link') h = '<input class="input" id="fDef" disabled placeholder="Non applicable">';
    else h = `<input class="input ${t === 'reference' ? 'mono' : ''}" id="fDef" type="${t === 'date' ? 'date' : ['number', 'quantity'].includes(t) ? 'number' : 'text'}" step="any" value="${esc(cur ?? '')}">`;
    $('#fDefSlot', m.el).innerHTML = h;
  };
  const readDef = () => { const el = $('#fDef', m.el); if (!el) return ''; return el.type === 'checkbox' ? el.checked : el.value; };
  const drawRoles = () => {
    const t = typeSel.value; const cur = $('#fRole', m.el).value || (col ? col.role : '');
    const allowed = Object.keys(ROLES).filter(r => !r || (ROLE_TYPES[r] || []).includes(t));
    $('#fRole', m.el).innerHTML = allowed.map(r => { const taken = r && cat.columns.find(c => c.role === r && c !== col); return `<option value="${r}" ${r === (allowed.includes(cur) ? cur : (t === 'quantity' && !roleCol(cat, 'quantity') ? 'quantity' : '')) ? 'selected' : ''}>${ROLES[r]}${taken ? ' (remplace « ' + esc(taken.name) + ' »)' : ''}</option>`; }).join('');
  };
  const syncType = () => { const t = typeSel.value; $('#fOptsWrap', m.el).hidden = t !== 'dropdown'; $('#fUnitWrap', m.el).hidden = !['number', 'quantity'].includes(t); drawDefault(); drawRoles(); };
  typeSel.addEventListener('change', syncType); drawOpts(); syncType();
  $('#fSave', m.el).addEventListener('click', () => {
    const name = $('#fName', m.el).value.trim(); const type = typeSel.value;
    if (!name) { $('#fName', m.el).closest('.fg').classList.add('invalid'); $('#fName', m.el).focus(); return; }
    if (cat.columns.some(c => c.name.toLowerCase() === name.toLowerCase() && c !== col)) { toast('Une colonne porte déjà ce nom dans cette catégorie.', 'bad'); return; }
    if (type === 'dropdown' && !options.length) { toast('Ajoutez au moins un choix à la liste.', 'bad'); $('#fOptIn', m.el).focus(); return; }
    const data = { name, type, required: $('#fReq', m.el).checked, default: (type === 'image' || type === 'link') ? '' : castValue({ type }, readDef()), options: type === 'dropdown' ? options : [], role: $('#fRole', m.el).value, unit: ['number', 'quantity'].includes(type) ? $('#fUnit', m.el).value.trim() : '' };
    if (col) { Repo.columns.update(catId, col.id, data); toast('Colonne mise à jour', 'ok'); }
    else { Repo.columns.add(catId, data, $('#fApply', m.el) && $('#fApply', m.el).checked); toast(`Colonne « ${name} » ajoutée`, 'ok'); }
    m.close(); after && after(); render();
  });
}

/* ---------- Item form (generated from the category's columns) ---------- */
function linkFieldHtml(col, value, catId) {
  const id = 'v_' + col.id; const refs = castValue(col, value || []); const t = linkTargets(catId);
  const opt = (o) => `<option value="${o.ref}">${esc(o.label)}</option>`;
  return `<div class="fg full" data-col="${col.id}"><label for="${id}_add">${esc(col.name)}${col.required ? '<span class="req">*</span>' : ''}</label>
    <div class="linkfield" data-link="${col.id}"><div class="linksel"></div>
      <select class="select full" id="${id}_add"><option value="">+ Ajouter un moule, une catégorie ou une machine…</option>${t.cats.length ? `<optgroup label="Moules et catégories">${t.cats.map(opt).join('')}</optgroup>` : ''}${t.eq.length ? `<optgroup label="Machines et équipements">${t.eq.map(opt).join('')}</optgroup>` : ''}</select></div>
    <span class="hint">Indique que cet article sert aussi ailleurs. Il apparaîtra dans la page de chaque moule ou machine choisi.</span>
    <input type="hidden" id="${id}" value="${esc(JSON.stringify(refs))}"></div>`;
}
function fieldHtml(col, value, catId) {
  if (col.type === 'link') return linkFieldHtml(col, value, catId);
  const id = 'v_' + col.id; const req = col.required ? '<span class="req">*</span>' : '';
  const label = `<label for="${id}">${esc(col.name)}${col.unit ? ` <span class="muted" style="font-weight:400">(${esc(col.unit)})</span>` : ''}${req}</label>`;
  const v = value ?? '';
  switch (col.type) {
    case 'longtext': return `<div class="fg full" data-col="${col.id}">${label}<textarea class="textarea" id="${id}">${esc(v)}</textarea></div>`;
    case 'number': case 'quantity': return `<div class="fg" data-col="${col.id}">${label}<input class="input num" id="${id}" type="number" step="any" ${col.type === 'quantity' ? 'min="0"' : ''} value="${esc(v)}">${col.type === 'quantity' ? '<span class="hint">Une modification ici est enregistrée comme ajustement dans le journal.</span>' : ''}</div>`;
    case 'date': return `<div class="fg" data-col="${col.id}">${label}<input class="input" id="${id}" type="date" value="${esc(v)}"></div>`;
    case 'dropdown': return `<div class="fg" data-col="${col.id}">${label}<select class="select full" id="${id}"><option value="">—</option>${(col.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}${v && !(col.options || []).includes(v) ? `<option selected>${esc(v)}</option>` : ''}</select></div>`;
    case 'checkbox': return `<div class="fg" data-col="${col.id}"><label>&nbsp;</label><label class="check" style="padding:8px 0"><input type="checkbox" id="${id}" ${v === true ? 'checked' : ''}>${esc(col.name)}${req}</label></div>`;
    case 'image': return `<div class="fg full" data-col="${col.id}">${label}<div class="img-field" data-img="${col.id}"><div class="preview">${v ? `<img src="${v}" alt="">` : ic('image')}</div><div><div class="btns"><button class="btn btn-sm" data-pick type="button">${ic('upload')}${v ? 'Remplacer' : 'Choisir une image'}</button><button class="btn btn-sm btn-ghost" data-rmimg type="button" ${v ? '' : 'hidden'}>${ic('trash')}Retirer</button></div><span class="hint">JPG ou PNG, ou glissez-déposez sur l'aperçu. Compressée à 800 px.</span></div></div><input type="hidden" id="${id}" value="${v ? '1' : ''}"></div>`;
    case 'reference': return `<div class="fg" data-col="${col.id}">${label}<input class="input mono" id="${id}" value="${esc(v)}" autocomplete="off"></div>`;
    default: return `<div class="fg" data-col="${col.id}">${label}<input class="input" id="${id}" value="${esc(v)}"></div>`;
  }
}
/* ---------- Types de fiche : machine, équipement, pièce de rechange ----------
   Dans une même catégorie, chaque article peut avoir son propre formulaire. Les champs manquants sont ajoutés
   à la catégorie au premier enregistrement ; machines et équipements ne comptent pas dans le stock. */
const F = (name, type, extra = {}) => Object.assign({ name, type, role: '', required: false, default: '', options: [], unit: '' }, extra);
const ITEM_TYPES = {
  machine: { label: 'Machine', icon: 'settings', stock: false, fields: [F('Référence', 'reference', { role: 'reference', required: true }), F('Désignation', 'text', { role: 'name', required: true }), F('Fabricant', 'text'), F('Modèle', 'text'), F('N° de série', 'text'), F('Tonnage', 'number', { unit: 't' }), F('Statut', 'dropdown', { options: ['En production', 'En réglage', 'En maintenance', "À l'arrêt"] }), F('Emplacement', 'text', { role: 'location' }), F('Photo', 'image'), F('Notes', 'longtext')] },
  equipement: { label: 'Équipement', icon: 'wrench', stock: false, fields: [F('Référence', 'reference', { role: 'reference', required: true }), F('Désignation', 'text', { role: 'name', required: true }), F('Fabricant', 'text'), F('Modèle', 'text'), F('N° de série', 'text'), F('Statut', 'dropdown', { options: ['En service', 'En maintenance', 'Hors service'] }), F('Emplacement', 'text', { role: 'location' }), F('Photo', 'image'), F('Notes', 'longtext')] },
  piece: { label: 'Pièce de rechange', icon: 'box', stock: true, fields: [F('Référence', 'reference', { role: 'reference', required: true }), F('Désignation', 'text', { role: 'name', required: true }), F('Quantité', 'quantity', { role: 'quantity', required: true, default: 0, unit: 'pcs' }), F('Stock min', 'number', { role: 'min', unit: 'pcs' }), F('Emplacement', 'text', { role: 'location' }), F('Fournisseur', 'text'), F('En commun avec', 'link'), F('Photo', 'image'), F('Notes', 'longtext')] },
};
const isNonStockItem = (it) => !!(it && ITEM_TYPES[it.formType] && !ITEM_TYPES[it.formType].stock);
const defaultFormType = (cat) => cat.defaultForm || (isStockCat(cat) ? 'piece' : /machine/i.test(cat.name) ? 'machine' : 'equipement');
/** Colonnes de la catégorie à utiliser pour un type de fiche (existantes si possible, sinon nouvelles). */
function planFormCols(cat, type) {
  const T = ITEM_TYPES[type]; if (!T) return cat.columns.map(col => ({ col, isNew: false }));
  const used = new Set(); const out = new Array(T.fields.length);
  const take = (i, col) => { used.add(col.id); out[i] = { col, isNew: false }; };
  T.fields.forEach((f, i) => { const c = cat.columns.find(x => !used.has(x.id) && normName(x.name) === normName(f.name) && (x.type === f.type || (f.type === 'text' && ['text', 'longtext'].includes(x.type)) || (f.type === 'reference' && x.type === 'text'))); if (c) take(i, c); });
  T.fields.forEach((f, i) => { if (out[i] || !f.role) return; const c = cat.columns.find(x => !used.has(x.id) && x.role === f.role); if (c) take(i, c); });
  T.fields.forEach((f, i) => { if (out[i] || !['image', 'link', 'quantity'].includes(f.type)) return; const c = cat.columns.find(x => !used.has(x.id) && x.type === f.type); if (c) take(i, c); });
  T.fields.forEach((f, i) => { if (out[i]) return; const role = f.role && !cat.columns.some(x => x.role === f.role) ? f.role : ''; out[i] = { col: Object.assign({}, f, { id: uid('f'), role, required: role ? f.required : false }), isNew: true, wantRole: f.role && !role ? f.role : '' }; });
  return out;
}
function openItemForm(catId, itemId, formType) {
  const cat = Repo.categories.get(catId); const it = itemId ? Repo.items.get(itemId) : null;
  const ftype = it ? (it.formType || '') : (formType ?? defaultFormType(cat));
  const plan = planFormCols(cat, ftype); const fcols = plan.map(p => p.col);
  const vals = it ? clone(it.values) : {}; const images = {};
  fcols.forEach(c => { if (c.type === 'image') images[c.id] = vals[c.id] || ''; if (!it && c.default !== '' && c.default !== undefined && c.type !== 'image') vals[c.id] = c.default; });
  const m = Modal.open({
    title: it ? "Modifier l'article" : 'Nouvel article', sub: `${esc(cat.name)}${ITEM_TYPES[ftype] ? ' · ' + ITEM_TYPES[ftype].label : ''} · ${fcols.length} champs`, size: 'wide',
    body: (it ? '' : `<div class="fg full type-pick"><label>Type de fiche</label><div class="seg-pick">${Object.entries(ITEM_TYPES).map(([k, T]) => `<button type="button" class="chip-opt ${k === ftype ? 'on' : ''}" data-ftype="${k}">${ic(T.icon)}${T.label}</button>`).join('')}<button type="button" class="chip-opt ${!ITEM_TYPES[ftype] ? 'on' : ''}" data-ftype="">${ic('grid')}Toutes les colonnes</button></div></div>`) + (fcols.length ? `<div class="form-grid">${fcols.map(c => fieldHtml(c, vals[c.id], cat.id)).join('')}</div>` : `<div class="empty"><b>Cette catégorie n'a aucune colonne</b>Ajoutez d'abord une colonne pour définir le formulaire.</div>`),
    foot: `<button class="btn" data-close type="button">Annuler</button>${it ? '' : '<button class="btn" id="iSaveNew" type="button">Enregistrer et nouveau</button>'}<button class="btn btn-accent" id="iSave" type="button">${it ? 'Enregistrer' : "Créer l'article"}</button>`,
  });
  m.el.dataset.item = itemId || '';
  $$('[data-ftype]', m.el).forEach(b => b.addEventListener('click', () => { if (b.dataset.ftype === ftype) return; m.close(); setTimeout(() => openItemForm(catId, null, b.dataset.ftype), 60); }));
  // image controls
  $$('[data-img]', m.el).forEach(box => {
    const colId = box.dataset.img; const prev = $('.preview', box);
    const set = (src) => { images[colId] = src || ''; prev.innerHTML = src ? `<img src="${src}" alt="">` : icon('image'); $('[data-rmimg]', box).hidden = !src; $('[data-pick]', box).lastChild.textContent = src ? 'Remplacer' : 'Choisir une image'; $('#v_' + colId, m.el).value = src ? '1' : ''; };
    $('[data-pick]', box).addEventListener('click', async () => { const src = await ImageTools.pick(); if (src) set(src); });
    $('[data-rmimg]', box).addEventListener('click', () => set(''));
    prev.addEventListener('click', () => { if (images[colId]) lightbox(images[colId]); });
    prev.addEventListener('dragover', e => { e.preventDefault(); prev.classList.add('drop'); });
    prev.addEventListener('dragleave', () => prev.classList.remove('drop'));
    prev.addEventListener('drop', async e => { e.preventDefault(); prev.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (!f) return; try { set(await ImageTools.compress(f)); } catch (err) { toast(err.message, 'bad'); } });
  });
  // link pickers
  $$('[data-link]', m.el).forEach(box => {
    const colId = box.dataset.link; const hidden = $('#v_' + colId, m.el); const sel = $('select', box);
    const get = () => { try { return JSON.parse(hidden.value || '[]'); } catch (e) { return []; } };
    const draw = () => {
      const refs = get();
      $('.linksel', box).innerHTML = refs.length ? refs.map(r => { const l = refLabel(r); return l ? `<span class="linkchip static" style="--c:${l.color}">${ic(l.kind === 'c' ? 'folder' : 'settings')}<span>${esc(l.name)}</span><button type="button" data-unlink="${r}" aria-label="Retirer">×</button></span>` : ''; }).join('') : '<span class="muted" style="font-size:12.5px">Aucune liaison</span>';
      hydrateIcons(box); $$('option', sel).forEach(o => { if (o.value) o.disabled = refs.includes(o.value); });
      $$('[data-unlink]', box).forEach(b => b.addEventListener('click', () => { hidden.value = JSON.stringify(get().filter(x => x !== b.dataset.unlink)); draw(); }));
    };
    sel.addEventListener('change', () => { if (sel.value) { const r = get(); if (!r.includes(sel.value)) r.push(sel.value); hidden.value = JSON.stringify(r); } sel.value = ''; draw(); });
    draw();
  });
  const collect = () => {
    const out = {}; let ok = true;
    $$('.fg', m.el).forEach(f => f.classList.remove('invalid')); $$('.fg .err', m.el).forEach(e => e.remove());
    fcols.forEach(c => {
      const el = $('#v_' + c.id, m.el); let v;
      if (c.type === 'image') v = images[c.id] || ''; else if (c.type === 'checkbox') v = el.checked; else if (c.type === 'link') { try { v = castValue(c, JSON.parse(el.value || '[]')); } catch (e) { v = []; } } else v = castValue(c, el.value.trim());
      const empty = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
      if (c.required && empty) { ok = false; const fg = el.closest('.fg'); fg.classList.add('invalid'); fg.insertAdjacentHTML('beforeend', '<span class="err">Champ obligatoire</span>'); }
      if (c.type === 'quantity' && !empty && v < 0) { ok = false; const fg = el.closest('.fg'); fg.classList.add('invalid'); fg.insertAdjacentHTML('beforeend', '<span class="err">La quantité ne peut pas être négative</span>'); }
      if (!empty || c.type === 'checkbox') out[c.id] = v;
    });
    const refCol = fcols.find(c => c.role === 'reference');
    if (refCol && out[refCol.id] && Repo.items.byCategory(catId).some(x => x !== it && String(x.values[refCol.id]).toLowerCase() === String(out[refCol.id]).toLowerCase())) {
      ok = false; const fg = $('#v_' + refCol.id, m.el).closest('.fg'); fg.classList.add('invalid'); fg.insertAdjacentHTML('beforeend', '<span class="err">Cette référence existe déjà dans la catégorie</span>');
    }
    if (!ok) { const first = $('.fg.invalid input, .fg.invalid select, .fg.invalid textarea', m.el); first && first.focus(); }
    return ok ? out : null;
  };
  const save = (again) => {
    const values = collect(); if (!values) return;
    const added = plan.filter(p => p.isNew && values[p.col.id] !== undefined && values[p.col.id] !== '').map(p => { const c = Object.assign({}, p.col); delete c.isNew; return c; });
    // ex. « Désignation » ajoutée alors que « Modèle » servait de nom : la désignation devient le nom de l'article
    plan.filter(p => p.wantRole && added.some(a => a.id === p.col.id)).forEach(p => { const old = cat.columns.find(x => x.role === p.wantRole); if (old && fcols.includes(old)) { old.role = ''; added.find(a => a.id === p.col.id).role = p.wantRole; } });
    if (added.length || (!it && ITEM_TYPES[ftype] && cat.defaultForm !== ftype)) Repo.categories.update(cat.id, { columns: [...cat.columns, ...added], defaultForm: ITEM_TYPES[ftype] ? ftype : cat.defaultForm });
    const qCol = ITEM_TYPES[ftype] && !ITEM_TYPES[ftype].stock ? null : roleCol(cat, 'quantity');
    if (it) {
      const before = qCol ? numOrNull(it.values[qCol.id]) ?? 0 : null;
      Repo.items.update(it.id, values);
      if (qCol) { const after = numOrNull(values[qCol.id]) ?? 0; if (after !== before) logMovement(it, 'adjust', Math.abs(after - before), before, after, 'Modification de la fiche article'); }
      toast('Article enregistré', 'ok');
    } else {
      const created = Repo.items.create(catId, values); if (ITEM_TYPES[ftype]) { created.formType = ftype; Repo.commit(); }
      if (qCol) { const q = numOrNull(values[qCol.id]) ?? 0; logMovement(created, 'initial', q, 0, q, 'Création de la fiche article'); }
      toast(`Article « ${itemName(created)} » créé`, 'ok');
    }
    m.close(); render(); if (again) openItemForm(catId, null, ftype);
  };
  $('#iSave', m.el).addEventListener('click', () => save(false));
  const sn = $('#iSaveNew', m.el); if (sn) sn.addEventListener('click', () => save(true));
}
function logMovement(item, type, qty, prev, next, note, extra = {}) {
  return Repo.journal.add(Object.assign({ date: new Date().toISOString(), itemId: item.id, categoryId: item.categoryId, ref: itemRef(item), itemName: itemName(item), categoryName: catOf(item).name, type, qty, prev, next, note, location: itemLoc(item) }, extra));
}

/* ---------- Item detail ---------- */
function openItemDetail(itemId) {
  const it = Repo.items.get(itemId); const cat = catOf(it); const stock = isStockCat(cat) && !isNonStockItem(it);
  const imgCol = cat.columns.find(c => c.type === 'image'); const img = imgCol ? it.values[imgCol.id] : '';
  const hist = Repo.journal.forItem(itemId).slice(0, 12); const u = qtyUnit(it);
  const m = Modal.open({
    title: itemName(it), sub: `${esc(cat.name)}${itemRef(it) ? ` · <span class="mono">${esc(itemRef(it))}</span>` : ''}`, size: 'wide',
    body: `<div class="detail">
      <div><div class="pic">${img ? `<img src="${img}" alt="${esc(itemName(it))}" id="dImg">` : `<div class="ph" style="background:${cat.color}">${esc(cat.code)}</div>`}</div>
        ${imgCol ? `<div class="pic-actions"><button class="btn btn-sm" id="dPick" type="button">${ic('upload')}${img ? "Remplacer l'image" : 'Ajouter une image'}</button>${img ? `<button class="btn btn-sm btn-ghost" id="dRm" type="button">${ic('trash')}Retirer</button>` : ''}</div>` : '<p class="muted" style="font-size:12px;margin-top:8px">Ajoutez une colonne de type Image à la catégorie pour afficher une photo.</p>'}
      </div>
      <div style="min-width:0">
        ${stock ? `<div class="stock-box"><div><span>Quantité</span><b>${fmtNum(itemQty(it))}</b> <span class="muted" style="display:inline;text-transform:none;letter-spacing:0;font-weight:400">${esc(u)}</span></div><div><span>Minimum</span><b>${fmtNum(itemMin(it))}</b></div><div><span>Maximum</span><b>${fmtNum(itemMax(it))}</b></div><div><span>Statut</span><div style="margin-top:4px">${statusBadge(stockStatus(it))}</div></div></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px"><button class="btn btn-sm" data-mv="in" type="button">${ic('in')}Entrée</button><button class="btn btn-sm" data-mv="out" type="button">${ic('out')}Sortie</button><button class="btn btn-sm" data-mv="adjust" type="button">${ic('adjust')}Ajuster</button>${roleCol(cat, 'location') ? `<button class="btn btn-sm" data-mv="transfer" type="button">${ic('swap')}Transférer</button>` : ''}</div>` : ''}
        <dl class="dl">${cat.columns.filter(c => c.type !== 'image').map(c => `<dt>${esc(c.name)}</dt><dd>${displayValue(c, it.values[c.id], false)}</dd>`).join('')}<dt>Créé</dt><dd>${fmtDateTime(it.createdAt)}</dd><dt>Modifié</dt><dd>${fmtDateTime(it.updatedAt)}</dd></dl>
        ${(() => { const back = linkedFrom('i:' + it.id); return back.length ? `<div class="section-title">Articles associés à ${esc(itemName(it))} (${back.length})</div><div class="linkchips">${back.map(b => `<button type="button" class="linkchip" data-goref="i:${b.id}" style="--c:${catOf(b).color}">${ic('box')}<span>${esc((itemRef(b) ? itemRef(b) + ' · ' : '') + itemName(b))}</span><em>${esc(catOf(b).name)}</em></button>`).join('')}</div>` : ''; })()}
        ${fichesBlock('i:' + it.id)}
        ${mpBlock('i:' + it.id)}
        ${stock ? `<div class="section-title">Historique des mouvements</div>${hist.length ? `<div class="table-wrap" style="border:1px solid var(--line);border-radius:8px"><table class="data"><thead><tr><th>Date</th><th>Opération</th><th class="r">Qté</th><th class="r">Après</th><th>Par</th><th>Note</th></tr></thead><tbody>${hist.map(h => `<tr style="cursor:default"><td class="num" style="white-space:nowrap">${fmtDate(h.date)} <span class="muted">${fmtTime(h.date)}</span></td><td>${opBadge(h.type)}</td><td class="r">${deltaHtml(h)}</td><td class="r num">${fmtNum(h.next)}</td><td>${esc(h.user)}</td><td class="clip muted">${esc(h.note) || '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucun mouvement enregistré.</p>'}` : ''}
      </div></div>`,
    foot: `<button class="btn btn-ghost left" id="dDel" type="button" style="color:var(--bad)">${ic('trash')}Supprimer</button><button class="btn" id="dFi" type="button">${ic('wrench')}Fiche d’intervention</button><button class="btn" id="dDup" type="button">${ic('copy')}Dupliquer</button><button class="btn btn-accent" id="dEdit" type="button">${ic('edit')}Modifier</button>`,
  });
  m.el.dataset.item = itemId; bindLinkChips(m.el);
  $$('[data-openfi]', m.el).forEach(b => b.addEventListener('click', () => { m.close(); openFicheDetail(b.dataset.openfi); }));
  bindMpBlocks(m.el);
  const reopen = () => { m.close(); render(); openItemDetail(itemId); };
  const di = $('#dImg', m.el); if (di) di.addEventListener('click', () => lightbox(img));
  const dp = $('#dPick', m.el); if (dp) dp.addEventListener('click', async () => { const src = await ImageTools.pick(); if (!src) return; const v = clone(it.values); v[imgCol.id] = src; Repo.items.update(it.id, v); toast('Image enregistrée', 'ok'); reopen(); });
  const dr = $('#dRm', m.el); if (dr) dr.addEventListener('click', async () => { if (!(await confirmDialog({ title: "Retirer l'image ?", message: "L'image sera supprimée de cet article.", confirmLabel: 'Retirer' }))) return; const v = clone(it.values); delete v[imgCol.id]; Repo.items.update(it.id, v); toast('Image retirée', 'ok'); reopen(); });
  $$('[data-mv]', m.el).forEach(b => b.addEventListener('click', () => openMovementForm(itemId, b.dataset.mv, reopen)));
  $('#dEdit', m.el).addEventListener('click', () => { m.close(); openItemForm(cat.id, itemId); });
  $('#dFi', m.el).addEventListener('click', () => { m.close(); openFicheForm(null, { equipment: ['i:' + itemId] }); });
  $('#dDup', m.el).addEventListener('click', () => { m.close(); duplicateItem(itemId); });
  $('#dDel', m.el).addEventListener('click', () => deleteItem(itemId));
}

/* ---------- Stock movement ---------- */
function openMovementForm(itemId = '', type = 'in', after) {
  const all = stockItems();
  if (!all.length) { toast('Aucun article suivi en stock. Ajoutez une colonne Quantité à une catégorie.', 'bad'); return; }
  const cats = itemCats().filter(isStockCat);
  const m = Modal.open({
    title: 'Mouvement de stock', sub: 'Enregistré dans le journal avec la quantité avant et après.',
    body: `<div class="form-grid">
      <div class="fg full"><label for="mItem">Article<span class="req">*</span></label><select class="select full" id="mItem"><option value="">Choisir un article…</option>${cats.map(c => `<optgroup label="${esc(catLabel(c))}">${Repo.items.byCategory(c.id).map(i => `<option value="${i.id}" ${i.id === itemId ? 'selected' : ''}>${esc(itemRef(i) ? itemRef(i) + ' — ' : '')}${esc(itemName(i))}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="fg full"><label>Opération</label><div class="seg" id="mType" style="flex-wrap:wrap">${['in', 'out', 'adjust', 'transfer'].map(k => `<button type="button" data-t="${k}" class="${k === type ? 'on' : ''}" style="padding:8px 12px;gap:6px;display:flex;font-weight:600;font-size:13px">${ic(OPS[k].icon)}${OPS[k].short}</button>`).join('')}</div></div>
      <div class="fg"><label for="mQty" id="mQtyLabel">Quantité<span class="req">*</span></label><input class="input num" id="mQty" type="number" min="0" step="any" placeholder="0"></div>
      <div class="fg" id="mLocWrap"><label for="mLoc">Nouvel emplacement<span class="req">*</span></label><input class="input" id="mLoc" list="mLocList" placeholder="Ex. MAG-B · R01 · N2"><datalist id="mLocList"></datalist></div>
      <div class="fg"><label for="mDate">Date et heure</label><input class="input" id="mDate" type="datetime-local" value="${toLocalInput(new Date())}" data-default="${toLocalInput(new Date())}"></div>
      <div class="fg full"><label for="mNote">Note</label><input class="input" id="mNote" placeholder="N° de BL, ordre de fabrication, motif…"></div>
      <div class="fg full"><div id="mPreview" class="stock-box" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0"></div></div>
    </div>`,
    foot: `<button class="btn" data-close type="button">Annuler</button><button class="btn btn-accent" id="mSave" type="button">Enregistrer le mouvement</button>`,
  });
  let t = type;
  const sel = $('#mItem', m.el), qty = $('#mQty', m.el);
  const cur = () => Repo.items.get(sel.value);
  const compute = () => { const i = cur(); if (!i) return null; const q0 = itemQty(i) || 0; const n = Number(qty.value); if (qty.value === '' || isNaN(n)) return { q0, q1: null }; const q1 = t === 'in' ? q0 + n : t === 'out' ? q0 - n : t === 'adjust' ? n : q0; return { q0, q1, n }; };
  const sync = () => {
    $$('#mType [data-t]', m.el).forEach(b => b.classList.toggle('on', b.dataset.t === t));
    const i = cur(); const locCol = i && roleCol(catOf(i), 'location');
    $('#mQtyLabel', m.el).innerHTML = (t === 'adjust' ? 'Nouvelle quantité (inventaire)' : t === 'transfer' ? 'Quantité transférée' : 'Quantité') + '<span class="req">*</span>';
    $('#mLocWrap', m.el).hidden = t !== 'transfer';
    if (t === 'transfer' && i && !locCol) toast("Cette catégorie n'a pas de colonne Emplacement.", 'bad');
    if (i && locCol) { const locs = new Set(Repo.items.byCategory(i.categoryId).map(x => x.values[locCol.id]).filter(Boolean)); (locCol.options || []).forEach(o => locs.add(o)); $('#mLocList', m.el).innerHTML = [...locs].map(l => `<option value="${esc(l)}">`).join(''); }
    const r = compute(); const u = i ? qtyUnit(i) : '';
    $('#mPreview', m.el).innerHTML = i ? `<div><span>Stock actuel</span><b>${fmtNum(r.q0)}</b> <span class="muted">${esc(u)}</span></div><div><span>Après mouvement</span><b style="color:${r.q1 === null ? 'inherit' : r.q1 < 0 ? 'var(--bad)' : 'var(--ink)'}">${r.q1 === null ? '—' : fmtNum(r.q1)}</b></div><div><span>Emplacement</span><b style="font:500 13px var(--sans)">${esc(itemLoc(i)) || '—'}</b></div>` : '<div style="grid-column:1/-1"><span>Choisissez un article pour voir son stock</span></div>';
  };
  $$('#mType [data-t]', m.el).forEach(b => b.addEventListener('click', () => { t = b.dataset.t; sync(); }));
  sel.addEventListener('change', sync); qty.addEventListener('input', sync); sync();
  if (itemId) setTimeout(() => qty.focus(), 40);
  $('#mSave', m.el).addEventListener('click', () => {
    const i = cur(); if (!i) { sel.closest('.fg').classList.add('invalid'); sel.focus(); return; }
    const r = compute(); if (r.q1 === null || (t !== 'adjust' && !(r.n > 0))) { qty.closest('.fg').classList.add('invalid'); qty.focus(); toast(t === 'adjust' ? 'Indiquez la quantité comptée.' : 'Indiquez une quantité supérieure à zéro.', 'bad'); return; }
    if (r.q1 < 0) { toast(`Sortie impossible : il reste ${fmtNum(r.q0)} en stock.`, 'bad'); qty.focus(); return; }
    const cat = catOf(i); const qCol = roleCol(cat, 'quantity'); const locCol = roleCol(cat, 'location');
    let extra = {};
    if (t === 'transfer') {
      const to = $('#mLoc', m.el).value.trim(); if (!locCol) { toast("Pas de colonne Emplacement dans cette catégorie.", 'bad'); return; }
      if (!to) { $('#mLoc', m.el).closest('.fg').classList.add('invalid'); $('#mLoc', m.el).focus(); return; }
      extra = { fromLoc: itemLoc(i), toLoc: to };
    }
    if (t === 'adjust' && r.q1 === r.q0) { toast('La quantité est déjà à ce niveau.', 'bad'); return; }
    const v = clone(i.values); v[qCol.id] = r.q1; if (t === 'transfer') v[locCol.id] = extra.toLoc; Repo.items.update(i.id, v);
    const dEl = $('#mDate', m.el); const d = dEl.value && dEl.value !== dEl.dataset.default ? new Date(dEl.value) : new Date();
    const mv = logMovement(i, t, t === 'adjust' ? Math.abs(r.q1 - r.q0) : r.n, r.q0, r.q1, $('#mNote', m.el).value.trim(), Object.assign(extra, { date: isNaN(d) ? new Date().toISOString() : d.toISOString() }));
    const st = stockStatus(Repo.items.get(i.id));
    toast(`Mouvement enregistré (${OPS[t].short.toLowerCase()}) : ${itemRef(i) || itemName(i)} → ${fmtNum(mv.next)}${st === 'low' ? ' (stock bas)' : st === 'out' ? ' (rupture)' : ''}`, st === 'ok' ? 'ok' : 'bad');
    m.close(); if (after) after(); else render();
  });
}

/* ---------- Global search ---------- */
function initGlobalSearch() {
  const inp = $('#globalSearch'), box = $('#searchResults'); let hits = [], idx = -1;
  const draw = () => {
    const q = inp.value.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
    hits = Repo.items.list().filter(i => Object.values(i.values).some(x => typeof x === 'string' && !x.startsWith('data:') && x.toLowerCase().includes(q)) || itemName(i).toLowerCase().includes(q)).slice(0, 8);
    idx = hits.length ? 0 : -1;
    box.innerHTML = hits.length ? hits.map((i, k) => `<div class="sr-item ${k === idx ? 'focus' : ''}" data-i="${i.id}">${thumbHtml(i)}<div class="t"><b>${esc(itemName(i))}</b><span>${esc(catOf(i).name)}${itemRef(i) ? ' · ' + esc(itemRef(i)) : ''}${isStockCat(catOf(i)) ? ' · ' + fmtNum(itemQty(i)) + ' ' + esc(qtyUnit(i)) : ''}</span></div>${isStockCat(catOf(i)) ? statusBadge(stockStatus(i)) : ''}</div>`).join('') : '<div class="sr-item" style="cursor:default"><div class="t"><span>Aucun article trouvé</span></div></div>';
    box.hidden = false;
    $$('[data-i]', box).forEach(el => el.addEventListener('mousedown', e => { e.preventDefault(); pick(el.dataset.i); }));
  };
  const pick = (id) => { box.hidden = true; inp.value = ''; inp.blur(); openItemDetail(id); };
  inp.addEventListener('input', debounce(draw, 100));
  inp.addEventListener('focus', draw);
  inp.addEventListener('blur', () => setTimeout(() => box.hidden = true, 120));
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!hits.length) return; idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; $$('.sr-item', box).forEach((el, k) => el.classList.toggle('focus', k === idx)); }
    else if (e.key === 'Enter' && hits[idx]) pick(hits[idx].id);
    else if (e.key === 'Escape') { box.hidden = true; inp.blur(); }
  });
  document.addEventListener('keydown', e => { if (e.key === '/' && !e.target.closest('input,textarea,select') && !Modal.top()) { e.preventDefault(); inp.focus(); } });
}

/* ======================= 11b. ONE-TIME DATA TASKS =======================
   Small data additions requested by the user, applied once on the shared database (deterministic ids: safe if
   two devices run them at the same time). Each task records its id in settings.tasksDone. */
const DATA_TASKS = [
  { id: 'annuler-modifs-stock-16h38-16h53-2026-10-02', run() {
    // Annule les modifications de quantité faites entre 16:38 et 16:53 (heure locale) le 02/10/2026 : retour à la quantité d'avant, mouvements retirés.
    const db = Repo.raw();
    [['i-jmen-6', 'mmur2m9xb49iw1', 26, 42], ['i-jmen-5', 'mmur2ohvi1rsmx', 2, 4], ['i-jmen-7', 'mmur2tx2i234l0', 35, 50], ['i-jmen-8', 'mmur2v5hgcgthy', 68, 111]].forEach(([iid, mid, prev, next]) => {
      const it = db.items.find(i => i.id === iid);
      if (it && Number(it.values['f-jmen-qty']) === next) { it.values['f-jmen-qty'] = prev; it.updatedAt = new Date().toISOString(); }
      db.movements = db.movements.filter(m => m.id !== mid);
    });
    return true;
  } },
  { id: 'joints-moule-embout-nasal-2026-10-02', run() {
    const parent = Repo.categories.list().find(c => !isFolder(c) && /embout\s*nasal/i.test(c.name) && /moule/i.test(c.name));
    if (!parent) return false;
    const db = Repo.raw(); const cid = 'c-joints-men';
    if (!Repo.categories.get(cid)) {
      const col = (id, name, type, extra = {}) => Object.assign({ id, name, type, required: false, default: '', options: [], role: '', unit: '' }, extra);
      db.categories.push({ id: cid, kind: 'items', parentId: parent.id, name: 'Joints', code: 'JNT', color: '#7A4DB5', description: 'Joints toriques et joints d’étanchéité du moule embout nasal.', createdAt: new Date().toISOString(),
        columns: [col('f-jmen-ref', 'Référence', 'reference', { role: 'reference' }), col('f-jmen-des', 'Désignation', 'text', { role: 'name', required: true }), col('f-jmen-type', 'Type', 'dropdown', { options: ['Joint torique', 'Joint d’étanchéité'] }), col('f-jmen-dim', 'Dimension', 'text'), col('f-jmen-photo', 'Photo', 'image'),
          col('f-jmen-qty', 'Quantité', 'quantity', { role: 'quantity', unit: 'pcs', default: 0 }), col('f-jmen-min', 'Stock min', 'number', { role: 'min', unit: 'pcs' }), col('f-jmen-loc', 'Emplacement', 'text', { role: 'location' }), col('f-jmen-link', 'En commun avec', 'link'), col('f-jmen-notes', 'Notes', 'longtext')] });
    }
    const rows = [['JT-5x2', 'Joint torique 5 × 2 mm', 'Joint torique', '5 × 2 mm', 32], ['JT-12x3', 'Joint torique 12 × 3 mm', 'Joint torique', '12 × 3 mm', 15], ['JT-22x2', 'Joint torique 22 × 2 mm', 'Joint torique', '22 × 2 mm', 32],
      ['JT-14x2.5', 'Joint torique 14 × 2,5 mm', 'Joint torique', '14 × 2,5 mm', 14], ['JT-13x3', 'Joint torique 13 × 3 mm', 'Joint torique', '13 × 3 mm', 2], ['JT-40x2', 'Joint torique 40 × 2 mm', 'Joint torique', '40 × 2 mm', 16],
      ['JE-4.10.4', 'Joint d’étanchéité 4.10.4', 'Joint d’étanchéité', '4.10.4', 15], ['JE-22.32.5', 'Joint d’étanchéité 22.32.5', 'Joint d’étanchéité', '22.32.5', 32]];
    const now = new Date().toISOString(); const user = Repo.settings.get().user || 'Admin';
    rows.forEach(([ref, des, type, dim, q], k) => {
      const iid = 'i-jmen-' + (k + 1); if (db.items.some(i => i.id === iid)) return;
      db.items.push({ id: iid, categoryId: cid, createdAt: now, updatedAt: now, values: { 'f-jmen-ref': ref, 'f-jmen-des': des, 'f-jmen-type': type, 'f-jmen-dim': dim, 'f-jmen-qty': q, 'f-jmen-min': '', 'f-jmen-loc': '', 'f-jmen-link': [], 'f-jmen-notes': '' } });
      if (!db.movements.some(m => m.id === 'm-jmen-' + (k + 1))) db.movements.unshift({ id: 'm-jmen-' + (k + 1), date: now, itemId: iid, categoryId: cid, ref, itemName: des, categoryName: 'Joints', type: 'initial', qty: q, prev: 0, next: q, note: 'Stock initial · Moule Embout Nasal', location: '', user });
    });
    db.movements.sort((a, b) => b.date.localeCompare(a.date));
    return true;
  } },
  { id: 'joints-moule-embout-nasal-photo-2026-10-02', run() {
    const c = Repo.categories.get('c-joints-men'); if (!c) return false;
    if (!c.columns.some(x => x.type === 'image')) {
      const i = c.columns.findIndex(x => x.id === 'f-jmen-dim');
      c.columns.splice(i >= 0 ? i + 1 : c.columns.length, 0, { id: 'f-jmen-photo', name: 'Photo', type: 'image', required: false, default: '', options: [], role: '', unit: '' });
      c.updatedAt = new Date().toISOString();
    }
    return true;
  } },
  { id: 'retirer-colonne-n-moule-embout-nasal-2026-10-02', run() {
    // column "n" added by mistake on 2026-10-02 in Moule Embout Nasal
    const c = Repo.categories.get('cmupi6wy2z3g8q'); if (!c) return false;
    const gone = c.columns.filter(x => x.id === 'fmuqt5yitn6tyr' || (x.name || '').trim().toLowerCase() === 'n').map(x => x.id);
    if (gone.length) { c.columns = c.columns.filter(x => !gone.includes(x.id)); c.updatedAt = new Date().toISOString(); Repo.raw().items.filter(i => i.categoryId === c.id).forEach(i => gone.forEach(g => delete i.values[g])); }
    return true;
  } },
  { id: 'joints-pieces-de-rechange-correction-dhs-2026-10-03', run() {
    // Liste corrigée (03/10) + « Joint à lèvre » renommé « Joint DHS » avec sa photo. Les quantités ne changent pas.
    const db = Repo.raw(); const cat = Repo.categories.get('cmuo1p9pap6qqs'); if (!cat) return false;
    const colBy = (role, re) => cat.columns.find(c => c.role === role) || cat.columns.find(c => re.test(c.name || ''));
    const cRef = colBy('reference', /r[ée]f/i), cName = colBy('name', /d[ée]signation|nom/i), cImg = cat.columns.find(c => c.type === 'image');
    if (!cName) return false;
    const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAFoAWgDASIAAhEBAxEB/8QAHQABAAEFAQEBAAAAAAAAAAAAAAgDBAUGBwIBCf/EAEwQAAEDAgMEBgUJBgUCBAcAAAEAAgMEEQUGIRIxQVEHEyJhcYEUMpGhwQgVI0JSYnKx0TNDgpKy4RZTosLwk9IkNnTiFyU0VGSz8f/EABsBAQACAwEBAAAAAAAAAAAAAAAEBQIDBgEH/8QANhEAAgEDAwIDBgUEAgMBAAAAAAECAwQREiExBUETMlEiYXGBsdEUQpGh8CMzweE0QwYVUvH/2gAMAwEAAhEDEQA/AJUoiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCLGY3j2F4JD1mKV0NOLXDXOu53g0anyXO8f6YaSAPjwWidO7cJqk9Wzx2d59yk0LOvcf24t/Q01K9On5mdXJssXiOPYbh7SampYCNbD9dyjnjvSNj2K7TajE5Iojp1VK3q2+3f71qc+I9aS6Xald9qRxcferij0Cb3qyx8CHPqK/JEkXiHSfhUOkD6c98k408m3WuVvSqSfoqyJgH+RSud73fouIOr3C2yGi3cvDq+TiQp8Oh0I8vJHlfVXwdcqekuaS9sQrtdbNiDfgsdJn573a4jiQ79p36rmPprwdD7E9OfaxI9ikLpVBcGt3NVnSf8AG8r92K1reW1I79VUbnPE7gw4zUEjd9KfiuZitJ3gFfRUxnexevplLsY/iKh1WDpEzHALNrxLrftxtdf3LKUnS9ikJaKygpJ2g6lpcw294XG46oabMrgeRKuWVj7atDxbeFon0mD/ACp/sZxu5ruzv+F9LuDVBa2vpaqkcRqQBI0ezX3Lc8HzLg2MAfN2I08zj9QPs/8AlOqiiyaKSx29jmHDRVdiaPZfBsvF9CDw8eCrq3SILjMSTC9l33JgXRRgwDpAx/BS1sGIOmiabGnqj1gFuAJ1HDcV1DLXS9hlaGx4zA+gm3dY0F8Z+I9h8VW1unVqe63XuJcLqEtnsdPRUKKsp66mZUUc8U8Dxdskbg4HzCrqA1jZkkIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIqFbV09FSyVFXNHDBGNp8j3WDR4rjWeulx56yly3eKPcat47bvwNO7xOvcpVrZ1bqWmmvn2NNavCisyZ0/Mua8Iy5FfEqpolIu2Bnakd/Dy7zYLjebOlzEq5z4sKth9Puuwh0rvF24eXtXLq/E56qV8k0j5HvN3Oe4uc495O9Y50pOq6i16PQoe1U9p/t+hVVbupV2WyMrW4tPUTvlkle+R/rPe4ucfEnVY6ScuJuSfFW5cSvFyrXKWyIyiVjKSV8uTvIA71SF3GwuTyCqNp5nbmWHNzg0e9eORlg9HZ+1qqJNtxVb0a3rVELfDacfcF5MUI31JOv1Yf7rzUe4KV0vdVdiD/Om/wCkP1XwRRHUTyf9If8AcmpjYp3K+7R0XsxM4VDP42Ob+q8mJ5HZMb/wSAn2GxTWMASHmvbZnX0NlReHR/tGFv4hZNoFZKZ44l8yqd9axVeGo2XXikLCfYsWDbevQdZZZT2Zi4GeFa17Nirh22ne9u9AA6zoZnOaBs6b2j/n5LDRzubxJCuY5gXXY4sdzBWmdtGW8dgpSjyZ7CcwYhgtUanB6ySlkN9IjoTycwjZcPEeC6xk3pro6h0dJmqFtHMTs+mQg9Se97Tqzx1HeFwuSQuBDyWuP128VYVrGhp6xpI4SN0Pmq64sIVNqi+ZJo3Eo+Vk46Wphq6eOelljmgkG0ySNwc1w5gjQqqoYZKz7jmS6rbw2pEtC515KWYkxP5m31Hd487qTXR50jYLnan2aOQ0+IsbeWilI2xzLTue3vHmAueu+m1Lf2lvH1+5aUriNTbhm6oiKuN4REQBERAEREAREQBERAEREAREQBERAEREAWFzTmXD8tYearEZbE3EcLdXynkB8dwVnnnN1HlXDeuntLVyAiCnvYuPM8mjmox5qzJWY9ic1ZXTGSV+nINHBrRwAVt03pcrp657Q+vwIdzdql7Md5GZz3nrEMy1ZM7+rpmm8VOw9hn/AHHvPlZaPLOXG5JuVTkeSV8DbalddCEKMVCmsJFQ8yeqTyz4ST4JuB5KtBC+cXYA2Mabbt39z4K5ayGDVo2n/bfv8huCZbeEe7ItYaWWbUN2W83aexVzTwxjtgvPevRme86ElVI6OaQBzuyObjYLNU//AKZi5lIvsLMs0brNFvyXi194Hmr1sFOz9pKXHkxt/wA026ZvqxE/id+izUUuEYaiwLCb2C8GLu1WTE7b9iGIfwXX01D9dGDwiC9Gow7otNxVu+EgXDSs+Z3kWsz/AKYXgvDvWhiP8Fl7kKRrzhI3Rr3jxVNz5LWdsuB5rYXR07/WhsebH2/NUJaCFw0e5h++zT2he5RkpmCFRNEew97O5p09i9enO/ewxv8AvAbDvaNPcr+bDJWi8YD282G/uWOmhc24It3LFwjIzUiuyogeRsyGN32ZRb2OGntsq1y2wcCL7u/wWJeBaypxzS0/7J1m79ki7T5LW4NcGawzNg8V6DtAVjYK+N5tL9Efa0+e8K9a7dytdeKWOTxxLuOYgWOreSqkB7Ts9pvEFWTSCd9gvbXlpu0rPKezNbj6FGqpt7o73I3K2pqiahq4qiklkp6iF23HJG4tc13MEahZYObIL3Ad+as62n2gS0WfyWmdLG6M4z7M7/0U9M0WImDCc3PZBWmzIa71WTHgH/Zd37j3Lt6/P0NcS4OsLA32ja/cu0dDfS7Jg74cFzRO6TCvVhq5Dd1Nya48Wd+9vhu52/6UnmpQW/dfb7foWdC5/LMk0i8xSMliZJE9r43gOa5puHA7iDyXpc8TgiIgCIiAIiIAiIgCIiAIiIAiIgCwOc8y0uV8Hkraoh8h7MMN7GR3Lw5lZTFMQpsLw+etrZBHTwtLnuP5DvO5RW6Qc11OZcZlqpiWRDswxXuI2cvE7yeas+mWDu6mZeVc/YiXVx4McLlmNzVmCrxzFJ6ytlL5pTryaOAA4Aclrz37RIX17tonxXxg7l2aShFRjskVCXdn0CwuVeR0+yA+cW4iPj/Fy8N/gvcEQpwHyW64bvuf3/JfGtkqnlsY0GrnHcBzJXkYue/Y8lLB4lnv2WDcLAAWAHJVo6MkB9U4Rt5H1j4Bew6GkFoPpJf8wjj90fFUwZJnHfrv11PiVu2ittjU22VxPFFpTxja+0e079AqtDR4hi1UIaKnnqpz9SNhkd7t3mur9HXRMKqGPEM0NkZEbOjomksc4c3neB3aHnyXZ8MwyiwqlbTYbSw0sDdzImBo929Ud31ylRbjSWp+vb/ZOo2E5rVPZfuR8wXofzFiDWvrzBh8R4TP23/yt09pW74X0KYRCAcRxCrqXcREGxN+J966uipKvWLqp+bC938yT4WNGPbPxNMpOjLKVO23zS2Y85pXv/MrKxZNy3FbYwLDRbnTtP5hZ5FClc1peabfzZvVGmuIr9DCuynl5wscEw0j/wBMz9FZ1GQsrVA+kwKiH4GbH5WWzIsVXqx4k/1PXTg+Ujn9d0SZWqQerp6mmJ4xTk+511qmJ9CLm3dg+MEHgyojt/qb+i7Wik0+p3VPib+e/wBTVK0oy5j/AIIt450c5nwjafJhzqmIfvaX6Qewa+5afPHcmOpiuRoQ8WIP5qaiweYMqYLmBhGK0EM0lrCUDZkHg4aq1t//ACCS2rRz719iJU6cuab/AFIbVOFxyC8Dtk/Zdu8isLVUkkDyJGuHkpFZr6GKmDbny3Veks3+jzkNf5O3HzsuTYph1TQTyUmJ0skUrPWjlaQR/wA5hdBbX1G5X9OWfd3IM6dSi8TRoD22KRTyQW2Ddt77J3f2WfrcJDrvp9Rv2Dv8uawU0LmEgixCkSgmZRmmZKkrI5tDcO4g71e94NxzWskEG+oI4jgr+hrrO6uc79zv1Wl5iZOOeDMB1u5V2vDxZ+/mrUOvu3L006jXzWcZGqUTxV0gffSzhy4rFva5j+ThwWda8PbsuNjwKtqqm2wdBtj3hYVKf5kISxszpPQl0pyZblhwXHpHPwOR2zFK7U0bif8A9Z5cN+66lKx7ZGNexwc1wuHA3BHNQCLNjePb8V3DoF6STh0sOWsen/8AAyHZop5HfsXHdET9k8DwOm61ud6n0/xM1qS37r19/wAfr8ebO3uMexIkciIucJ4REQBERAEREAREQBERAERaj0nZmGWstTSxPArai8VOOIJGrvIe+y2UqUq01ThyzGc1CLlLhHL+m/OPp1ecGoZL0lK76YtOkko+Dd3jfkuNzPLjqVXrpzJI5ziSSb3JurMXcV3tvQjbUlSh2KCU3Uk5y7n1o4ncshBH1DQ91xKRoPsD9fyVGkj06w20PZvz/QK4awzvcSbRt1c7/nFbFHW9+DGUsHyOMz3LjsQt3u+A719mnAZ1MI2Ixra/vPMr5UTh1mRjZjZoAOH6lWU0+w7YZrJfXu/utk5qmss1xi5Mr3DT2rlx4cfPku/dEfRx6DFBjWYIQaw9umpXjSAcHOH2+7h47sD0F5AFUYsyYzFtQtdtUcT/AK7h+9PcDu79eS72uV6r1KU26MH8ft9y1tLVL25BERUBZBERAEREAREQBERAEREAWJzFl3C8xUhp8WpI5hbsv3PZ3tdvCyyLKMpQeqLwzxpSWGRwz50WYjgIkq8KL6/Dm9olrfpIx95o3jvHsC5dW0cdS3tDZk4O5+PNTgsuX9I3RbS4y2WvwFjKXETdz4R2Y5j/ALXd+48ea6Sw648qnc/r9ysuLHHtUv0Il1lG+F+y8W5EbirF7CDuW+4ths1LUS0eIQPimicWvY8Wc0rWq2hdFJoLi1wQukeJrKIUJ9mWVJUuicGOLizgTwWXY8EXWJ2AAdFVgmMRDT6h9y0P2WbGsmVBVUHa0v2huKtWPBA5Ks291tjI1SiU6qASAuAsR6wVrskH3LJNffUbxoRzVCpiGj2eqfd3LTWhp9pHsJdmSQ6COkE49QNwHGJb4rSx/QyvdrUxD/c3jzGvNdeUFcLr6nC8Qp66gldDVU7xJHIPquH5jmFMXo9zVT5wyzT4lAGsn/Z1MIP7KUbx4cR3ELlOqWfhy8aC2fPuf+y2ta2paZcmyoiKoJYREQBERAEREAREQAqL/TBmY47mecQuvSUt4IQDoQD2neZ9wC7p0n478w5PrJ4n7NTMOohI3hzt58hcqJtZLtvJuuk6Dbea4l8F/krL+plqmviy2kdcleoRtOAvv9ypFV6fQF3kuixqeCA9kXzWmRzIo7DhfgBzXqomDWtjh9RuouN/eUdamp7fvHi7u7kFY1UpihMjjd17NvxP6BbJONOOXwjSsyexSq6jq+xHo88vq/3/ACW19E2Tn5uzHHDKHDDqe0tU8adngwHm7d4XK0inY+aYBoc97nWsNSST+amJ0XZVZlPKlPSPY306a01U4cZCPVvyaLDy71Q9RvHThr/M9l7ixt6ClLT27m1QQxwQxxQsbHFG0NYxosGgCwACqIi5MtwiIgCIiAIiIAiIgCIiAIiIAiIgCIiA03pDyJRZtoi6zIMTjbaKotv+6/m33jgoyZgwaqwmunw/FIHRTRGxa73EHiDwPFTNWodIuSqXN2GEANixKFp9HnI/0O5tPu3q56X1R2zVOpvD6f6IN1aKp7cPN9SG9ZSuhf3cCrNze13LcMZwyehq56GvidDPE4scxw1aVrVTAY3EELr5YmtSKyEuzLWKYwkB2rOJ5LNU7qdkZlnftNvZsTD2nn4BYV7biy+05G21rwXBtrtBsSO481pWzwzZJZWxlaqpkmPWuY1nVjsNZuDfsqqwtI1J2H+5eiw1rNmGnFLTC5fJI69x4qjtRNmMcDy+G2jzpc93ct0WpLSaWvQpyxujfYjxW69EmcXZQzPHJPIfmyrIiqm30Av2ZPFv5ErUyOthN/2kY9o/srRtrltlAr0k06c+Gbqc2sSXJPBj2va1zCHNcLgg3BC+rk/yfs3fPOXnYJWSXrsMaBGSdZINzT/D6vs5rrC4y4oyoVHTl2LqnNTipIIiLSZhERAEREARF4mlZDE+WVwbGxpc4ngBvQHAvlA456RjdPhkTgY6OPaeB9t2vuFvaVxiQ3JWfzfib8VxyurZDczyuf5E6e6y15xXf2tH8PQjT9F+/c5+c/Em5+p5JsNN50CyNDGL7ThdkYvY8TwCxzBtTAcGi/mVlZfoadkY9d2p8T/ZS6a2yaqj7FNznTz3GpJsP1WJxOYS1PVxm8cfZHeeJWUkeKajln422GLX4gXOFzqoVzU1z0LhfU20Y4WpnWPk/wCWBjWbRX1Ee1SYaBMbjQyHRg9xd/CFKRc+6DsAGCZBo5JGbNTXn0uS41s71B/KB7Sugrkeo1/FrtLhbL+fEuLaGmGfUIiKASAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIDnHS9kZuYsOOI4dGPnamZuG+dg+r+IcPZxUZq2n2mkEWe3mpwFcA6ccmDDa759w6K1JUvtOxo0jlPHwd+fiuj6J1DS/w1R7dvsVl9b/8AbH5/c4JNHsncrZ4LTtN3hZmuh1uOKxkrbLoasSJCWS5pTJWtjhbK8i/YbfRp52VZjI4opYyDJUk6dW67I9N9+J7liWu2JBbc42KyMc/VysEbdlzG32Xjjc8D5JTk3sJrBdQyEbLx6w3g8V8qWbDtpnqnUFURUSSujlkFzJo51rX09iugNuJ0Z3t7Q8OK9rQ1Rya4vDMpkfMUmVsz0GLRbRZC/ZnYPrxHR49mo7wFM2lniqqaKop3tkhlYHse06OaRcEeSgpfYcpMfJ4zJ855WlweofepwtwDLnUwuuW+w3HkFzfVrfVBVVyufh/+/UsrSph6H3OsIiLniwCIiAIiIAtU6UsROGZGxSVr9iSSPqGHvcbH3XW1rk/yhq7qcAw+jBI66YyHwa23+5S7Cn4tzCPv+m5puZaKUmR3q3kyE8Fa7yqs5u4qjwK7uRRx4LjD4+smBO6+0fBV5XGSUkb72HiV9om7FNJJ5DwXqlYXSA/ZG0fFbpSVOLfoafNIsMwSBrIadp0AuV8yphj8Zx/D8Oj9aqnZD4AmxPsuVZYrL1tdIb+r2V0v5OuGit6QYZ3Nuyigkn8DYMH9RVLKp4dOVV8pNlgo5xBEqIYmQwxxRNDY2NDWgcANAvaBFxpcBERAEREAREQBERAEREAREQBERAEREAREQBERAFZ4xh1Ni2GVNBWs26eoYWPHjxHeN6vEXqbTyg1nZkOc44DPgON1mGVWskL+y+1ttu9rh4j4rT6iOx3KT/T1ln0/Bo8apmXqKLszWGroid/8J9xKjdXxcbb/AM13dhdK8t1N8rZ/EoatPwKmnsYOVtwQVcYdJs7QMTJnFpb2yQWk8R7FTmFiqMb+qqGO4O7JWflZnyjKRs2WgEk23C+g8Arljy3ZeOG9W7SW7N72cTsnnbf+arHZbLsNeHseNHDd4eKkweeTRJHmqYGP7I0Oo+C2/ofzD/h7PmHVEsmxTVJ9EnudNl5ABPg7ZPtWpSdunF97DbyVpfW17crKDWpJ5py4ZtpyaxJdiewRa10b45/iLJWFYi54fM+EMmI/zG9l3vBPmtlXEVIOnJwlyi8i1JZQREWB6EREAXAvlFVm3jmH0oOkVOX2vxc4/wDaF307lGjp4qOtz1UNBv1UUbP9N/irfokdV0n6J/Yh3zxSx6s5fJvK8Aar67evsQu4c1163kVPYv39imiYN7tfaqlORHTSyH6xt5BeKogSNaPqj4L5M7YobH7N1jeyxTx6mFBZkay87cznc3EqQPyXKH6THa4jc2KAHx2nH4KP0Y1UoPkzU/V5PxGfjLWlv8rG/qqW/lptZe/H1LGis1UdfREXKloEREAREQBERAEREAREQBERAEREAREQBERAEREAREQFKqp4qqmlp6hgkhlaWPY7c5pFiFD/ADpgr8Ex7EMMe0jqJCGX4t3tPmCFMVcO+URgmzPQY1EzSQejTEcxctPs2h5BXXQ7nwq/hviX1IN/T1U9a5RHWqbYnRWEwu0hZrE4tl5PA6rDSbyuorRIFKWUX1A9sxYZJ2RANcQHg2ceQ81eysv1cohmY2+05zm6X4W9yw+HTOjkc1oBIO00EX1//qzvVVr4usndMWkAu6x+ljv0XtOWUmYzWGfG6uI4PCsZhZ2nBXEF+oad5bx7l5qW9u43HVeXEeJGMHh4JAfJixkSYbi2DPcdqKRtVEPuuGy73tHtXclEroGxQ4Z0jYcxzrRVjX0rhz2hdv8AqaFLVch1anor6l+ZZ/wXFrLNPHoERFWEkIiIAor9Mspkz9i21va9rfIMapUFRU6Yf/PuMDj1o/oarzoP/Il8P8og9Q/tr4mguVWkbtSsHeqTlcUH7dq6uHmKuXlKtQbzSG/Cy8Yg+1M4DgCvsv7R/iFa4hJeneb8FovuIoW63ZiIjqNFK35OAH/w8eRxrpT7mqJ0btQpXfJteHdHsrQfVrpR/pYfiqbqf/FfxRYW/wDdR1VERcwWQREQBERAEREAREQBERAEREAREQBERAEREAREQBERAFq/SbhPzzkjFKcN2pWR9fH+Jna+BHmtoXx7Q5pa4XadCFnTm6c1NcrcxnFSi4vuQbxOO8N+RstbnFnFdAzjhhwzH8Vw8jSCZ7G+AOnustCqxZxX0KUlUgpruUNLMW4soU7g2qZteq7slZkDa0c577btpxP5rX3u2SHcjdZ6J21b7wuFopvDaN013LlguC3mvjxtMHdokZs4L1b1ged1ImswI/EivgNY7DMaoK5hs6mnjmH8LgfgpxxvbJG17DdrgHDwKgmGjat5KZnR5XuxPI+B1b/XfSRh34gNk+8LmOswzCE/Tb+foWdnLdo2JERUBPCIiAHcotdNMPVZ/wAUGtnOY/XvY1SlKjb0/QdXndz7ACWmjdu8R8Fc9Cli5a9U/wDBCv1/TT95yhyucP8A2wVu/eq1AbTtXXR8xVS8pUk9eTxCxtW+8Lh3LIyevJ5FYmoOjh3kLRerZHtvyzGMduUoPku1XWZWxenv+yrA+34mN/7VFtps5d/+StX7OK43Qk/tYI5wPwuLT/UFVX0ddrP5P90TaTxViSNREXKFoEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERARm6dKH0XP8AUyAdmpijl92yf6VxjEmbMjh3qRXyjqYNxPB6qxu+F8ZP4XA/7io+4w0iUm29d306fiWcH7sfpsUVZaa8kYKYaFZXD5zJTRxgE7VtQNRYX/VY2VuiyWBubG1m1M+EtveRvK6yg8TNk/KX0xk2Gm3ZY7suG433jv3qt+88QqUzWsp2vFR1pBJ2Dfsj7SqX7URHFS1vFojM9ht3XUp+gaoM3R1SMP7ieaL/AFl3+5RhazuUkPk8S7WS6qK/7Otfw5taVzvVVm3fuaJ1o/6h1FERcyWgREQBcJ+UfR7OIYTWAftIXxH+Egj+oruy5j8oGh9IyfT1LRd1NUtJNtzXAj87Kw6XU0XUH67fqRruOqjIjNKNSvtK61Q096+ziziqLDsvBuu24ZTcoyEtm1Em03aBYdL214FYKq0kd4rPVBvKx3Bw+Cwta3Zl8QsbqOYJnlB4Zg5LtldbdvXUPk9Yp839JGHNedllW2SlPi5tx72hc1qWG7TY6GxWTy5WSYXiVLXw3ElLMyZvi1wPwVfp8SEqb7pomN4xL0J7oqNFUx1lHBUwO2oZmNkYeYIuPzVZcW1jZlutwiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIDjvykI74Vgslt00jb+LQfgo3YyO2pL/KN/8ALuF/+pd/QVGvGR2gu16K82a+ZS3f/IfyMDIFcYa0GxeHFjXDaDTY+SoyBXeFW6uS4vruW/OJnr8pebEZEmzFJtOs1ji4WDdd456j2KuRstiHIry0ghpBFiL+K9u3M8VLpvJHnsZONnZUg/k7C2W8TH/5Y/oauAwt7IUgfk+NLctYkSNDV/7Grn+pv+hL5fUmWn9xHVERFzBahERAFr+f8O+dcm4vSAXe6nc9ml+03tD3hbAvhAIsdQeCzhNwkprseSjqTTIQVLe0dFZnRbRnnCzg+Z8ToSLCGdwb3tJu33ELWZBY9y+gRkpxUlwzn0mnh9i9J2qSN/FpWPxFm53Iq9oTtRSxnlcKlOzrISDvsR5hbZrXTaNa9mZgyNokXBBVxSR7JHjdUZG2cCBY3V/StDteKqs4ZMfBKzoJxr50yFTU0j71GHONK++/ZGrD/KQPJdEUb+gTG/mzM5opHWp69ghPISC5YfPtDzCkgFzXUaXh121w9/58yxtZ6qaXpsERFBJAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAcf8AlHvtguEM5zyH2N/uo34v6y798pCpvU4NTB3qskkLfFzQPyKj/ix+kXbdHWmzj8/qUl083DMNJxVXDTIHgRENc+7QT3kX9ypSHeVXotKcjs3duLhcDVbl5zJ+Uykpmpg+jeG7NjbiRxGq+suWRknXS6owBlywts4bxzV0wXljA4ncpkGRpGdgb2RopEdBMQZkuRwvd9XIT5Bo+Cj/AAsUluiWl9GyHht98u3KfN5t7rLmOqS/o49WT7Ne38jcERFzxZhERAEREBH/AOURg/UY1RYoxvYq4urefvs/UEexcZcL3Clr0s4H8+ZIro42bVRTD0mIDeS3ePNt1E2UbL9F2PSK/i2yi+Y7fYpruGiq36lOmf1U7Sd17FXEw2JntHHtBWsreIV0XdZSMkHrMNirik+xEqLuYquiDJXAeq7tDwK94a8Alttd3gFdVcfWU5LdXM1H4SsZFJ1UwN+zfXwVbXhok0SKUtUTcsGlNLWxSxu2HRuDw8DVpBuD7VLPK+LMxzAaTEGCxlZ22/ZcNCPaoh08wMDAwkkHf8V2DoXza2nr/mmrfsxVZHVg7my/+787Kov6Lq09S5iSbeponvwzuKIi58swiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCFEcQASTYBARs6e630rPLoQbtpYY4/A2Lj/UFxrEnXlK3XO2J/OuacVr73bLM9zdfq3s33ALRKx15HL6BbU/BtoQfZI59y11ZS95YTmwKyeHQF8Qs5gG47TgL+1YuXtODeZssjTxsN+sk2bNNrN2r+xa4LMmb5PCLgsBcYzoWm4B3jvCvqNu3Wwt77qwaztxODg4m5sN4HIrLYLH1lfffshSpPTBsjPc2GJmmildlykFBgGG0rRs9TTxsI7w0X96jZlTDnYlmHDaQNuJZ2g/hBufcCpSLkOqTzpj8y0s48sIiKoJwREQBERAfHAEEEXB3gqJPSfl45dzZXUjGFtO53XQG2+N2ot4ajyUt1y/p6y3865bZilOy9Th5JfbeYj63sNj7Va9IufAr6XxLb7ES8pa6eVyiM99F9p39XKWO9R+i+yDZcVSeLjvG5dhnS8lTysF0w9TIQRoAQRzad6xdbT9VM5hsRvB5hZJr+uhDhrIzQ94Xioj9Ip7N1fGLt728l5c09cdS7GNOWiWGU8JqyGujd6w08lmKSpdDKx7Hua9pBa5psQeBHetVa50Uoe3h71lYKkOY1zTodxVZjDySmsol10a5qjzTl+OZ7gK+C0dSz71tHDucNfaOC21RDyFm2oyrj0FdDtSQEbE8IP7WM7x4jeO8d6ljhWIUuK4dT11DM2alnYHxvbxB+Pcue6haeBPVHyv+YLC2ra1pfKLtERV5JCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgC1jpKxgYLkvEqlrtmZ8fURfjf2R7Lk+S2dcI+UNj4lrKPBIX9mAddLY/XcLNHk25/iU3p9v8AiLiMO3L+CNFzU8Om5HFK2S0LnfaJstcnNyVl8Ul+oOCwsh3rt68sLBTUY9ylENqpHILLxBpkf1TrtABBII2uem+ysaGLaY55GpOivthuyxsbDHs2ub39i00UnybajK8Za4bTbLOZaiuZJCONgsBGOy91rFzibLc8Bp+romX37ysrqWilj1NUd5HTehfDfSczS1jm3ZSQkg/edoPdtLuS0bogwo0GVvSZBaWteZf4Bo34nzW8rir2prrP3bF1bx0wQREUQ3BERAEREAXiaJk0T4pWh8b2lrmkXBB3gr2iAiH0lZYflfM9VRWPozj1tO48YydPMajyWoOvdSw6X8pf4oyy51LGHYlR3lg5vH1meYGneAopzsLCbgjxXbdOu/xVFN+ZbP7/ADKS4peFPC4fBSjk6qQPAJG5w5q5PYeDGdHatKtDxVSmkFjDJ6rvUJ4HkrKnLHssjzjnct8Qh2bSsFmO3jkVYQVHUybL9I3e4rOOGjmSC4Is4cxzCwdfTGF54tOoPMKHcUdDyuGbaU8+yzJRTW0JtfiF1Dob6Rf8M1/zbi0pOC1L/WJv6M8/X/CePLfzXF6eocz6NxuPqn4Kv6RYqNKnGrF05rZm5Zi9UeSf0b2yMDmEOa4XDgbgjmvSjT0I9K4wow4BmOf/AOWuIbS1Tz/9OfsOP2OR+r4bpKtcHNBaQQRcEbiuWu7SdrPTLjs/Us6VVVFlH1ERRTaEREAREQBERAEREAREQBERAEREAREKAssbxODB8KqsQq3bMFPGXu5nkB3k2HmofZjxabFsWrMQqnXlmkc93cSdw7hoPJdY6es29fUNy/QvvHA4PqCPrScG/wAO895HJcKxKYMZsArruiWng0nWnzL6f7Ka9q+JPRHhfUxtZKXyOKsH3cQ0byVVlde5X2jZtSF5BsNAp1WWp4PILSi+hYGRtbyCuG7929U2KrHvvyW6nE1yZXo4TUVcUTdxOq6Xl/C5MRr6PD4b7c7wy9tw4nyFz5LUMpUfWSPqXjQaBd56HcFu+oxidmgvBASP5iPcPaqzqlyoLbt9TbbU9bOnUkEdLTRU8LQ2KJgYwDgALBVURchyXIREQBERAEREAREQBR06dck/NWInG8PjtQ1j7SsaNIpT8Hb/ABvzCkWrPFsOpsVw2poa6MS0tQwse08jy7+Kl2V3K1qqa47/AANNeiqsNPchA9tt6pPFxZbf0g5Tqsp47LRThz4D26ee1hKzgfEbj3+IWpOGq7eE41IqcHlMpsOLw+StBL1zdh5+mZuP2gvkzGyROa5un9J5+CtiDcOYbOG4q7jlE40s2Vu8c1vjJTWmRqlHTujW62nMLze5CoCUnRx1581sdTTiZhAFnDhyWCqqUsJNtAoVai6byuCTTqKWz5KTZCDoV2zoa6YZMAEOD5kkfNhGjYag9p9L3Hi5nvHDTRcNcHAr6x9rELTOnCvDw6iyjam4vVHk/RCjqYayliqaWaOanlaHxyRuDmuB4ghVlC3ox6T8WyVUNiiJq8Kc68tFI7Tvcw/VPuPEcVK/Jec8GzjhwqsGqg97QOtp36Swnk5vxGh5rmb3p1S1epbx9fuTqVwqmz2ZsaINUVeSAiIgCIiAIiIAiIgCIiAIiIAtN6Tc4R5VwRxie04lUAtp2H6vN57h7ystm7MlFlnCX1tc651EUQPaldyHxPBRVzZmKszDjE2I10l3vPZA3NA3NHIBW3SunO6nrmvYX7+4hXdz4S0x8zMTiFY+aWWone50jyXEuNySd5PeVrlVMZHklXNfU7RLRuCxc0lu8rras1FaUVtKHdnx93vDG7zvWQhjDGgAaBW9FCQNt3rFX7Ru5qPCLbyzbJ9j0O5Voo3SPZFGLvebAKm0cTuC2nJmGdbM6tmadhmjO88SpE6iowc2acanhG2ZXwSWolosNpG/SykNvbdzce4alSRwuhhw3D6ejpW7MMLA1o+PnvWn9GOXPm+jOJ1bLVdS20YP1I948zv9i3pcTe3Dqzx/Mlxb0tEchERQiQEREAREQBERAEREAREQGt58ynR5uwR9FVAMnZd1PPbWJ/PwO4jkol5iwarwLFanD8RiMVTC7ZcOB5EHiDvBU2FpfSZkWlzhhfZ2YcUhafR5yN/3Hc2n3b1b9L6j+Gl4dTyP9iJdW/iLVHkiGRbevJuHBzDZ43LJ4xhlVhdfNR18D4KmF2y+Nw1af+cVjSLLrOd0Va9GXEUzZ7XOzMPevEsDZhZwDX9+4q2e2/aBs4clXhqdo9XPoeDlujUUlpka5QxujF1NBskixHcVamhdbkea2cgFoDxtN4d3mvApQ4F0ZuLctfMfoo1W3a3gZwrdpGpvY+J2y8EH/m5X+C4xXYPXxVmG1U1LVRm7ZYnFrh3d47jos8+kZIzYqIwWuGn6grG1mAStBfSnrWD6v1h+qjqpjaRvTUjvXR/0+wzNio84w9U/QCup23ae97BqPFt/ALueE4pQ4vRMrMMq4KumeLtkheHA+xfn26N7HEahw3g6LL5dzJi+XK0VOD109HPxMbrB34hud5hV9x0mjW9qk9L/AG/1/NiRC5nDaW6J8oo5ZR+UNMzYhzThzZmjQ1NH2XeJYTY+RHguvZc6SMqZhDW0GM0zZ3fuKg9TJ4Wda/ldUlfp9xQ80dvVbolwuKc+5t6L41wc0OaQQdQRxX1QjcEREAREQBEVnieKUOFQGbEqynpIvtTSBg8r716k28IN45Lxa9nLNmHZVoDPXSbU7gTFTtPakPwHetNzn0uYbh9K6PASKypcNJnNIjb3gGxd+XeuB47jNZjFbLV4jO+WV5u5znXP/O5XVh0epXeustMf3ZAuL2MPZp7syGc801uZ8Tkq6+U7O5jG6NY37LRy/NabX1WhawpW1l7tafNYieYC9zqupzCjBQgsJFbGLm9UhNJYElfKWEyO6x404BeYInSu25PVWSjZZRd5vLJDelYPrAqzW3NrLwAq8TC5zWsBc9xs0DepMI4NMmXeF0MmIVsdNF9Y9o/ZHNd/6NMpMq5I5ZoQMOpTYNP7144d4HH2LXei/I81QA1w2S4B1RNv2BwaO9SAo6aKjpYqenYGQxtDWtHALnOrdQ1vw6b2ROtLfHtyKwFtyIi58sQiIgCIiAIiIAiIgCIiAIiIAiIgNL6Sch0WccPJAZBikTfoKm2/7j+bfy3jvizmHBK7AsRlocTp3wVMZ1a7cRwcDxB5hTaWt53yfhubsN9GxBhZMy5hqWDtxH4jmDoVb9O6pK2/p1N4fQiXFqqntR5+pDJzbErw9gfodDwK2/PGS8UynX9RiMQMTyepqGaxyjuPA9x1WqObYrqoyjVipweUyr3i8PkpRzSU5s7tM71fQyxy2Mbtlw4K1OrO0NFbyQlp2ozY8lsjUcdmeOCkZxkxALZBoTclvE943FXMLmuH0Z2j3HUeW/8ANa9DiEkXZmFxzKvoqmGS2y4AngV7KFOrya8ShwZGqpKaraevha5w+s3QhYKrwVzSTTvDh9l2h9qy7Z5WgBxDxyeLr11sTtHNezvadoewqO7SUfIzNVn3Rp89LJEe0xzT4KjtPbodQtyqKdkvZbUBjuT2lqxsuCTvPYNO8dzwCvVGpHlGaqxfJTwXN+PYJb5qxevpWj6kcztn+U6e5bvhnTpnOkDWzVdLWNH/ANxTNv7W7K0R+Xa23ZpybcQ4EKmcu4jYH0dwHMkLXOhTq+eCfyM1UUfLLHzOx0vyjMXaB6VgmHy8zHK9l/bdZFnykHW7WWm37q3/ANi4azLOJOOrImDm6QBVmZdeLGorYIxybdxWj/1drL/r/d/cz/FSX5ztM3ykJdk9TlyIO4F9YT+TFh6z5Q2Y5zsUWG4ZA47uy+Q/mPyXOIcHw2M9t9RVHkOyPcr2KVlMNmjgipxzaLu9q2Q6TbL8n1Ncryb4bNmrOkDP2MMvW40/DaZ3CJjYiR3WG171r8lT9KZjJPV1R31VU8yP8r3srOaYWc+Vxcb6lx+Cx9RiABOx7VNp0KVFezFL5GiUp1OWX89TskvkeS/md6xVVWF2gNgrGoqy4kkq3HWTGzQbc1jUrpbI2wpd2e5Z76N1K909MXnak9iq09MGanVyu2s7lHw5Pc2tpcHxjAABbRVgEaFVa22rlIjA1SkGNsLlda6Kuj2pxCdtbWRFh0ILhpE3mfvEbgr/AKKeimorDDi+YYzBBo6GBw7R5OI4d11ICjpYaOBsNNG2ONu4NHv8VRdT6qknRov4sl21q37cylhmH0+G0bKakYGRt9rjzPertEXMt53ZZhERAEREAREQBERAEREAREQBERAEREAREQFli+F0WMUEtFidNHU0sgs6N4uPEcj3hR66RuiKuwZ0tdgDZK/Dd5iA2poR4D1h3jXu4qSSKZaX1W0lmD29Oxpq0I1VvyQTfGW7tOCom6ljnvotwfM5kqqcDD8TcL9dE3sSH77ePiLFR8zlkbGsqykYnSn0cmzamK7onefA9xsuqtOo0bpYTxL0f+PUq6tCdLndeppz2Bw1Ct3wFpuw27lfPYQqZCmOPoa1ItWVM8PE27tQriPE+D2g+Gi+FgO9Un07XXuAinOI0xZfNxGJ3rbQPMi6qNq4HfXb7wsK+l+yXNVIwSt3PBHeslXxyjzwl2ZsbZ4+Dx/MvRmZ/mad71rGxOOA9q+HrwfVK9/EI88A2V1RD9ppPeVSNbC3iL9wWu/T/ZKbE54e9eO4R6qHvM3Nibdzb27yrKbEXkWBsO5WQp5TvcAqjaMfXcSsHXk+EZKlFclOSqLjqbleAJZToDbmVfR07G+q0Ks1i1vVLkzylwWUdGNC83PJXjIwALDRVGtVQN8VlGmYuR4DbKo1l/1XsM0JdYALo2QuivGsz9XU1DHYZhbtevmb25B9xh3+JsPFe1alOhHXUeEeRUpvTFZNHwfC6zFa+KiwymlqquT1Yom3PieQ7zopE9GnRHSYGYsRzEIq3FR2mRetFAf9zu86DgOK3rKGUsIynQ+jYPTBhd+0mf2pJTzc74bhyWfXM3/V518wpezH92WFC0UPanuwNAiIqUmhERAEREAREQBERAEREAREQBERAEREAREQBERAEREAXiaKOeJ0czGyRvFnMeAQRyIK9ogOV5x6GMFxYvnwV5wqqOuw1u1C7+H6vkfJcYzP0aZnwAuM+GyVNOP39JeVlu8AbQ8wpdoVaW3V7ijs3qXv+5FqWlOe62ZA98bmuc0ghzdCCLEFeDdTQzJknL2Y9p2LYXBLMf37BsSD+Jtj7VzLH+gGjla52A4zUU7+EdWwStPmLEe9XFHrVCfnTi/1X8+RFlZ1I8bkel8LRyXRcX6G86Yc93U0VNiMY+vSVAv/ACv2StSxLLOO4WbYjguJU3e+ncR7QCPerCnc0avkkn8zTKnOPKMMYwV8Mei9l7GmzntB5E2K+gg7iD4LdpNeSl1dl82BdVtSmymkZKWwvuyvZcxvrPaPEq6w6hq8SkEeG0dVWSHQNp4XSfkF64qKyxnPBaBq9Buu5b/g3RLnHE7E4UKJn2qyVrP9Iufct/wHoCaHNfj+NF4trDRR7Ov43X/IKJV6ha0fNNP4b/Q2xoVZ8I4KGagE6k2A4lb5lPotzNmHYlbR+gUbrf8AiK27Ljm1nrH3DvUjMs5Cy3ltzJMLwuFtS3dUS/SS+O065HlZbQqm4683tQjj3v7EmnY95s53knonwDLbo6moYcTxFp2hPUtGyw/cZuHibnvXRLIioq1apWlqqPLJ0IRgsRWAiItRkEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREBZ1OF4fVbXpNDSzbQsesha648wsLXZBynXBwqcu4W7adtEtp2tJPiLFEWcak4+VtHjinyjE1HRHked+0cAgZpa0UkjB7A5fafokyPA9xGAQSXFrSyPeB4AuRFs/E1uNb/AFZj4cPRGfo8oZcoiDSYDhcThbVtKy+m7WyzMMMcMYZDGyNg3NYAAPIIi1SnKXmeTJJLg92REWJ6EREAREQBERAEREAREQBERAEREAREQBERAf/Z';
    const fix = { 1: ['JE-25-23-5', 'Joint d’étanchéité 25-23-5'], 2: ['DHS-25-3-5', 'Joint DHS 25-3-5'], 3: ['DHS-30-40-11', 'Joint DHS 30-40-11'], 4: ['DHS-25-35-7', 'Joint DHS 25-35-7'],
      5: ['DHS-30-40-7', 'Joint DHS 30-40-7'], 6: ['DHS-25-35-5,7', 'Joint DHS 25-35-5,7'], 7: ['JP-30-35-5/6,7', 'Joint pneumatique 30-35-5/6,7'], 8: ['JP-20-18-5,7', 'Joint pneumatique 20-18-5,7'],
      9: ['JP-25-33-4,7/6', 'Joint pneumatique 25-33-4,7/6'], 10: ['DHS-8-16-6', 'Joint DHS 8-16-6'], 12: ['DHS-6-12-6', 'Joint DHS 6-12-6'], 13: ['DHS-6-14-8', 'Joint DHS 6-14-8'],
      14: ['DHS-8-14-6', 'Joint DHS 8-14-6'], 15: ['DHS-80-70-9', 'Joint DHS 80-70-9'], 16: ['DHS-55-70-13', 'Joint DHS 55-70-13'], 17: ['DHS-60-50-60', 'Joint DHS 60-50-60'] };
    const now = new Date().toISOString();
    Object.entries(fix).forEach(([k, [ref, des]]) => {
      const it = db.items.find(i => i.id === 'i-jpr-' + k); if (!it) return;
      it.values[cName.id] = des; if (cRef) it.values[cRef.id] = ref;
      if (cImg && des.startsWith('Joint DHS') && !it.values[cImg.id]) it.values[cImg.id] = PHOTO;
      it.updatedAt = now;
      db.movements.filter(m => m.itemId === it.id).forEach(m => { m.itemName = des; m.ref = ref; });
    });
    return true;
  } },
  { id: 'photo-joints-etancheite-2026-10-03', run() {
    // Photo ajoutée aux joints d'étanchéité qui n'en ont pas encore (tous les dossiers).
    const PHOTO = 'data:image/jpeg;base64,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';
    const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const now = new Date().toISOString();
    Repo.raw().items.forEach(it => {
      const c = Repo.categories.get(it.categoryId); if (!c) return;
      const img = c.columns.find(x => x.type === 'image'); if (!img || it.values[img.id]) return;
      const txt = c.columns.filter(x => x.role === 'name' || x.type === 'text' || x.type === 'dropdown' || x.type === 'reference').map(x => norm(it.values[x.id])).join(' ');
      if (/joint/.test(txt) && /etanch/.test(txt)) { it.values[img.id] = PHOTO; it.updatedAt = now; }
    });
    return true;
  } },
  { id: 'supprimer-doublons-joints-pieces-2026-10-03', run() {
    // Retire les joints créés une 2e fois (i-jpr2-*) et l'entrée de +18 en double sur le joint 4.10.4. Les Joints DHS (i-jpr-*) restent.
    const db = Repo.raw();
    const dup = db.movements.find(m => m.id === 'm-jpr2-11');
    if (dup) { const it = db.items.find(i => i.id === dup.itemId); const c = it && Repo.categories.get(it.categoryId); const q = c && c.columns.find(x => x.role === 'quantity');
      if (q) { const cur = Number(it.values[q.id]) || 0; it.values[q.id] = cur === dup.next ? dup.prev : Math.max(0, cur - dup.qty); it.updatedAt = new Date().toISOString(); } }
    db.items = db.items.filter(i => !/^i-jpr2-/.test(i.id));
    db.movements = db.movements.filter(m => !/^m-jpr2-/.test(m.id));
    return true;
  } },
  { id: 'machine-tym-w4545-2026-10-05', run() {
    // Fiche de la machine TYM-W4545 (données du fabricant) dans « Machines d'injection ». Complète la fiche si elle existe déjà.
    const db = Repo.raw(); const cat = Repo.categories.get('cmuo1p9p9bbqwt') || Repo.categories.list().find(c => !isFolder(c) && /machines? d.?injection/i.test(c.name));
    if (!cat) return false;
    const by = (re, role) => cat.columns.find(c => re.test(normName(c.name))) || (role ? cat.columns.find(c => c.role === role) : null);
    const notes = ['Fabricant : TYM Silicone Machine Ltd — Guangzhou (Chine) · www.gdtym.com',
      'Type : machine horizontale d’injection silicone liquide (LSR), unité d’injection dynamique (cylindre de mélange et cylindre d’injection séparés)',
      'Force de fermeture : 130 T', 'Passage entre colonnes / plateaux : 450 × 450 mm', 'Volume injectable : 10 / 35 / 70 / 160 / 285 g (sur commande)',
      'Débit d’injection : 150 g/s', 'Pression d’injection : 700 kg/cm²', 'Pression pompe : 20 MPa', 'Puissance moteur : 12 kW',
      'Course d’éjection : 145 mm · force d’éjection : 4 T', 'Encombrement : 4,3 × 1,3 × 2,0 m · poids : 5,2 T',
      'Contact pièces : sales01@gdtym.com · WhatsApp +86 188 1411 5468 (donner le n° de série)'].join('\n');
    const want = [[by(/^reference/, 'reference'), 'TYM-W4545'], [by(/^fabricant/), 'TYM Silicone Machine Ltd (Guangzhou, Chine)'], [by(/^modele/), 'TYM-W4545 · injection LSR horizontale'],
      [by(/^designation/), 'Machine d’injection silicone liquide TYM-W4545'], [by(/^tonnage/), 130], [by(/^notes?$/), notes]];
    const nameCol = cat.columns.find(c => c.role === 'name'); if (nameCol && !want.some(([c]) => c === nameCol)) want.push([nameCol, 'Machine d’injection silicone TYM-W4545']);
    const st = by(/^statut/);
    let it = db.items.find(i => i.categoryId === cat.id && /4545/.test(JSON.stringify(i.values)));
    const now = new Date().toISOString();
    if (!it) { it = { id: 'i-tym-w4545', categoryId: cat.id, createdAt: now, updatedAt: now, values: {}, formType: 'machine' }; if (!db.items.some(i => i.id === it.id)) db.items.push(it); else it = db.items.find(i => i.id === it.id); }
    want.forEach(([c, v]) => { if (c && (it.values[c.id] === undefined || it.values[c.id] === '' || it.values[c.id] === null)) it.values[c.id] = v; });
    if (st && !it.values[st.id]) it.values[st.id] = (st.options || [])[0] || 'En production';
    if (!it.formType) it.formType = 'machine';
    it.updatedAt = now;
    return true;
  } },
  { id: 'moules-injection-silicone-fiches-2026-10-05', run() { return applyMouldFiches('data/fiches-moules-2026-10-05.json', '__fvMoules'); } },
  { id: 'moule-embout-nasal-fiche-2026-10-05', run() { return applyMouldFiches('data/fiche-moule-embout-2026-10-05.json', '__fvEmbout'); } },
  { id: 'moules-injection-plastique-fiches-2026-10-05', run() { return applyMouldFiches('data/fiches-moules-plastique-2026-10-05.json', '__fvPlast', { id: 'c-moule-inj-pla', name: 'Moule injection plastique', code: 'MIP', color: '#D9822B', description: 'Moules d’injection plastique : fiche de vie, photos, pièces et historique de maintenance.' }); } },
  { id: 'retirer-suivi-papier-embout-2026-10-05', run() {
    // Retire le « Suivi des travaux (fiche papier) » de la fiche de vie du moule Embout nasal.
    Repo.categories.list().forEach(c => { if (c.fiche && c.fiche.historique) { delete c.fiche.historique; c.updatedAt = new Date().toISOString(); } });
    return true;
  } },
];
/** Applies pending one-time tasks; returns true when the data changed. */
/** Dossier « Moule injection silicone » (dans Moule) + fiche de vie et photos de chaque moule (fichiers « Fiche de vie moule »). */
function applyMouldFiches(url, key, F = { id: 'c-moule-inj-sil', name: 'Moule injection silicone', code: 'MIS', color: '#1E5FD2', description: 'Moules d’injection silicone : fiche de vie, photos, pièces et historique de maintenance.' }) {
    if (!window[key]) { if (!window[key + 'L']) { window[key + 'L'] = true; fetch(url, { cache: 'no-store' }).then(r => r.json()).then(j => { window[key] = j; if (runDataTasks() && !Modal.top()) render(); }).catch(() => { window[key + 'L'] = false; }); } return false; }
    const db = Repo.raw(); const now = new Date().toISOString();
    const moule = Repo.categories.get('cmuo2ueavi32um') || Repo.categories.list().find(c => isFolder(c) && /^moules?$/i.test(c.name.trim())); if (!moule) return false;
    let folder = Repo.categories.get(F.id);
    if (!folder) { folder = Object.assign({ kind: 'folder', parentId: moule.id, columns: [], createdAt: now, updatedAt: now }, F); db.categories.push(folder); }
    const byName = (re) => Repo.categories.list().find(c => !isFolder(c) && re.test(c.name));
    const NAMES = { EMB: /embout/i, BPM: /BPM|petit mod/i, BGM: /BGM|grand mod/i, CUI: /cuill/i, SUC: /sucette/i, TL: /t[ée]tine large/i, TNF: /natural flow/i, TS: /t[ée]tine souple/i, TPH: /physiolog/i };
    window[key].forEach(r => {
      let cat = (r.cat && Repo.categories.get(r.cat)) || (NAMES[r.code] ? byName(NAMES[r.code]) : null) || Repo.categories.get('c-moule-' + r.code.toLowerCase());
      if (!cat) {
        const model = Repo.categories.get('cmupi8v2ribvcn') || Repo.categories.list().find(c => !isFolder(c) && /moule/i.test(c.name) && isStockCat(c));
        const cols = model ? model.columns.map(c => Object.assign({}, c, { id: c.id + '-' + r.code.toLowerCase() })) : [];
        cat = { id: 'c-moule-' + r.code.toLowerCase(), kind: 'items', parentId: folder.id, name: 'Moule ' + r.fiche.designation, code: r.code, color: '#2E8B57', description: '', columns: cols, createdAt: now, updatedAt: now };
        if (!Repo.categories.get(cat.id)) db.categories.push(cat); else cat = Repo.categories.get(cat.id);
      }
      cat.parentId = folder.id;
      cat.fiche = Object.assign({}, r.fiche, cat.fiche || {});            // ce qui a déjà été saisi dans l'application reste
      if (!cat.fiche.photoProduit && r.fiche.photoProduit) cat.fiche.photoProduit = r.fiche.photoProduit;
      if (!cat.image) cat.image = r.image;
      if (!cat.code || cat.code.length > 4) cat.code = r.code;
      cat.updatedAt = now;
    });
    return true;
}
function runDataTasks() {
  const done = new Set(Repo.raw().settings.tasksDone || []); let changed = false;
  DATA_TASKS.forEach(t => { if (done.has(t.id)) return; try { if (t.run()) { done.add(t.id); changed = true; } } catch (e) { /* retried next start */ } });
  if (changed) { Repo.settings.update({ tasksDone: [...done] }); }
  return changed;
}

/* ======================= 12. BOOT ======================= */
/** Opening screen with the logo: stays at least 1.8 s, leaves once the data is connected (or after 5 s at most). */
const Splash = (() => {
  const t0 = Date.now(); let gone = false;
  function hide(msg) {
    const el = $('#splash'); if (!el || gone) return; gone = true;
    if (msg) { const st = $('#splashStatus'); if (st) st.textContent = msg; }
    const wait = Math.max(0, 1800 - (Date.now() - t0));
    setTimeout(() => { el.classList.add('done'); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 250); }, wait);
  }
  setTimeout(() => hide(), 5000);
  try { if (localStorage.getItem('stockpilot.nosplash') === '1') { const el = $('#splash'); if (el) el.remove(); gone = true; } } catch (e) { /* ignore */ }
  return { hide };
})();
function boot() {
  Repo.init(useFirebase() ? seedEmpty : seedReal); applyTheme(); hydrateIcons(document);
  $$('#mainNav .nav-link, .nav-bottom .nav-link').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  $('#sideAddCategory').addEventListener('click', () => openCategoryForm(null, { kind: 'items', parentId: state.view === 'category' && isFolder(Repo.categories.get(state.catId)) ? state.catId : null }));
  $('#quickMove').addEventListener('click', () => openMovementForm());
  $('#userChip').addEventListener('click', () => go('settings'));
  $('#menuBtn').addEventListener('click', () => $('#app').classList.toggle('nav-open'));
  $('#backBtn').addEventListener('click', goBack);
  $('#scrim').addEventListener('click', () => $('#app').classList.remove('nav-open'));
  initGlobalSearch(); readHash(); render();
  startFirebase().then(() => detectLan()).then(() => Cloud.connect(() => Repo.raw(), (fresh) => { Repo.adopt(fresh); applyTheme(); if (!Modal.top()) render(); else renderNav(); toast('Données mises à jour depuis un autre appareil', 'ok'); })
    .then(remote => { if (remote) { Repo.adopt(remote); applyTheme(); readHash(); } if (runDataTasks() || remote) { if (!Modal.top()) render(); } })
    .finally(() => setTimeout(() => mpReminder(false), 2600))).finally(() => { Splash.hide('Prêt'); askPosteUser(); renderNav(); setTimeout(backupReminder, 4000); });
  setInterval(() => { renderMpBadge(); renderMpBar(); }, 10 * 60 * 1000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

// Public hook for a future backend integration or debugging in the console.
window.StockPilot = { Repo, StorageAdapter, render };
})();
