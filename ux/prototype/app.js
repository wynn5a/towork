/* ============================================================
   Towork — application logic (vanilla JS, state-driven)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- icons (1.5px line icons, Data Buddy style) ---------- */
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z"/>',
    project: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    todo: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
    issue: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"/>',
    ai: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    command: '<path d="M15 6a3 3 0 1 1 3 3h-3V6ZM9 6a3 3 0 1 0-3 3h3V6ZM9 18a3 3 0 1 1-3-3h3v3ZM15 18a3 3 0 1 0 3-3h-3v3Z"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    folderPlus: '<path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/><path d="M12 11v6M9 14h6"/>',
    flag: '<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4 2.1-2.1"/>',
    dot3: '<path d="M5 12h14"/>',
    spinner: '<path d="M21 12a9 9 0 1 1-6.2-8.5"/>',
    ring: '<circle cx="12" cy="12" r="8"/>',
    signal: '<path d="M5 18v-4M12 18v-9M19 18V5"/>',
    priDots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    paperclip: '<path d="M21.4 11.05 12.2 20.3a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.4-2.4l8.5-8.5"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    label: '<path d="M3 8a2 2 0 0 1 2-2h7l9 6-9 6H5a2 2 0 0 1-2-2Z"/><circle cx="8" cy="12" r="1.3"/>'
  };
  function icon(name, size, stroke, fill) {
    size = size || 16;
    var sw = name === 'ai' ? 0 : 1.5;
    var f = fill || (name === 'ai' ? 'currentColor' : 'none');
    var s = name === 'ai' ? 'none' : (stroke || 'currentColor');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + f +
      '" stroke="' + s + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + P[name] + '</svg>';
  }

  /* ---------- enums ---------- */
  var STATUS = {
    open:  { label: 'Open',  hue: 'var(--text-3)' },
    done:  { label: 'Done',  hue: 'var(--green)' }
  };
  var PRIORITY = {
    low:    { label: 'Low',    hue: 'var(--text-3)' },
    medium: { label: 'Medium', hue: 'var(--amber)' },
    high:   { label: 'High',   hue: 'var(--red)' }
  };
  var HUES = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--amber)', 'var(--teal)', 'var(--purple)'];

  /* ---------- state ---------- */
  var STORE_KEY = 'towork.state.v3';
  var state = null;
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var now = function () { return Date.now(); };

  function seed() {
    var t = now();
    var H = 3600e3, D = 24 * H;
    return {
      workspace: 'wmai-top',
      projects: [
        {
          id: 'p1', name: 'Towork Core', prefix: 'TOW', hue: 'var(--accent)',
          desc: 'The desktop task app itself — local-first storage, MCP server, and the project/todo/issue model.',
          createdAt: t - 14 * D, updatedAt: t - 22 * 60e3, seq: 6,
          items: [
            { id: 'i1', seq: 1, type: 'issue', title: 'MCP write tool drops priority field', desc: 'When Claude updates an item over MCP the priority resets to "low" — the mutation payload is missing the field on the server side.', status: 'open', priority: 'high', assignee: 'ai', working: true, createdAt: t - 2 * D, updatedAt: t - 22 * 60e3 },
            { id: 'i2', seq: 2, type: 'todo', title: 'Add keyboard shortcut for "complete item"', desc: 'Pressing ⌘↵ on a focused card should toggle done without opening the editor.', status: 'open', priority: 'medium', assignee: 'user', createdAt: t - 3 * D, updatedAt: t - 5 * H },
            { id: 'i3', seq: 3, type: 'todo', title: 'Write MCP tool descriptions for read endpoints', desc: 'list_projects, get_project, search_items — each needs a clear description so the model picks the right tool.', status: 'done', priority: 'medium', assignee: 'ai', createdAt: t - 6 * D, updatedAt: t - 1 * D },
            { id: 'i4', seq: 4, type: 'issue', title: 'Sidebar project count lags after delete', desc: 'Badge stays at the old number until a manual refresh.', status: 'done', priority: 'low', assignee: 'user', createdAt: t - 8 * D, updatedAt: t - 2 * D },
            { id: 'i5', seq: 5, type: 'todo', title: 'Persist window size & position on quit', desc: '', status: 'open', priority: 'low', assignee: 'user', createdAt: t - 1 * D, updatedAt: t - 1 * D },
            { id: 'i6', seq: 6, type: 'todo', title: 'Draft the activity-feed data model', desc: 'Every mutation should record actor, action, target and timestamp.', status: 'open', priority: 'medium', assignee: 'ai', createdAt: t - 4 * H, updatedAt: t - 4 * H }
          ],
          activity: [
            { id: 'a1', actor: 'ai', action: 'started working on', target: 'MCP write tool drops priority field', ts: t - 22 * 60e3 },
            { id: 'a2', actor: 'ai', action: 'created', target: 'Draft the activity-feed data model', ts: t - 4 * H },
            { id: 'a3', actor: 'user', action: 'completed', target: 'Sidebar project count lags after delete', ts: t - 2 * D },
            { id: 'a4', actor: 'ai', action: 'completed', target: 'Write MCP tool descriptions for read endpoints', ts: t - 1 * D },
            { id: 'a5', actor: 'user', action: 'created the project', target: '', ts: t - 14 * D }
          ]
        },
        {
          id: 'p2', name: 'Personal Site', prefix: 'WEB', hue: 'var(--teal)',
          desc: 'Static portfolio + writing. Migrating from the old template to a clean hand-rolled build.',
          createdAt: t - 30 * D, updatedAt: t - 3 * D, seq: 3,
          items: [
            { id: 'i7', seq: 1, type: 'todo', title: 'Rewrite the about page copy', desc: 'Shorter, less buzzwordy. One paragraph + a list of what I build.', status: 'open', priority: 'medium', assignee: 'user', createdAt: t - 5 * D, updatedAt: t - 3 * D },
            { id: 'i8', seq: 2, type: 'todo', title: 'Generate OG images for each post', desc: 'Have Claude template these from the post title + date.', status: 'open', priority: 'low', assignee: 'ai', createdAt: t - 4 * D, updatedAt: t - 4 * D },
            { id: 'i9', seq: 3, type: 'issue', title: 'Dark-mode flash on first paint', desc: 'Theme class applies after hydration; need it inline in the head.', status: 'done', priority: 'high', assignee: 'user', createdAt: t - 10 * D, updatedAt: t - 7 * D }
          ],
          activity: [
            { id: 'a6', actor: 'ai', action: 'created', target: 'Generate OG images for each post', ts: t - 4 * D },
            { id: 'a7', actor: 'user', action: 'completed', target: 'Dark-mode flash on first paint', ts: t - 7 * D },
            { id: 'a8', actor: 'user', action: 'created the project', target: '', ts: t - 30 * D }
          ]
        },
        {
          id: 'p3', name: 'MCP Server', prefix: 'MCP', hue: 'var(--amber)',
          desc: 'Standalone reference server exposing the Towork model over the Model Context Protocol.',
          createdAt: t - 20 * D, updatedAt: t - 6 * H, seq: 2,
          items: [
            { id: 'i10', seq: 1, type: 'issue', title: 'Auth token leaks into debug logs', desc: 'Redact the bearer token before logging the request line.', status: 'open', priority: 'high', assignee: 'ai', createdAt: t - 1 * D, updatedAt: t - 6 * H },
            { id: 'i11', seq: 2, type: 'todo', title: 'Publish v0.2 to the registry', desc: '', status: 'open', priority: 'medium', assignee: 'user', createdAt: t - 2 * D, updatedAt: t - 2 * D }
          ],
          activity: [
            { id: 'a9', actor: 'ai', action: 'started working on', target: 'Auth token leaks into debug logs', ts: t - 6 * H },
            { id: 'a10', actor: 'user', action: 'created the project', target: '', ts: t - 20 * D }
          ]
        }
      ],
      ui: { view: 'todos', projectId: null, tab: 'todos', search: '' }
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { state = JSON.parse(raw); if (!state.ui) state.ui = { view: 'todos', tab: 'todos', search: '' }; return; }
    } catch (e) {}
    state = seed();
    save();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- helpers ---------- */
  function proj(id) { return state.projects.find(function (p) { return p.id === id; }); }
  function activeProj() { return proj(state.ui.projectId); }
  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function relTime(ts) {
    var s = Math.floor((now() - ts) / 1000);
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24); if (d < 7) return d + 'd ago';
    var w = Math.floor(d / 7); if (w < 5) return w + 'w ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function counts(p) {
    var open = 0, done = 0, ai = 0;
    p.items.forEach(function (it) { if (it.status === 'done') done++; else open++; if (it.assignee === 'ai') ai++; });
    return { open: open, done: done, ai: ai, total: p.items.length };
  }

  function avatar(assignee, size) {
    var cls = 'avatar ' + assignee + (size ? ' ' + size : '');
    if (assignee === 'ai') return '<span class="' + cls + '">' + icon('ai', size === 'lg' ? 17 : 13) + '</span>';
    return '<span class="' + cls + '">XF</span>';
  }
  function statusPill(s) {
    var d = STATUS[s];
    return '<span class="pill" style="background:color-mix(in srgb,' + d.hue + ' 14%,transparent);color:' + d.hue + '">' +
      '<span class="pdot" style="background:' + d.hue + '"></span>' + d.label + '</span>';
  }
  function priorityPill(pr) {
    var d = PRIORITY[pr];
    return '<span class="pill" style="background:color-mix(in srgb,' + d.hue + ' 14%,transparent);color:' + d.hue + '">' +
      '<span class="pdot" style="background:' + d.hue + '"></span>' + d.label + '</span>';
  }

  /* ============================================================
     RENDER
  ============================================================ */
  function render() {
    renderSidebar();
    var main = document.getElementById('main-scroll');
    var v = state.ui.view;
    if (v === 'project' && activeProj()) main.innerHTML = viewProject(activeProj());
    else if (v === 'search') main.innerHTML = viewSearch();
    else if (v === 'home') main.innerHTML = viewHome();
    else main.innerHTML = viewTodos();
    var inner = main.querySelector('.view-pad, .search-hero');
    if (inner) inner.classList.add('fade-in');
    wireMain();
    save();
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    var list = document.getElementById('proj-list');
    list.innerHTML = state.projects.map(function (p) {
      var c = counts(p);
      var active = state.ui.view === 'project' && state.ui.projectId === p.id;
      return '<div class="proj-row' + (active ? ' active' : '') + '" data-proj="' + p.id + '">' +
        '<span class="pr-glyph" style="background:color-mix(in srgb,' + p.hue + ' 22%,var(--bg-elevated));color:' + p.hue + '">' + icon('project', 11) + '</span>' +
        '<span class="pr-name">' + esc(p.name) + '</span>' +
        '<span class="count">' + c.open + '</span></div>';
    }).join('');
    // nav active states
    document.querySelectorAll('.side-nav .nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.nav === state.ui.view || (state.ui.view === 'home' && n.dataset.nav === 'home') || (state.ui.view === 'search' && n.dataset.nav === 'search'));
    });
  }

  /* ---------- all-todos home ---------- */
  var quickAddProjId = null;
  function quickAddProj() {
    var p = quickAddProjId ? proj(quickAddProjId) : null;
    if (!p) p = state.projects[0] || null;
    quickAddProjId = p ? p.id : null;
    return p;
  }

  function viewTodos() {
    var rows = [];
    state.projects.forEach(function (p) {
      p.items.forEach(function (it) { if (it.type === 'todo') rows.push({ p: p, it: it }); });
    });
    var open = rows.filter(function (r) { return r.it.status !== 'done'; });
    var done = rows.filter(function (r) { return r.it.status === 'done'; });
    var aiCount = open.filter(function (r) { return r.it.assignee === 'ai'; }).length;

    var head =
      '<div class="page-head"><div class="ph-text">' +
        '<h1 class="page-title">Todos</h1>' +
        '<p class="page-sub">' + open.length + ' open · ' + done.length + ' done' +
          (aiCount ? ' · <span style="color:var(--purple)">' + aiCount + ' assigned to Claude</span>' : '') + '</p>' +
      '</div></div>';

    if (!state.projects.length) {
      return '<div class="view-pad">' + head +
        '<div class="empty"><span class="em-ic">' + icon('todo', 24) + '</span>' +
        '<h4>No projects yet</h4><p>Create a project first, then add todos to it here.</p>' +
        '<button class="btn-chip" data-act="new-project">' + icon('plus', 13) + 'Create a project</button></div></div>';
    }

    var qp = quickAddProj();
    var quickAdd =
      '<div class="quick-add" id="quick-add">' +
        '<span class="qa-ring"></span>' +
        '<input id="qa-input" placeholder="Add a todo\u2026 press Enter to save" autocomplete="off" />' +
        '<button class="prop-pill qa-proj" id="qa-proj" title="Choose project">' +
          '<span class="pr-glyph" style="background:color-mix(in srgb,' + qp.hue + ' 22%,var(--bg-elevated));color:' + qp.hue + '">' + icon('project', 11) + '</span>' +
          '<span>' + esc(qp.name) + '</span>' + icon('chevDown', 13) +
        '</button>' +
      '</div>';

    var body;
    if (!rows.length) {
      body = '<div class="empty"><span class="em-ic">' + icon('todo', 24) + '</span>' +
        '<h4>No todos yet</h4><p>Type above and press Enter to add your first todo.</p></div>';
    } else {
      body = '';
      if (open.length) body += '<div class="section-label">Open <span class="count">' + open.length + '</span></div><div class="item-list">' + open.map(searchCard).join('') + '</div>';
      if (done.length) body += '<div class="section-label">Done <span class="count">' + done.length + '</span></div><div class="item-list">' + done.map(searchCard).join('') + '</div>';
    }
    return '<div class="view-pad">' + head + quickAdd + body + '</div>';
  }

  function addQuickTodo(title) {
    title = (title || '').trim();
    if (!title) return;
    var p = quickAddProj();
    if (!p) return;
    p.seq += 1;
    var ni = { id: uid(), seq: p.seq, type: 'todo', title: title, desc: '',
      status: 'open', priority: 'medium', assignee: 'user', createdAt: now(), updatedAt: now() };
    p.items.push(ni);
    p.updatedAt = now();
    logActivity(p, 'user', 'created', ni.title);
    render();
    var qi = document.getElementById('qa-input');
    if (qi) qi.focus();
    toast('Todo added', p.prefix + '-' + ni.seq + ' \u00b7 ' + ni.title, 'green');
  }

  function openQuickProjMenu(anchor) {
    closeMenu();
    menuEl = document.getElementById('ctx-menu');
    menuEl.innerHTML = state.projects.map(function (p) {
      var sel = quickAddProjId === p.id;
      return '<div class="mi" data-pid="' + p.id + '">' +
        '<span class="pr-glyph" style="width:18px;height:18px;border-radius:5px;display:grid;place-items:center;background:color-mix(in srgb,' + p.hue + ' 22%,var(--bg-elevated));color:' + p.hue + '">' + icon('project', 11) + '</span>' +
        '<span style="flex:1">' + esc(p.name) + '</span>' + (sel ? icon('check', 14) : '') + '</div>';
    }).join('');
    var r = anchor.getBoundingClientRect();
    menuEl.style.width = '200px';
    menuEl.style.top = (r.bottom + 6) + 'px';
    menuEl.style.left = Math.max(12, r.right - 200) + 'px';
    menuEl.classList.add('open');
    menuEl.querySelectorAll('.mi').forEach(function (mi) {
      mi.onclick = function () { quickAddProjId = mi.dataset.pid; closeMenu(); render(); var qi = document.getElementById('qa-input'); if (qi) qi.focus(); };
    });
  }

  /* ---------- home ---------- */
  function viewHome() {
    var total = state.projects.reduce(function (a, p) { return a + p.items.length; }, 0);
    var aiTotal = state.projects.reduce(function (a, p) { return a + counts(p).ai; }, 0);
    var head =
      '<div class="page-head"><div class="ph-text">' +
        '<h1 class="page-title">Projects</h1>' +
        '<p class="page-sub">' + state.projects.length + ' projects · ' + total + ' items · <span style="color:var(--purple)">' + aiTotal + ' assigned to Claude</span></p>' +
      '</div><div class="ph-actions">' +
        '<button class="btn-primary" data-act="new-project">' + icon('plus', 14, '#fff') + 'New project</button>' +
      '</div></div>';

    if (!state.projects.length) {
      return '<div class="view-pad">' + head +
        '<div class="empty"><span class="em-ic">' + icon('project', 24) + '</span>' +
        '<h4>No projects yet</h4><p>Create a project to start tracking todos and issues — and let Claude pick them up over MCP.</p>' +
        '<button class="btn-chip" data-act="new-project">' + icon('plus', 13) + 'Create your first project</button></div></div>';
    }

    var cards = state.projects.map(function (p) {
      var c = counts(p);
      return '<div class="proj-card" data-proj="' + p.id + '">' +
        '<div class="proj-card-head">' +
          '<span class="proj-glyph" style="background:color-mix(in srgb,' + p.hue + ' 20%,var(--bg-elevated));color:' + p.hue + '">' + icon('project', 16) + '</span>' +
          '<h3>' + esc(p.name) + '</h3>' +
          (c.ai ? '<span class="ai-flag">' + icon('ai', 11) + c.ai + '</span>' : '') +
        '</div>' +
        '<p class="pc-desc">' + esc(p.desc || 'No description.') + '</p>' +
        '<div class="proj-card-foot"><div class="pcf-counts">' +
          '<span class="pcf-stat"><span class="num">' + c.open + '</span> open</span>' +
          '<span class="pcf-stat"><span class="num">' + c.done + '</span> done</span>' +
        '</div><span class="pcf-time">' + relTime(p.updatedAt) + '</span></div>' +
      '</div>';
    }).join('');
    return '<div class="view-pad">' + head + '<div class="proj-grid">' + cards + '</div></div>';
  }

  /* ---------- project detail ---------- */
  function viewProject(p) {
    var c = counts(p);
    var todos = p.items.filter(function (i) { return i.type === 'todo'; });
    var issues = p.items.filter(function (i) { return i.type === 'issue'; });
    var head =
      '<div class="page-head"><div class="ph-text">' +
        '<h1 class="page-title">' + esc(p.name) + '</h1>' +
        (p.desc ? '<p class="page-sub">' + esc(p.desc) + '</p>' : '') +
      '</div><div class="ph-actions">' +
        '<button class="icon-btn" data-act="proj-menu" title="More">' + icon('more', 16) + '</button>' +
      '</div></div>';

    var tabs =
      '<div class="tabbar">' +
        tab('todos', 'Todos', todos.length) +
        tab('issues', 'Issues', issues.length) +
        '<button class="tab' + (state.ui.tab === 'activity' ? ' active' : '') + '" data-tab="activity">' + icon('activity', 15) + 'Activity</button>' +
      '</div>';

    var body;
    if (state.ui.tab === 'activity') body = activityList(p);
    else {
      var type = state.ui.tab === 'issues' ? 'issue' : 'todo';
      var items = state.ui.tab === 'issues' ? issues : todos;
      var label = type === 'issue' ? 'New issue' : 'New todo';
      var bar = '<div class="page-head" style="margin-bottom:16px"><div class="ph-text"></div><div class="ph-actions">' +
        '<button class="btn-secondary" data-act="new-item" data-type="' + type + '">' + icon('plus', 14) + label + '</button></div></div>';
      body = bar + itemList(items, type);
    }
    return '<div class="view-pad">' + head + tabs + body + '</div>';
  }
  function tab(id, label, n) {
    return '<button class="tab' + (state.ui.tab === id ? ' active' : '') + '" data-tab="' + id + '">' +
      icon(id === 'issues' ? 'issue' : 'todo', 15) + label + '<span class="count">' + n + '</span></button>';
  }

  function itemList(items, type) {
    if (!items.length) {
      return '<div class="empty"><span class="em-ic">' + icon(type === 'issue' ? 'issue' : 'todo', 24) + '</span>' +
        '<h4>No ' + (type === 'issue' ? 'issues' : 'todos') + ' yet</h4>' +
        '<p>' + (type === 'issue' ? 'Track bugs and problems here.' : 'Break the work into todos.') + ' Claude can create and complete them too.</p>' +
        '<button class="btn-chip" data-act="new-item" data-type="' + type + '">' + icon('plus', 13) + 'New ' + type + '</button></div>';
    }
    var open = items.filter(function (i) { return i.status !== 'done'; });
    var done = items.filter(function (i) { return i.status === 'done'; });
    var html = '';
    if (open.length) html += '<div class="section-label">Open <span class="count">' + open.length + '</span></div><div class="item-list">' + open.map(itemCard).join('') + '</div>';
    if (done.length) html += '<div class="section-label">Done <span class="count">' + done.length + '</span></div><div class="item-list">' + done.map(itemCard).join('') + '</div>';
    return html;
  }

  function priIcon(pr) { return icon('signal', 14, PRIORITY[pr].hue); }

  function itemCard(it) {
    var p = activeProj();
    var isAI = it.assignee === 'ai';
    var cls = 'item-row' + (it.status === 'done' ? ' done' : '');
    var right = (isAI && it.working && it.status !== 'done')
      ? '<span class="ai-working">' + icon('spinner', 11) + 'Claude</span>'
      : avatar(it.assignee, 'sm');
    return '<div class="' + cls + '" data-item="' + it.id + '">' +
      '<button class="item-check" data-act="toggle" data-item="' + it.id + '" title="Toggle done">' + icon('check', 11, '#08130b') + '</button>' +
      '<span class="row-pri" title="' + PRIORITY[it.priority].label + ' priority">' + priIcon(it.priority) + '</span>' +
      '<span class="item-id">' + p.prefix + '-' + it.seq + '</span>' +
      '<span class="item-title">' + esc(it.title) + '</span>' +
      '<span class="row-right">' + right + '</span>' +
    '</div>';
  }

  function activityList(p) {
    var ev = p.activity.slice().sort(function (a, b) { return b.ts - a.ts; });
    if (!ev.length) return '<div class="empty"><span class="em-ic">' + icon('activity', 24) + '</span><h4>No activity</h4><p>Mutations from you and Claude will appear here.</p></div>';
    return '<div class="timeline">' + ev.map(function (e) {
      var actorName = e.actor === 'ai' ? 'Claude' : 'You';
      var aCls = e.actor === 'ai' ? 'actor-ai' : 'actor-user';
      var text = '<span class="' + aCls + '">' + actorName + '</span> ' + esc(e.action) +
        (e.target ? ' <span class="tl-target">' + esc(e.target) + '</span>' : '');
      return '<div class="tl-entry"><span class="tl-avatar">' + avatar(e.actor, 'sm') + '</span>' +
        '<div class="tl-content"><div class="tl-text">' + text + '</div>' +
        '<div class="tl-time">' + relTime(e.ts) + '</div></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- search ---------- */
  function viewSearch() {
    var q = (state.ui.search || '').trim().toLowerCase();
    var all = [];
    state.projects.forEach(function (p) {
      p.items.forEach(function (it) { all.push({ p: p, it: it }); });
    });
    var matched = q ? all.filter(function (r) {
      return r.it.title.toLowerCase().indexOf(q) >= 0 || (r.it.desc || '').toLowerCase().indexOf(q) >= 0;
    }) : [];
    var todos = matched.filter(function (r) { return r.it.type === 'todo'; });
    var issues = matched.filter(function (r) { return r.it.type === 'issue'; });

    var hero =
      '<div class="search-big" id="search-big">' + icon('search', 18, 'var(--text-3)') +
        '<input id="search-input" placeholder="Search todos and issues across all projects…" value="' + esc(state.ui.search || '') + '" />' +
        '<button class="icon-btn clear' + (q ? ' show' : '') + '" id="search-clear" title="Clear">' + icon('x', 14) + '</button>' +
      '</div>';

    var results;
    if (!q) {
      results = '<div class="empty" style="padding-top:48px"><span class="em-ic">' + icon('search', 24) + '</span><h4>Search everything</h4><p>Find any todo or issue by title or description across every project.</p></div>';
    } else if (!matched.length) {
      results = '<div class="empty" style="padding-top:48px"><span class="em-ic">' + icon('search', 24) + '</span><h4>No matches for “' + esc(state.ui.search) + '”</h4><p>Try a different keyword.</p></div>';
    } else {
      results = '<div class="search-summary">' + matched.length + ' result' + (matched.length === 1 ? '' : 's') + '</div>';
      if (todos.length) results += '<div class="section-label">Todos <span class="count">' + todos.length + '</span></div><div class="item-list">' + todos.map(searchCard).join('') + '</div>';
      if (issues.length) results += '<div class="section-label">Issues <span class="count">' + issues.length + '</span></div><div class="item-list">' + issues.map(searchCard).join('') + '</div>';
    }
    return '<div class="view-pad"><div class="search-hero">' + hero + results + '</div></div>';
  }
  function searchCard(r) {
    var it = r.it, p = r.p;
    var cls = 'item-row' + (it.status === 'done' ? ' done' : '');
    return '<div class="' + cls + '" data-item="' + it.id + '" data-proj="' + p.id + '">' +
      '<button class="item-check" data-act="toggle" data-item="' + it.id + '" data-proj="' + p.id + '">' + icon('check', 11, '#08130b') + '</button>' +
      '<span class="row-pri" title="' + PRIORITY[it.priority].label + ' priority">' + priIcon(it.priority) + '</span>' +
      '<span class="item-id">' + p.prefix + '-' + it.seq + '</span>' +
      '<span class="item-title">' + esc(it.title) + '</span>' +
      '<span class="search-result-proj">' + esc(p.name) + '</span>' +
      '<span class="row-right">' + avatar(it.assignee, 'sm') + '</span>' +
    '</div>';
  }

  /* ============================================================
     NAVIGATION
  ============================================================ */
  function go(view, opts) {
    opts = opts || {};
    state.ui.view = view;
    if (opts.projectId !== undefined) state.ui.projectId = opts.projectId;
    if (opts.tab) state.ui.tab = opts.tab;
    render();
    document.getElementById('main-scroll').scrollTop = 0;
  }
  function openProject(id) { go('project', { projectId: id, tab: state.ui.tab || 'todos' }); }

  /* ============================================================
     INTERACTIONS
  ============================================================ */
  function wireMain() {
    var main = document.getElementById('main-scroll');

    main.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { state.ui.tab = b.dataset.tab; render(); };
    });
    main.querySelectorAll('.proj-card[data-proj]').forEach(function (c) {
      c.onclick = function () { openProject(c.dataset.proj); };
    });
    main.querySelectorAll('[data-act="new-project"]').forEach(function (b) {
      b.onclick = function () { openProjectModal(null); };
    });
    main.querySelectorAll('[data-act="new-item"]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openItemModal(null, b.dataset.type); };
    });
    main.querySelectorAll('[data-act="proj-menu"]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openProjMenu(b); };
    });
    // item checks
    main.querySelectorAll('.item-check').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); toggleDone(b.dataset.item, b.dataset.proj); };
    });
    // item card -> edit
    main.querySelectorAll('.item-row[data-item]').forEach(function (c) {
      c.onclick = function () { openItemModal(c.dataset.item, null, c.dataset.proj); };
    });

    // quick-add todo
    var qa = document.getElementById('qa-input');
    if (qa) {
      var qaWrap = document.getElementById('quick-add');
      qa.onfocus = function () { qaWrap.classList.add('focus'); };
      qa.onblur = function () { qaWrap.classList.remove('focus'); };
      qa.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = qa.value; qa.value = ''; addQuickTodo(v); } };
    }
    var qaProj = document.getElementById('qa-proj');
    if (qaProj) qaProj.onclick = function (e) { e.stopPropagation(); openQuickProjMenu(qaProj); };

    // search
    var si = document.getElementById('search-input');
    if (si) {
      var big = document.getElementById('search-big');
      si.oninput = function () {
        state.ui.search = si.value;
        var pos = si.selectionStart;
        renderSearchResultsOnly();
        var ni = document.getElementById('search-input');
        ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) {}
      };
      si.onfocus = function () { big.classList.add('focus'); };
      si.onblur = function () { big.classList.remove('focus'); };
      var clr = document.getElementById('search-clear');
      if (clr) clr.onclick = function () { state.ui.search = ''; render(); setTimeout(function () { var x = document.getElementById('search-input'); if (x) x.focus(); }, 0); };
      si.focus(); var L = si.value.length; try { si.setSelectionRange(L, L); } catch (e) {}
    }
  }
  // lightweight re-render of just the search results (keeps input focus stable)
  function renderSearchResultsOnly() {
    var main = document.getElementById('main-scroll');
    main.innerHTML = viewSearch();
    wireMain();
    save();
  }

  function toggleDone(itemId, projId) {
    var p = projId ? proj(projId) : activeProj();
    var it = p.items.find(function (x) { return x.id === itemId; });
    if (!it) return;
    it.status = it.status === 'done' ? 'open' : 'done';
    if (it.status === 'done') it.working = false;
    it.updatedAt = now(); p.updatedAt = now();
    logActivity(p, 'user', it.status === 'done' ? 'completed' : 'reopened', it.title);
    render();
    toast(it.status === 'done' ? 'Marked done' : 'Reopened', p.prefix + '-' + it.seq + ' · ' + it.title, 'green');
  }

  function logActivity(p, actor, action, target) {
    p.activity.unshift({ id: uid(), actor: actor, action: action, target: target, ts: now() });
    if (p.activity.length > 40) p.activity.pop();
  }

  /* ============================================================
     MODALS
  ============================================================ */
  var overlay = null, editing = null, draft = null;

  function closeModal() {
    if (overlay) { overlay.classList.remove('open'); overlay.innerHTML = ''; }
    editing = null; draft = null;
  }

  function openItemModal(itemId, type, projId) {
    var p = projId ? proj(projId) : activeProj();
    if (!p) return;
    var it = itemId ? p.items.find(function (x) { return x.id === itemId; }) : null;
    editing = { kind: 'item', projId: p.id, itemId: itemId };
    draft = it
      ? { type: it.type, title: it.title, desc: it.desc || '', status: it.status, priority: it.priority, assignee: it.assignee }
      : { type: type || 'todo', title: '', desc: '', status: 'open', priority: 'medium', assignee: 'user' };
    renderItemModal(p, it);
  }

  var createMore = false;

  // lead glyph for a property pill
  function propLead(key) {
    if (key === 'status') return icon('ring', 14, STATUS[draft.status].hue);
    if (key === 'priority') return icon('signal', 14, PRIORITY[draft.priority].hue);
    return avatar(draft.assignee, 'xs');
  }
  function propLabel(key) {
    if (key === 'status') return STATUS[draft.status].label;
    if (key === 'priority') return PRIORITY[draft.priority].label;
    return draft.assignee === 'ai' ? 'Claude' : 'You';
  }
  function propPill(key) {
    return '<button class="prop-pill" data-prop="' + key + '">' + propLead(key) +
      '<span>' + propLabel(key) + '</span></button>';
  }

  function renderItemModal(p, it) {
    var crumb = it ? (p.prefix + '-' + it.seq) : ('New ' + draft.type);
    var html =
      '<div class="dialog issue-dialog" role="dialog" aria-modal="true">' +
        '<div class="idlg-head">' +
          '<span class="idlg-crumb"><span class="idlg-badge">' + icon('project', 11, '#fff') + '</span>' + esc(p.prefix) + '</span>' +
          '<span class="idlg-arrow">' + icon('chevron', 13) + '</span>' +
          '<span class="idlg-context">' + esc(crumb) + '</span>' +
          '<div class="idlg-head-actions">' +
            '<button class="icon-btn" data-x title="Close">' + icon('x', 16) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="idlg-body">' +
          '<input class="idlg-title" id="f-title" placeholder="' + (draft.type === 'issue' ? 'Issue title' : 'Todo title') + '" value="' + esc(draft.title) + '" autocomplete="off" />' +
          '<textarea class="idlg-desc" id="f-desc" placeholder="Add description…">' + esc(draft.desc) + '</textarea>' +
        '</div>' +
        '<div class="idlg-props">' +
          propPill('status') + propPill('priority') + propPill('assignee') +
          (it ? '<button class="prop-pill danger" data-del-item title="Delete">' + icon('trash', 14) + '</button>' : '') +
        '</div>' +
        '<div class="idlg-foot">' +
          '<button class="idlg-attach" title="Attach">' + icon('paperclip', 15) + '</button>' +
          '<div class="idlg-foot-right">' +
            (it ? '' : '<button class="create-more" id="f-more"><span class="toggle' + (createMore ? ' on' : '') + '"></span>Create more</button>') +
            '<button class="btn-primary" id="f-save" ' + (draft.title.trim() ? '' : 'disabled') + '>' + (it ? 'Save changes' : (draft.type === 'issue' ? 'Create issue' : 'Create todo')) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    showOverlay(html);
    wireItemModal(p, it);
  }

  function wireItemModal(p, it) {
    var titleEl = document.getElementById('f-title');
    var saveBtn = document.getElementById('f-save');
    titleEl.oninput = function () { draft.title = titleEl.value; saveBtn.disabled = !draft.title.trim(); };
    titleEl.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('f-desc').focus(); } };
    document.getElementById('f-desc').oninput = function (e) { draft.desc = e.target.value; };
    overlay.querySelectorAll('.prop-pill[data-prop]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openPropMenu(b, b.dataset.prop, p, it); };
    });
    var del = overlay.querySelector('[data-del-item]');
    if (del) del.onclick = function () { deleteItem(p, it); };
    var more = document.getElementById('f-more');
    if (more) more.onclick = function () { createMore = !createMore; more.querySelector('.toggle').classList.toggle('on', createMore); };
    saveBtn.onclick = function () { saveItem(p, it); };
    titleEl.focus(); var L = titleEl.value.length; try { titleEl.setSelectionRange(L, L); } catch (e) {}
  }

  function openPropMenu(anchor, key, p, it) {
    closeMenu();
    var opts;
    if (key === 'status') opts = [['open', 'Open', STATUS.open.hue], ['done', 'Done', STATUS.done.hue]];
    else if (key === 'priority') opts = [['high', 'High', PRIORITY.high.hue], ['medium', 'Medium', PRIORITY.medium.hue], ['low', 'Low', PRIORITY.low.hue]];
    else opts = [['user', 'You', null], ['ai', 'Claude', null]];
    menuEl = document.getElementById('ctx-menu');
    menuEl.innerHTML = opts.map(function (o) {
      var sel = draft[key] === o[0];
      var lead = key === 'assignee' ? avatar(o[0], 'xs') : '<span class="pdot" style="background:' + o[2] + '"></span>';
      return '<div class="mi" data-v="' + o[0] + '">' + lead + '<span style="flex:1">' + o[1] + '</span>' + (sel ? icon('check', 14) : '') + '</div>';
    }).join('');
    var r = anchor.getBoundingClientRect();
    menuEl.style.width = '170px';
    menuEl.style.top = (r.bottom + 6) + 'px';
    menuEl.style.left = Math.max(12, r.left) + 'px';
    menuEl.classList.add('open');
    menuEl.querySelectorAll('.mi').forEach(function (mi) {
      mi.onclick = function () { draft[key] = mi.dataset.v; closeMenu(); renderItemModal(p, it); };
    });
  }

  function saveItem(p, it) {
    if (!draft.title.trim()) return;
    if (it) {
      var changed = it.status !== draft.status;
      var reassignedToAI = it.assignee !== 'ai' && draft.assignee === 'ai';
      Object.assign(it, { title: draft.title.trim(), desc: draft.desc.trim(), status: draft.status, priority: draft.priority, assignee: draft.assignee });
      if (it.status === 'done') it.working = false;
      it.updatedAt = now();
      logActivity(p, 'user', 'updated', it.title);
      if (reassignedToAI) logActivity(p, 'user', 'assigned to Claude', it.title);
      toast('Saved', p.prefix + '-' + it.seq + ' · ' + it.title);
    } else {
      p.seq += 1;
      var ni = { id: uid(), seq: p.seq, type: draft.type, title: draft.title.trim(), desc: draft.desc.trim(),
        status: draft.status, priority: draft.priority, assignee: draft.assignee, createdAt: now(), updatedAt: now() };
      p.items.push(ni);
      logActivity(p, 'user', 'created', ni.title);
      toast(draft.type === 'issue' ? 'Issue created' : 'Todo created', p.prefix + '-' + ni.seq + ' · ' + ni.title);
      if (createMore) {
        p.updatedAt = now();
        draft.title = ''; draft.desc = '';
        render();
        renderItemModal(p, null);
        return;
      }
    }
    p.updatedAt = now();
    closeModal(); render();
  }

  function deleteItem(p, it) {
    p.items = p.items.filter(function (x) { return x.id !== it.id; });
    p.updatedAt = now();
    logActivity(p, 'user', 'deleted', it.title);
    closeModal(); render();
    toast('Deleted', p.prefix + '-' + it.seq + ' · ' + it.title, 'red');
  }

  /* ---------- project modal ---------- */
  function openProjectModal(projId) {
    var p = projId ? proj(projId) : null;
    editing = { kind: 'project', projId: projId };
    draft = p ? { name: p.name, desc: p.desc || '' } : { name: '', desc: '' };
    var html =
      '<div class="dialog" role="dialog" aria-modal="true" style="width:460px">' +
        '<div class="dlg-head"><span class="dlg-ic">' + icon(p ? 'edit' : 'folderPlus', 16) + '</span>' +
          '<div class="dh-text"><div class="dlg-title">' + (p ? 'Edit project' : 'New project') + '</div>' +
          '<div class="dlg-sub">' + (p ? 'Update name and description.' : 'Group related todos and issues. Claude can read and write to it over MCP.') + '</div></div>' +
          '<button class="icon-btn" data-x>' + icon('x', 15) + '</button></div>' +
        '<div class="dlg-body">' +
          '<div class="field-group"><label>Name <span class="req">*</span></label>' +
            '<input class="input" id="p-name" placeholder="e.g. Mobile app" value="' + esc(draft.name) + '" /></div>' +
          '<div class="field-group"><label>Description</label>' +
            '<textarea class="input" id="p-desc" placeholder="What is this project about?">' + esc(draft.desc) + '</textarea></div>' +
        '</div>' +
        '<div class="dlg-foot">' +
          (p ? '<button class="btn-chip danger ff-left" data-del-proj>' + icon('trash', 13) + 'Delete project</button>' : '') +
          '<button class="btn-chip" data-x>Cancel</button>' +
          '<button class="btn-primary" id="p-save" ' + (draft.name.trim() ? '' : 'disabled') + '>' + (p ? 'Save' : 'Create project') + '<span class="kbd dark">⌘↵</span></button>' +
        '</div></div>';
    showOverlay(html);
    var nameEl = document.getElementById('p-name');
    var saveBtn = document.getElementById('p-save');
    nameEl.oninput = function () { draft.name = nameEl.value; saveBtn.disabled = !draft.name.trim(); };
    document.getElementById('p-desc').oninput = function (e) { draft.desc = e.target.value; };
    saveBtn.onclick = function () { saveProject(p); };
    var del = overlay.querySelector('[data-del-proj]');
    if (del) del.onclick = function () { confirmDeleteProject(p); };
    nameEl.focus();
  }

  function saveProject(p) {
    if (!draft.name.trim()) return;
    if (p) {
      p.name = draft.name.trim(); p.desc = draft.desc.trim(); p.updatedAt = now();
      toast('Saved', p.name);
    } else {
      var prefix = draft.name.trim().replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PRJ';
      var np = { id: uid(), name: draft.name.trim(), prefix: prefix, hue: HUES[state.projects.length % HUES.length],
        desc: draft.desc.trim(), createdAt: now(), updatedAt: now(), seq: 0, items: [],
        activity: [{ id: uid(), actor: 'user', action: 'created the project', target: '', ts: now() }] };
      state.projects.push(np);
      state.ui.view = 'project'; state.ui.projectId = np.id; state.ui.tab = 'todos';
      toast('Project created', np.name);
    }
    closeModal(); render();
  }

  function confirmDeleteProject(p) {
    var html =
      '<div class="dialog" role="dialog" aria-modal="true" style="width:420px">' +
        '<div class="dlg-head"><span class="dlg-ic" style="background:color-mix(in srgb,var(--red) 15%,transparent);color:var(--red)">' + icon('trash', 16) + '</span>' +
          '<div class="dh-text"><div class="dlg-title">Delete “' + esc(p.name) + '”?</div>' +
          '<div class="dlg-sub">' + p.items.length + ' item' + (p.items.length === 1 ? '' : 's') + ' will be removed. This cannot be undone.</div></div></div>' +
        '<div class="dlg-foot"><button class="btn-chip" data-x>Cancel</button>' +
          '<button class="btn-chip danger" id="confirm-del">' + icon('trash', 13) + 'Delete project</button></div></div>';
    showOverlay(html);
    document.getElementById('confirm-del').onclick = function () {
      state.projects = state.projects.filter(function (x) { return x.id !== p.id; });
      if (state.ui.projectId === p.id) { state.ui.view = 'home'; state.ui.projectId = null; }
      closeModal(); render(); toast('Project deleted', p.name, 'red');
    };
  }

  /* ---------- project overflow menu ---------- */
  var menuEl = null;
  function openProjMenu(anchor) {
    closeMenu();
    var p = activeProj();
    menuEl = document.getElementById('ctx-menu');
    menuEl.innerHTML =
      '<div class="mi" data-m="edit">' + icon('edit', 15) + 'Edit project</div>' +
      '<div class="mi" data-m="new-todo">' + icon('todo', 15) + 'New todo</div>' +
      '<div class="mi" data-m="new-issue">' + icon('issue', 15) + 'New issue</div>' +
      '<div class="msep"></div>' +
      '<div class="mi danger" data-m="delete">' + icon('trash', 15) + 'Delete project</div>';
    var r = anchor.getBoundingClientRect();
    menuEl.style.top = (r.bottom + 6) + 'px';
    menuEl.style.left = (r.right - 188) + 'px';
    menuEl.classList.add('open');
    menuEl.querySelectorAll('.mi').forEach(function (mi) {
      mi.onclick = function () {
        var m = mi.dataset.m; closeMenu();
        if (m === 'edit') openProjectModal(p.id);
        else if (m === 'new-todo') openItemModal(null, 'todo');
        else if (m === 'new-issue') openItemModal(null, 'issue');
        else if (m === 'delete') confirmDeleteProject(p);
      };
    });
  }
  function closeMenu() { if (menuEl) menuEl.classList.remove('open'); }

  /* ---------- overlay infra ---------- */
  function showOverlay(html) {
    overlay = document.getElementById('overlay');
    overlay.innerHTML = html;
    overlay.classList.add('open');
    overlay.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = closeModal; });
    overlay.onmousedown = function (e) { if (e.target === overlay) closeModal(); };
  }

  /* ---------- toast ---------- */
  function toast(title, body, hue) {
    hue = hue || 'accent';
    var hv = ({ accent: 'var(--accent)', green: 'var(--green)', red: 'var(--red)' })[hue];
    var wrap = document.getElementById('toast-wrap');
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span class="tic" style="background:color-mix(in srgb,' + hv + ' 16%,transparent);color:' + hv + '">' +
      icon(hue === 'red' ? 'trash' : 'check', 15, hv) + '</span>' +
      '<div style="flex:1"><b>' + esc(title) + '</b>' + (body ? '<p>' + esc(body) + '</p>' : '') + '</div>';
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 220); }, 2600);
  }

  /* ============================================================
     COMMAND PALETTE
  ============================================================ */
  var palette = null, palItems = [], palActive = 0;
  function buildPalActions() {
    var acts = [
      { g: 'Create', label: 'New project', ic: 'folderPlus', run: function () { closePalette(); openProjectModal(null); } },
      { g: 'Create', label: 'New todo', ic: 'todo', sub: activeProj() ? activeProj().name : 'pick a project', run: function () { if (!activeProj()) { go('home'); return; } closePalette(); openItemModal(null, 'todo'); } },
      { g: 'Create', label: 'New issue', ic: 'issue', sub: activeProj() ? activeProj().name : 'pick a project', run: function () { if (!activeProj()) { go('home'); return; } closePalette(); openItemModal(null, 'issue'); } },
      { g: 'Go to', label: 'All todos', ic: 'todo', run: function () { closePalette(); go('todos'); } },
      { g: 'Go to', label: 'All projects', ic: 'project', run: function () { closePalette(); go('home'); } },
      { g: 'Go to', label: 'Search', ic: 'search', run: function () { closePalette(); go('search'); } }
    ];
    state.projects.forEach(function (p) {
      acts.push({ g: 'Projects', label: p.name, ic: 'project', sub: p.prefix, run: function () { closePalette(); openProject(p.id); } });
    });
    return acts;
  }
  function openPalette() {
    palette = document.getElementById('palette-overlay');
    palette.classList.add('open');
    palActive = 0;
    renderPalette('');
    palette.onmousedown = function (e) { if (e.target === palette) closePalette(); };
    var inp = document.getElementById('pal-input');
    inp.value = ''; inp.focus();
    inp.oninput = function () { palActive = 0; renderPalette(inp.value); };
  }
  function renderPalette(q) {
    q = (q || '').toLowerCase();
    var acts = buildPalActions().filter(function (a) { return !q || a.label.toLowerCase().indexOf(q) >= 0 || a.g.toLowerCase().indexOf(q) >= 0; });
    palItems = acts;
    var body = document.getElementById('pal-body');
    if (!acts.length) { body.innerHTML = '<div class="pgroup">No results</div>'; return; }
    var html = '', lastG = null;
    acts.forEach(function (a, i) {
      if (a.g !== lastG) { html += '<div class="pgroup">' + a.g + '</div>'; lastG = a.g; }
      html += '<div class="pitem' + (i === palActive ? ' active' : '') + '" data-i="' + i + '">' +
        '<span class="pi-ic">' + icon(a.ic, 16) + '</span><span class="pi-label">' + esc(a.label) + '</span>' +
        (a.sub ? '<span class="pi-sub">' + esc(a.sub) + '</span>' : '') +
        (i === palActive ? '<span class="kbd">↵</span>' : '') + '</div>';
    });
    body.innerHTML = html;
    body.querySelectorAll('.pitem').forEach(function (el) {
      el.onmouseenter = function () { palActive = +el.dataset.i; highlightPal(); };
      el.onclick = function () { palItems[+el.dataset.i].run(); };
    });
  }
  function highlightPal() {
    document.querySelectorAll('#pal-body .pitem').forEach(function (el) {
      var on = +el.dataset.i === palActive; el.classList.toggle('active', on);
    });
  }
  function closePalette() { if (palette) palette.classList.remove('open'); }

  /* ============================================================
     KEYBOARD
  ============================================================ */
  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;
    var palOpen = palette && palette.classList.contains('open');
    var modalOpen = overlay && overlay.classList.contains('open');

    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); if (palOpen) closePalette(); else openPalette(); return; }

    if (palOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); palActive = Math.min(palItems.length - 1, palActive + 1); highlightPal(); ensurePalVisible(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palActive = Math.max(0, palActive - 1); highlightPal(); ensurePalVisible(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (palItems[palActive]) palItems[palActive].run(); }
      return;
    }
    if (modalOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (mod && e.key === 'Enter') {
        e.preventDefault();
        var sb = document.getElementById('f-save') || document.getElementById('p-save');
        if (sb && !sb.disabled) sb.click();
      }
      return;
    }
    if (e.key === 'Escape') { closeMenu(); }
  });
  function ensurePalVisible() {
    var el = document.querySelector('#pal-body .pitem.active');
    if (el) el.scrollIntoView ? null : null; // avoid scrollIntoView per guidelines
    var body = document.getElementById('pal-body');
    if (el && body) {
      var er = el.getBoundingClientRect(), br = body.getBoundingClientRect();
      if (er.bottom > br.bottom) body.scrollTop += er.bottom - br.bottom;
      else if (er.top < br.top) body.scrollTop -= br.top - er.top;
    }
  }

  /* ============================================================
     CHROME WIRING
  ============================================================ */
  function wireChrome() {
    document.querySelectorAll('.side-nav .nav-item').forEach(function (n) {
      n.onclick = function () { go(n.dataset.nav); };
    });
    document.getElementById('side-new-proj').onclick = function () { openProjectModal(null); };
    document.getElementById('side-compose').onclick = function () {
      if (activeProj()) openItemModal(null, state.ui.tab === 'issues' ? 'issue' : 'todo');
      else openProjectModal(null);
    };
    var ss = document.getElementById('side-search-input');
    var sw = document.getElementById('side-search');
    if (ss && sw) {
      ss.onfocus = function () { sw.classList.add('focus'); };
      ss.onblur = function () { sw.classList.remove('focus'); };
      ss.onkeydown = function (e) {
        if (e.key === 'Enter') { state.ui.search = ss.value; ss.value = ''; sw.classList.remove('focus'); go('search'); }
      };
    }
    document.getElementById('side-cmdk').onclick = openPalette;
    // sidebar project rows (delegated — list re-renders)
    document.getElementById('proj-list').addEventListener('click', function (e) {
      var row = e.target.closest('.proj-row');
      if (row && row.dataset.proj) openProject(row.dataset.proj);
    });
    // global click closes overflow menu
    document.addEventListener('mousedown', function (e) {
      if (menuEl && menuEl.classList.contains('open') && !menuEl.contains(e.target) && !(e.target.closest && e.target.closest('[data-act="proj-menu"]'))) closeMenu();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    load();
    wireChrome();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Towork = { reset: function () { localStorage.removeItem(STORE_KEY); load(); render(); } };
})();
