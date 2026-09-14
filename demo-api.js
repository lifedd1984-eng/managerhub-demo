// GitHub Pages용 브라우저 내 데모 API. 실제 고객 정보나 운영 서버를 사용하지 않는다.
'use strict';
(function () {
  const KEY = 'managerhub_pages_demo_v1';
  const now = () => new Date().toISOString();
  const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function fresh() {
    const db = seed();
    db.documents.forEach((d) => { d.workflow = 'published'; });
    return db;
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); }
    catch { return fresh(); }
  }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
  function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
  function bodyOf(init) {
    try { return init && init.body ? JSON.parse(init.body) : {}; }
    catch { return {}; }
  }
  function roleAtLeast(user, role) {
    return user && ['manager', 'educator', 'reviewer', 'admin'].indexOf(user.role) >= ['manager', 'educator', 'reviewer', 'admin'].indexOf(role);
  }
  function meOf(db, init) {
    const header = init && init.headers && (init.headers.Authorization || init.headers.authorization);
    const token = String(header || '').replace(/^Bearer\s+/, '');
    const session = db.sessions.find((s) => s.token === token);
    return session && db.users.find((u) => u.id === session.user_id && !u.suspended);
  }
  function canSee(user, doc) { return doc.workflow === 'published' || roleAtLeast(user, 'educator'); }
  function productName(db, id) { return (db.products.find((p) => p.id === id) || {}).name || ''; }
  function score(q, item) { return searchScore(q, item); }
  function notify(db, userId, kind, title, link) {
    db.notifications.push({ id: uid('n'), user_id: userId, kind, title, link, read: false, at: now() });
  }

  async function handle(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    const p = url.pathname;
    const method = String(init.method || 'GET').toUpperCase();
    const b = bodyOf(init);
    const db = load();

    if (method === 'GET' && p === '/api/health') return json({ ok: true, authMode: 'pages-demo', users: db.users.length });
    if (method === 'POST' && p === '/api/login') {
      const user = db.users.find((u) => u.username === b.username && !u.suspended);
      if (!user || b.password !== 'hub1234') return json({ error: '계정 또는 비밀번호를 확인하세요' }, 401);
      const token = uid('demo');
      db.sessions = db.sessions.filter((s) => s.user_id !== user.id);
      db.sessions.push({ token, user_id: user.id, expires_at: Date.now() + 7 * 86400000 });
      save(db); return json({ token });
    }
    const me = meOf(db, init);
    if (!me) return json({ error: '로그인이 필요합니다' }, 401);
    if (method === 'POST' && p === '/api/logout') { db.sessions = db.sessions.filter((s) => s.user_id !== me.id); save(db); return json({ ok: true }); }
    if (method === 'GET' && p === '/api/me') return json({ id: me.id, username: me.username, role: me.role, org: me.org, display: me.display });

    if (method === 'GET' && p === '/api/state') return json({
      products: db.products, notices: db.notices,
      myQuestions: db.questions.filter((q) => q.user_id === me.id),
      myAnswers: db.answers.filter((a) => a.user_id === me.id).length,
      pendingInbox: db.questions.filter((q) => ['received', 'checking'].includes(q.status)).length,
      bookmarks: db.bookmarks.filter((x) => x.user_id === me.id),
      subscriptions: db.subscriptions.filter((x) => x.user_id === me.id),
      notifications: db.notifications.filter((x) => x.user_id === me.id).slice(-20),
    });
    if (method === 'GET' && p === '/api/products') return json(db.products);
    if (method === 'GET' && p.startsWith('/api/products/')) {
      const id = p.split('/')[3], product = db.products.find((x) => x.id === id);
      if (!product) return json({ error: '없음' }, 404);
      return json({ product, revisions: db.revisions.filter((x) => x.product_id === id), docs: db.documents.filter((x) => x.product_id === id && canSee(me, x)), faqs: db.faqs.filter((x) => x.product_id === id), bookmarked: db.bookmarks.some((x) => x.user_id === me.id && x.product_id === id), subscribed: db.subscriptions.some((x) => x.user_id === me.id && x.product_id === id) });
    }
    if (method === 'GET' && p === '/api/docs') {
      let list = db.documents.filter((d) => canSee(me, d));
      const type = url.searchParams.get('type'), apply = url.searchParams.get('apply'), q = url.searchParams.get('q');
      if (type && type !== 'all') list = list.filter((d) => d.type === type);
      if (apply && apply !== 'all') list = list.filter((d) => d.apply === apply);
      if (q) list = list.map((d) => ({ d, s: score(q, { ...d, product_name: productName(db, d.product_id) }) })).filter((x) => x.s > 0).sort((a, z) => z.s - a.s).map((x) => x.d);
      return json(list.map((d) => ({ ...d, product_name: productName(db, d.product_id) })));
    }
    if (method === 'GET' && /^\/api\/docs\/[^/]+$/.test(p)) {
      const d = db.documents.find((x) => x.id === p.split('/')[3]);
      if (!d || !canSee(me, d)) return json({ error: '없음' }, 404);
      return json({ ...d, product_name: productName(db, d.product_id), versions: db.doc_versions.filter((v) => v.document_id === d.id) });
    }
    if (method === 'POST' && p.endsWith('/view')) { const d = db.documents.find((x) => x.id === p.split('/')[3]); if (!d || !canSee(me, d)) return json({ error: '없음' }, 404); d.views = (d.views || 0) + 1; save(db); return json({ ok: true }); }
    if (method === 'GET' && p.endsWith('/file')) return json({ error: '작동 목업에서는 실제 파일을 제공하지 않습니다' }, 409);

    if (method === 'GET' && p === '/api/search') {
      const q = url.searchParams.get('q') || '';
      const docs = db.documents.filter((d) => canSee(me, d)).map((d) => ({ kind: 'doc', id: d.id, title: d.title, meta: `${d.type} · ${d.version} · ${APPLY[d.apply]}`, score: score(q, { ...d, product_name: productName(db, d.product_id) }) }));
      const faqs = db.faqs.map((f) => ({ kind: 'faq', id: f.id, title: f.q, meta: `공식 Q&A · 기준일 ${f.based_on}`, score: score(q, { title: f.q, summary: f.a }) }));
      const products = db.products.map((x) => ({ kind: 'product', id: x.id, title: x.name, meta: `${x.code} · ${x.line}`, score: score(q, { title: x.name, summary: x.desc, tags: [x.code] }) }));
      return json({ results: [...docs, ...faqs, ...products].filter((x) => x.score > 0).sort((a, z) => z.score - a.score).slice(0, 20), pdfNote: '목업 검색: 제목·설명·태그 기준' });
    }
    if (method === 'GET' && p === '/api/faqs') {
      let list = db.faqs.slice(); const q = url.searchParams.get('q');
      if (q) list = list.filter((f) => score(q, { title: f.q, summary: f.a }) > 0);
      return json(list);
    }
    if (method === 'POST' && p.endsWith('/reviewed')) { if (!roleAtLeast(me, 'reviewer')) return json({ error: '검토자 이상' }, 403); const f = db.faqs.find((x) => x.id === p.split('/')[3]); if (!f) return json({ error: '없음' }, 404); f.needs_review = false; save(db); return json({ ok: true }); }

    if (method === 'GET' && p === '/api/questions/mine') return json(db.questions.filter((q) => q.user_id === me.id).map((q) => ({ ...q, answers: db.answers.filter((a) => a.question_id === q.id), followups: db.followups.filter((f) => f.question_id === q.id) })));
    if (method === 'POST' && p === '/api/questions') {
      if (!b.product_id || !b.body || !String(b.body).trim()) return json({ error: '상품과 내용을 입력하세요' }, 400);
      const pii = piiCheck(`${b.body} ${b.title || ''}`); if (pii) return json({ error: `개인정보 의심: ${pii}` }, 400);
      const q = { id: uid('q'), user_id: me.id, product_id: b.product_id, revision_id: b.revision_id || null, title: String(b.title || '').slice(0, 80), qtype: b.qtype || '자동 추천', body: String(b.body).slice(0, 2000), status: 'received', assignee: null, created_at: now() };
      db.questions.push(q); save(db); return json(q);
    }
    if (method === 'POST' && p.endsWith('/followup')) { const q = db.questions.find((x) => x.id === p.split('/')[3] && x.user_id === me.id); if (!q) return json({ error: '없음' }, 404); if (q.status === 'resolved') return json({ error: '해결된 질문입니다' }, 400); db.followups.push({ id: uid('f'), question_id: q.id, body: String(b.body || ''), at: now() }); q.status = 'checking'; save(db); return json({ ok: true, status: q.status }); }
    if (method === 'POST' && p.endsWith('/resolve')) { const q = db.questions.find((x) => x.id === p.split('/')[3] && x.user_id === me.id); if (!q || q.status !== 'answered') return json({ error: '답변 완료 후 해결할 수 있습니다' }, 400); q.status = 'resolved'; save(db); return json({ ok: true }); }
    if (method === 'GET' && p === '/api/inbox') { if (!roleAtLeast(me, 'educator')) return json({ error: '교육담당 이상' }, 403); return json(db.questions.filter((q) => ['received', 'checking'].includes(q.status)).map((q) => ({ ...q, product_name: productName(db, q.product_id), long_wait: false, followup_count: db.followups.filter((f) => f.question_id === q.id).length }))); }
    if (method === 'POST' && p === '/api/assign') { if (!roleAtLeast(me, 'educator')) return json({ error: '교육담당 이상' }, 403); const q = db.questions.find((x) => x.id === b.question_id); if (!q) return json({ error: '없음' }, 404); q.assignee = b.team; q.status = 'checking'; save(db); return json({ ok: true }); }
    if (method === 'POST' && p.endsWith('/answer')) { if (!roleAtLeast(me, 'educator')) return json({ error: '교육담당 이상' }, 403); const q = db.questions.find((x) => x.id === p.split('/')[3]); if (!q) return json({ error: '없음' }, 404); q.status = 'answered'; db.answers.push({ id: uid('a'), question_id: q.id, user_id: me.id, body: b.body, source_version: b.source_version, based_on: b.based_on, by: me.display, at: now() }); notify(db, q.user_id, 'answer', '질문에 답변이 달렸습니다', '#/mine'); save(db); return json({ ok: true }); }
    if (method === 'POST' && p.endsWith('/promote')) { if (!roleAtLeast(me, 'reviewer')) return json({ error: '검토자 이상' }, 403); const a = db.answers.find((x) => x.id === p.split('/')[3]), q = a && db.questions.find((x) => x.id === a.question_id); if (!a || !q) return json({ error: '없음' }, 404); db.faqs.push({ id: uid('f'), product_id: q.product_id, revision_id: q.revision_id, q: q.title || q.body, a: a.body, source: a.source_version, based_on: a.based_on, views: 0, from_answer: a.id }); save(db); return json({ ok: true }); }

    if (method === 'POST' && p === '/api/bookmarks') { if (!db.bookmarks.some((x) => x.user_id === me.id && x.product_id === b.product_id)) db.bookmarks.push({ user_id: me.id, product_id: b.product_id }); save(db); return json({ ok: true }); }
    if (method === 'DELETE' && p.startsWith('/api/bookmarks/')) { db.bookmarks = db.bookmarks.filter((x) => !(x.user_id === me.id && x.product_id === p.split('/')[3])); save(db); return json({ ok: true }); }
    if (method === 'POST' && p === '/api/subscriptions') { if (!db.subscriptions.some((x) => x.user_id === me.id && x.product_id === b.product_id)) db.subscriptions.push({ user_id: me.id, product_id: b.product_id }); save(db); return json({ ok: true }); }
    if (method === 'GET' && p === '/api/notices') return json(db.notices);
    if (method === 'POST' && p === '/api/notifications/read') { db.notifications.filter((x) => x.user_id === me.id).forEach((x) => { x.read = true; }); save(db); return json({ ok: true }); }
    if (method === 'GET' && p === '/api/users') return roleAtLeast(me, 'admin') ? json(db.users.map(({ id, username, role, org, display, suspended }) => ({ id, username, role, org, display, suspended }))) : json({ error: '관리자만' }, 403);
    if (method === 'GET' && p === '/api/audit') return roleAtLeast(me, 'reviewer') ? json(db.audit || []) : json({ error: '검토자 이상' }, 403);
    if (method === 'POST' && p.endsWith('/suspend')) { if (!roleAtLeast(me, 'admin')) return json({ error: '관리자만' }, 403); const u = db.users.find((x) => x.id === p.split('/')[3]); if (u) u.suspended = !u.suspended; save(db); return json({ ok: true }); }
    if (method === 'POST' && p === '/api/setup') return json({ error: 'GitHub Pages 목업에서는 사용할 수 없습니다' }, 409);
    if (method === 'POST' && (p === '/api/docs' || p === '/api/files' || p.endsWith('/workflow'))) return json({ error: '정적 목업에서는 자료 등록·승인을 저장하지 않습니다' }, 501);
    return json({ error: '목업에서 지원하지 않는 기능입니다' }, 404);
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = handle;
  window.HubDemo = { reset() { localStorage.removeItem(KEY); location.reload(); } };
})();
