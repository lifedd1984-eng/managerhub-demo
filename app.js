// 상품지원 허브 · SPA (외부 의존성 없음)
'use strict';
const $ = (id) => document.getElementById(id);
/* core.js 전역: esc, validId, roleAtLeast, qTransition, TRUST, APPLY, AUDIENCE, searchScore */
/* config.js 전역: config */

const api = {
  token: null,
  init() { try { this.token = localStorage.getItem('hub_token'); } catch {} },
  async call(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}), ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && this.token) { this.token = null; try { localStorage.removeItem('hub_token'); } catch {} location.hash = '#/login'; }
    if (!r.ok) throw new Error(data.error || ('실패 ' + r.status));
    return data;
  },
  get: (p) => api.call(p),
  post: (p, b) => api.call(p, { method: 'POST', body: JSON.stringify(b || {}) }),
  del: (p) => api.call(p, { method: 'DELETE' }),
};
api.init();

const S = { me: null, state: null, route: null, docsKeep: null, recent: [] };
try { S.recent = JSON.parse(localStorage.getItem('hub_recent') || '[]'); } catch { S.recent = []; }
function saveRecent(id) {
  S.recent = [id, ...S.recent.filter((x) => x !== id)].slice(0, 10);
  try { localStorage.setItem('hub_recent', JSON.stringify(S.recent)); } catch {}
}
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(window.__tt); window.__tt = setTimeout(() => (t.hidden = true), 2600); }
function modal(html) { $('modalBox').innerHTML = html; $('modalBack').classList.add('show'); }
function closeModal() { $('modalBack').classList.remove('show'); }
$('modalBack').addEventListener('click', (e) => { if (e.target === $('modalBack')) closeModal(); });

const NAV = [
  ['home', '⌂', '홈'], ['products', '▣', '상품별 자료실'], ['docs', '▤', '전체 자료'],
  ['qa', '?', '통합 Q&A'], ['notices', '!', '긴급 공지'], ['my', '☆', '내 메뉴'],
];
function paintNav(route) {
  $('menu').innerHTML = NAV.map(([id, ic, lb]) => `<button class="nav-btn${route === id ? ' active' : ''}" data-r="${id}"><span>${ic}</span><span>${lb}</span></button>`).join('')
    + (S.me && ['educator', 'reviewer', 'admin'].includes(S.me.role) ? `<button class="nav-btn${route === 'inbox' ? ' active' : ''}" data-r="inbox"><span>☰</span><span>처리함</span></button>` : '')
    + (S.me && S.me.role === 'admin' ? `<button class="nav-btn${route === 'admin' ? ' active' : ''}" data-r="admin"><span>⚙</span><span>관리</span></button>` : '');
  $('menu').querySelectorAll('button').forEach((b) => (b.onclick = () => go(b.dataset.r)));
  $('bottomNav').innerHTML = NAV.slice(0, 5).map(([id, ic, lb]) => `<button class="bottom-nav-btn${route === id ? ' active' : ''}" data-r="${id}"><span>${ic}</span>${lb}</button>`).join('');
  $('bottomNav').querySelectorAll('button').forEach((b) => (b.onclick = () => go(b.dataset.r)));
}
function go(route) { location.hash = '#/' + route; }
$('fabQ').onclick = () => qModal();
$('topSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) location.hash = '#/search?q=' + encodeURIComponent(e.target.value.trim()); });

async function needMe() {
  if (S.me) return S.me;
  if (!api.token) { sessionStorage.setItem('hub_return', location.hash); location.hash = '#/login'; throw new Error('login'); }
  S.me = await api.get('/api/me');
  return S.me;
}
function parseHash() {
  const raw = location.hash || '#/home';
  const body = raw.replace(/^#/, '');
  const qi = body.indexOf('?');
  const pathPart = qi >= 0 ? body.slice(0, qi) : body;
  const queryPart = qi >= 0 ? body.slice(qi + 1) : (location.search ? location.search.replace(/^\?/, '') : '');
  const segs = pathPart.split('/');
  return { name: segs[1] || 'home', a: segs[2], b: segs[3], c: segs[4], q: new URLSearchParams(queryPart || '') };
}
function render() {
  // 대표·버전 URL 직접 접속 (/d/:id, /d/:id/v/:vid) → 해시 라우트로 변환
  try {
    const pn = location.pathname || '/';
    if (pn === '/d' || pn.startsWith('/d/')) {
      const parts = pn.split('/').filter(Boolean);
      if (parts.length === 2 && parts[0] === 'd') { location.hash = '#/doc/' + parts[1]; return; }
      if (parts.length === 4 && parts[0] === 'd' && parts[2] === 'v') { location.hash = '#/doc/' + parts[1] + '/v/' + parts[3]; return; }
    }
  } catch {}
  const parsed = parseHash();
  const name = parsed.name, a = parsed.a, b = parsed.b, c = parsed.c, q = parsed.q;
  S.route = name || 'home';
  paintNav(S.route);
  const V = $('view');
  ({ login: vLogin, home: vHome, products: vProducts, product: () => vProduct(a), docs: vDocs, doc: () => vDoc(a, c), search: () => vSearch(q.get('q') || ''), qa: vQa, mine: vMine, notices: vNotices, my: vMy, inbox: vInbox, admin: vAdmin }[S.route] || vHome)()
    .then((html) => { V.innerHTML = html; bind(); window.scrollTo(0, 0); })
    .catch((e) => { if (e.message !== 'login') V.innerHTML = `<div class="empty">${esc(e.message)}</div>`; });
}
window.addEventListener('hashchange', render);
function bind() {
  $('view').querySelectorAll('[data-go]').forEach((el) => (el.onclick = () => go(el.dataset.go)));
  const hb = $('heroBtn');
  if (hb) {
    const run = () => { const v = $('heroInput').value.trim(); if (v) location.hash = '#/search?q=' + encodeURIComponent(v); };
    hb.onclick = run;
    $('heroInput').onkeydown = (e) => { if (e.key === 'Enter') run(); };
  }
  const qf = $('qFab');
  if (qf) qf.onclick = () => qModal();
  const qn = $('qNew2');
  if (qn) qn.onclick = () => qModal();
}

// ---------- 화면 ----------
async function vLogin() {
  if (api.token) { try { S.me = await api.get('/api/me'); } catch { /* 만료 */ } }
  if (S.me) { location.hash = sessionStorage.getItem('hub_return') || '#/home'; return ''; }
  const ret = sessionStorage.getItem('hub_return');
  setTimeout(() => {
    $('loginBtn').onclick = async () => {
      try {
        const r = await api.post('/api/login', { username: $('loginU').value.trim(), password: $('loginP').value });
        api.token = r.token;
        try { localStorage.setItem('hub_token', r.token); } catch {}
        S.me = await api.get('/api/me');
        location.hash = ret || '#/home';
      } catch (e) { toast(e.message); }
    };
    const sb = $('setupBtn');
    if (sb) sb.onclick = async () => {
      try { await api.post('/api/setup', { password: $('loginP').value }); toast('관리자 생성됨. 로그인하세요.'); }
      catch (e) { toast(e.message); }
    };
  });
  return `<div class="page-head"><div><span class="eyebrow">INTERACTIVE DEMO</span><h1>상품지원 허브 체험</h1><p class="subtitle">사용 흐름을 확인하는 공개 목업입니다. 입력 내용은 이 브라우저에만 저장됩니다.</p></div></div>
  <div class="card" style="max-width:520px"><div class="form-grid">
  <div class="field"><label>계정</label><input id="loginU" placeholder="manager"></div>
  <div class="field"><label>비밀번호</label><input id="loginP" type="password" placeholder="hub1234"></div></div>
  <div class="modal-actions"><button class="primary" id="loginBtn">체험 시작</button></div>
  <div class="disabled-note">추천 계정: manager / 비밀번호: hub1234 · 실제 고객 개인정보를 입력하지 마세요.</div>
  ${ret ? `<div class="disabled-note">로그인 후 ${esc(ret)} 화면으로 돌아간다.</div>` : ''}</div>`;
}

async function vHome() {
  const me = await needMe();
  const st = await api.get('/api/state');
  S.state = st;
  $('who').textContent = me.display;
  $('org').textContent = me.org || '';
  $('avatar').textContent = (me.display || '?')[0];
  const urg = st.notices.filter((n) => n.level === 'urgent').slice(0, 1);
  return `<div class="page-head"><div><span class="eyebrow">GOOD WORK</span><h1>${esc(me.display)}님, 무엇을 도와드릴까요?</h1><p class="subtitle">공식 자료와 검토 완료된 답변을 한곳에서 확인하세요.</p></div></div>
  ${urg.length ? `<div class="card" style="border-color:#f0c9c9;background:#fff5f5;margin-bottom:14px"><b>긴급</b> ${esc(urg[0].title)} <button class="link-btn" data-go="notices">공지 보기 →</button></div>` : ''}
  <div class="hero"><h2>현장 문의, 먼저 검색해보세요</h2><p>약관·교육자료·1매형 자료·공식 Q&A를 한 번에 찾습니다.</p><div class="hero-search"><input id="heroInput" placeholder="예: 유병자보험 가입 가능 연령"><button id="heroBtn">통합검색</button></div></div>
  <div class="stats">
    <div class="stat"><div><strong>${st.products.filter((p) => p.sale === 'selling').length}</strong><small>판매 중 상품</small></div></div>
    <div class="stat"><div><strong>${st.myAnswers}</strong><small>내 답변 완료</small></div></div>
    <div class="stat"><div><strong>${st.myQuestions.filter((q) => q.status !== 'resolved').length}</strong><small>내 진행 중 질문</small></div></div>
    <div class="stat"><div><strong>${st.pendingInbox}</strong><small>처리함 대기</small></div></div>
  </div>
  <div class="grid-2"><div class="card"><div class="card-head"><h3>중요 공지</h3><button class="link-btn" data-go="notices">전체보기 →</button></div><div class="notice-list">
  ${st.notices.slice(0, 3).map((n) => `<div class="notice"><span class="badge ${n.level === 'urgent' ? 'urgent' : 'new'}">${n.level === 'urgent' ? '긴급' : '알림'}</span><div><strong>${esc(n.title)}</strong><br><small>${esc(n.at)}</small></div></div>`).join('')}
  </div></div>
  <div class="card"><div class="card-head"><h3>빠른 업무</h3></div><div style="display:grid;gap:8px">
  <button class="secondary" data-go="products">상품 찾기</button>
  <button class="secondary" data-go="docs">전체 자료</button>
  <button class="secondary" data-go="qa">FAQ 보기</button>
  <button class="primary" id="qFab">질문 등록</button></div></div></div>`;
}

async function vProducts() {
  await needMe();
  const list = await api.get('/api/products');
  setTimeout(() => {
    const inp = $('prodQ');
    const paint = () => {
      const q = inp.value.trim();
      document.querySelectorAll('#prodGrid .product').forEach((el) => {
        el.style.display = !q || el.textContent.includes(q) ? '' : 'none';
      });
    };
    inp.oninput = paint;
    $('prodSale').onchange = (e) => {
      const v = e.target.value;
      document.querySelectorAll('#prodGrid .product').forEach((el) => {
        el.style.display = v === 'all' || el.dataset.sale === v ? '' : 'none';
      });
    };
  });
  return `<div class="page-head"><div><span class="eyebrow">PRODUCT LIBRARY</span><h1>상품별 자료실</h1><p class="subtitle">한 상품의 약관부터 현장 Q&A까지 한 번에 확인합니다.</p></div></div>
  <div class="toolbar"><input id="prodQ" placeholder="상품명 검색"><select id="prodSale"><option value="all">전체 상태</option><option value="selling">판매 중</option><option value="ending">판매 종료</option></select></div>
  <div class="product-grid" id="prodGrid">${list.map((p) => `<article class="product" data-sale="${p.sale}"><span class="category">${esc(p.line)} · ${p.sale === 'selling' ? '판매 중' : '판매 종료'}</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p><div class="product-meta"><span class="chip">${esc(p.code)}</span></div><button data-go="product/${p.id}">자료 모아보기 →</button></article>`).join('')}</div>`;
}

async function vProduct(id) {
  await needMe();
  const d = await api.get('/api/products/' + id);
  const p = d.product;
  setTimeout(() => {
    $('bmBtn').onclick = async () => { await api.post('/api/bookmarks', { product_id: id }); toast('관심 상품 저장'); render(); };
    $('bmDel').onclick = async () => { await api.del('/api/bookmarks/' + id); toast('관심 해제'); render(); };
    $('subBtn').onclick = async () => { await api.post('/api/subscriptions', { product_id: id }); toast('변경 알림 신청'); };
    $('askBtn').onclick = () => qModal(id, (d.revisions[0] || {}).id);
  });
  return `<button class="link-btn" data-go="products">← 상품 목록</button>
  <div class="detail-banner" style="margin-top:14px"><small>상품별 자료실 · ${p.sale === 'selling' ? '판매 중' : '판매 종료'}</small><h2>${esc(p.name)}</h2><small>상품 코드 ${esc(p.code)} · 자료별 적용 시기를 확인하세요.</small></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
    <button class="primary" id="askBtn">이 상품 질문하기</button>
    ${d.bookmarked ? `<button class="secondary" id="bmDel">★ 관심 해제</button>` : `<button class="secondary" id="bmBtn">☆ 관심 상품 저장</button>`}
    ${d.subscribed ? `<span class="badge done">변경 알림 신청됨</span>` : `<button class="secondary" id="subBtn">변경 알림 신청</button>`}
  </div>
  <div class="grid-2"><div class="card"><div class="card-head"><h3>현재 자료</h3></div><div class="doc-list">
  ${d.docs.filter((x) => x.apply === 'current').map(docRow).join('') || '<div class="empty">현재 자료 없음</div>'}
  </div></div>
  <div class="card"><h3>최근 개정</h3>${d.revisions.map((r) => `<p><b>${esc(r.rev)}</b><br><small>${esc(r.period)} · ${esc(r.note)}</small></p>`).join('')}
  <h3>관련 FAQ</h3>${d.faqs.map((f) => `<p><button class="link-btn" data-go="qa">${esc(f.q.slice(0, 40))}…</button></p>`).join('') || '<p class="muted">없음</p>'}</div></div>
  <div class="card" style="margin-top:16px"><h3>과거 계약 확인용 자료</h3>${d.docs.filter((x) => x.apply === 'past').map(docRow).join('') || '<p class="muted">없음</p>'}
  <div class="disabled-note">이전 약관은 해당 계약의 적용 시기를 확인해 사용한다. 최신 파일로 자동 대체하지 않는다.</div></div>`;
}
function docRow(d) {
  return `<div class="doc-row"><div class="file-icon">문서</div><div><strong>${esc(d.title)}</strong><small>${esc(d.type)} · ${esc(d.version)} · ${esc(TRUST[d.trust] || d.trust)} · ${esc(APPLY[d.apply] || d.apply)} · ${esc(AUDIENCE[d.audience] || '')}</small></div><div class="doc-actions"><button class="icon-btn" data-go="doc/${d.id}">보기</button></div></div>`;
}

async function vDocs() {
  await needMe();
  const keep = S.docsKeep || { q: '', type: 'all', apply: 'current' };
  const list = await api.get('/api/docs?' + new URLSearchParams(keep).toString());
  setTimeout(() => {
    $('docQ').value = keep.q; $('docType').value = keep.type; $('docApply').value = keep.apply;
    const reload = async () => {
      S.docsKeep = { q: $('docQ').value.trim(), type: $('docType').value, apply: $('docApply').value };
      render();
    };
    let tm;
    $('docQ').oninput = () => { clearTimeout(tm); tm = setTimeout(reload, 400); };
    $('docType').onchange = reload; $('docApply').onchange = reload;
    if (S.me && ['educator', 'reviewer', 'admin'].includes(S.me.role)) $('docNew').onclick = () => docModal();
  });
  return `<div class="page-head"><div><span class="eyebrow">DOCUMENT CENTER</span><h1>전체 자료</h1><p class="subtitle">현재 유효한 최신 버전이 기본으로 표시됩니다.</p></div>${S.me && ['educator', 'reviewer', 'admin'].includes(S.me.role) ? '<button class="primary" id="docNew">＋ 자료 등록</button>' : ''}</div>
  <div class="toolbar"><input id="docQ" placeholder="자료명 또는 상품명 검색"><select id="docType"><option value="all">전체 유형</option><option>약관</option><option>교육자료</option><option>1매형</option><option>전산안내</option></select><select id="docApply"><option value="current">현재</option><option value="all">전체 시기</option><option value="upcoming">예정</option><option value="past">과거 계약 확인용</option><option value="withdrawn">철회</option></select></div>
  <div class="doc-list">${list.map(docRow).join('') || '<div class="empty">조건에 맞는 자료 없음</div>'}</div>
  <div class="disabled-note">뒤로 가면 검색·필터가 유지된다. PDF 본문 검색은 미연동이라 제목·설명·태그 기준이다.</div>`;
}

async function vDoc(id, ver) {
  await needMe();
  const d = await api.get('/api/docs/' + id);
  await api.post('/api/docs/' + id + '/view', {});
  saveRecent(id);
  const v = ver ? d.versions.find((x) => x.id === ver) : d.versions.slice(-1)[0];
  if (ver && !v) return `<div class="empty">버전 없음 (/d/${esc(id)}/v/${esc(ver)})</div>`;
  const dlVer = v ? '?version=' + encodeURIComponent(v.id) : '';
  setTimeout(() => {
    $('dlBtn').onclick = async () => {
      try {
        const r = await fetch(`/api/docs/${id}/file${dlVer}`, { headers: { Authorization: 'Bearer ' + api.token } });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || '실패'); }
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'document'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('다운로드 기록 저장');
      } catch (e) { toast(e.message); }
    };
    $('askBtn2').onclick = () => qModal(d.product_id, d.revision_id);
  });
  const urls = `/d/${d.id}` + (v ? ` · 버전 고유 URL /d/${d.id}/v/${v.id}` : '');
  return `<button class="link-btn" data-go="docs">← 전체 자료</button>
  <div class="detail-banner" style="margin-top:14px"><small>${esc(d.type)} · ${esc(TRUST[d.trust])} · ${esc(APPLY[d.apply])}</small><h2>${esc(d.title)}</h2><small>${esc(d.product_name)} · ${esc(d.version)}</small></div>
  <div class="card"><span class="detail-label">${esc(AUDIENCE[d.audience])}</span>
  <p>${esc(d.summary)}</p>
  <p class="muted">대표 URL ${esc(urls)}</p>
  <p><b>버전 이력</b></p>${d.versions.map((x) => `<p><button class="link-btn" data-go="doc/${d.id}/v/${x.id}">${esc(x.version)} · ${esc(x.created_at)}</button> ${x.file_ref ? '· 파일 연결됨' : '· <span class="badge mut">원본 미연결</span>'}</p>`).join('')}
  <div style="display:flex;gap:8px;margin-top:12px"><button class="primary" id="dlBtn">다운로드</button><button class="secondary" id="askBtn2">이 자료로 질문</button></div>
  ${!v || !v.file_ref ? '<div class="disabled-note">원본 파일 미연결: 미리보기·다운로드가 제한된다. 교육담당자가 파일을 올려야 한다.</div>' : ''}
  </div>`;
}

async function vSearch(q) {
  await needMe();
  if (!q) return '<div class="empty">검색어를 입력하세요.</div>';
  const r = await api.get('/api/search?q=' + encodeURIComponent(q));
  setTimeout(() => {
    document.querySelectorAll('[data-sgo]').forEach((el) => (el.onclick = () => {
      const k = el.dataset.sgo, id = el.dataset.sid;
      location.hash = k === 'doc' ? '#/doc/' + id : k === 'faq' ? '#/qa' : '#/product/' + id;
    }));
  });
  return `<div class="page-head"><div><span class="eyebrow">SEARCH</span><h1>“${esc(q)}” 검색 결과</h1><p class="subtitle">${r.results.length}건</p></div></div>
  <div class="card">${r.results.map((x) => `<div class="result"><span class="badge new">${esc(x.kind === 'doc' ? '자료' : x.kind === 'faq' ? '공식 Q&A' : '상품')}</span> <button class="link-btn" data-sgo="${x.kind}" data-sid="${x.id}">${esc(x.title)}</button><small>${esc(x.meta)}</small></div>`).join('') || '<div class="empty">결과 없음</div>'}</div>
  ${r.pdfNote ? `<div class="disabled-note">${esc(r.pdfNote)}</div>` : ''}`;
}

async function vQa() {
  await needMe();
  const faqs = await api.get('/api/faqs');
  const canReview = S.me && ['reviewer', 'admin'].includes(S.me.role);
  const faqRow = (f) => `<div class="qa-wrap"><div class="qa-row"><div class="qa-num">Q</div><div><strong>${esc(f.q)}</strong><small>조회 ${f.views || 0} · 기준일 ${esc(f.based_on || '')}${f.needs_review ? ' · <span class="badge wait">재검토 대기</span>' : ''}</small></div><span class="badge done">공식 답변</span></div><div class="qa-detail"><b>A.</b> ${esc(f.a)}<div class="source">근거: ${esc(f.source || '')} · 기준일 ${esc(f.based_on || '')}</div>${f.needs_review && canReview ? `<div style="margin-top:8px"><button class="secondary" data-reviewed="${f.id}">재검토 완료</button></div>` : ''}</div></div>`;
  const bindReviewed = () => {
    document.querySelectorAll('[data-reviewed]').forEach((b) => (b.onclick = async (ev) => {
      ev.stopPropagation();
      try { await api.post(`/api/faqs/${b.dataset.reviewed}/reviewed`, {}); toast('재검토 완료'); render(); }
      catch (e) { toast(e.message); }
    }));
  };
  setTimeout(() => {
    document.querySelectorAll('.qa-wrap').forEach((w) => (w.querySelector('.qa-row').onclick = () => w.classList.toggle('open')));
    $('faqQ').oninput = async (e) => {
      const list = await api.get('/api/faqs?q=' + encodeURIComponent(e.target.value.trim()));
      renderFaqs(list);
    };
    $('qNew').onclick = () => qModal();
    $('qMine').onclick = () => go('mine');
    bindReviewed();
  });
  const renderFaqs = (list) => {
    $('faqList').innerHTML = list.map(faqRow).join('') || '<div class="empty">결과 없음</div>';
    document.querySelectorAll('.qa-wrap').forEach((w) => (w.querySelector('.qa-row').onclick = () => w.classList.toggle('open')));
    bindReviewed();
  };
  window.__renderFaqs = renderFaqs;
  return `<div class="page-head"><div><span class="eyebrow">OFFICIAL Q&A</span><h1>통합 Q&A</h1><p class="subtitle">검토 완료된 공식 답변을 검색하고 새로운 질문을 등록하세요.</p></div><button class="primary" id="qNew">＋ 질문하기</button></div>
  <div class="toolbar"><input id="faqQ" placeholder="질문 내용 검색"><button class="secondary" id="qMine">내 질문 보기</button></div>
  <div class="qa-list" id="faqList">${faqs.map(faqRow).join('')}</div>
  <div class="disabled-note">아래 답변은 검토를 거친 공식 답변이다. AI 자동 답변은 후속 단계라 제공하지 않는다.</div>`;
}

async function vMine() {
  await needMe();
  const list = await api.get('/api/questions/mine');
  const badge = (s) => s === 'received' ? '<span class="badge wait">접수</span>' : s === 'checking' ? '<span class="badge wait">확인 중</span>' : s === 'answered' ? '<span class="badge done">답변 완료</span>' : '<span class="badge mut">해결 확인</span>';
  setTimeout(() => {
    document.querySelectorAll('[data-fup]').forEach((b) => (b.onclick = () => {
      modal(`<h2>추가 질문</h2><div class="field"><textarea id="fupBody" rows="4" style="width:100%"></textarea></div><div class="modal-actions"><button class="primary" id="fupSend">접수</button></div>`);
      $('fupSend').onclick = async () => {
        try { await api.post(`/api/questions/${b.dataset.fup}/followup`, { body: $('fupBody').value }); closeModal(); toast('추가 질문 접수. 확인 중으로 전환'); render(); }
        catch (e) { toast(e.message); }
      };
    }));
    document.querySelectorAll('[data-res]').forEach((b) => (b.onclick = async () => {
      try { await api.post(`/api/questions/${b.dataset.res}/resolve`, {}); toast('해결 확인'); render(); }
      catch (e) { toast(e.message); }
    }));
  });
  return `<div class="page-head"><div><span class="eyebrow">MY QUESTIONS</span><h1>내 질문</h1><p class="subtitle">접수부터 해결까지 한곳에서 확인하세요.</p></div><button class="primary" id="qNew2">＋ 질문</button></div>
  ${list.map((q) => `<article class="card" style="margin-bottom:12px">${badge(q.status)}<p>${esc(q.body)}</p>
  ${q.answers.map((a) => `<div class="source"><b>답변(${esc(a.by)})</b><br>${esc(a.body)}<br><small>근거: ${esc(a.source_version)} · 기준일 ${esc(a.based_on)}</small></div>`).join('')}
  ${q.followups.map((f) => `<p><small>추가 질문: ${esc(f.body)}</small></p>`).join('')}
  <div style="display:flex;gap:8px;margin-top:10px">${q.status === 'answered' ? `<button class="primary" data-res="${q.id}">해결됐어요</button><button class="secondary" data-fup="${q.id}">추가 질문</button>` : ''}</div></article>`).join('') || '<div class="empty">등록한 질문이 없습니다.</div>'}`;
}

async function vNotices() {
  await needMe();
  const list = await api.get('/api/notices');
  return `<div class="page-head"><div><span class="eyebrow">FIELD ALERT</span><h1>긴급 공지</h1><p class="subtitle">현장 대응에 바로 필요한 변경·장애·정정 사항입니다.</p></div></div>
  <div class="card"><div class="notice-list">${list.map((n) => `<div class="notice"><span class="badge ${n.level === 'urgent' ? 'urgent' : 'new'}">${n.level === 'urgent' ? '긴급' : '알림'}</span><div><strong>${esc(n.title)}</strong><br><small>${esc(n.at)} · 조회 ${n.views}</small><p>${esc(n.body)}</p></div></div>`).join('')}</div></div>`;
}

async function vMy() {
  await needMe();
  const st = await api.get('/api/state');
  const prods = await api.get('/api/products');
  const pname = (id) => (prods.find((p) => p.id === id) || {}).name || id;
  setTimeout(() => {
    $('logoutBtn').onclick = async () => { await api.post('/api/logout', {}); api.token = null; try { localStorage.removeItem('hub_token'); } catch {} S.me = null; location.hash = '#/login'; };
    $('notRead').onclick = async () => { await api.post('/api/notifications/read', {}); render(); };
  });
  return `<div class="page-head"><div><span class="eyebrow">MY WORKSPACE</span><h1>내 메뉴</h1></div><button class="secondary" id="logoutBtn">로그아웃</button></div>
  <div class="grid-2"><div class="card"><h3>내 질문 ${st.myQuestions.length}건</h3><button class="link-btn" data-go="mine">보러 가기 →</button>
  <h3>관심 상품</h3>${st.bookmarks.map((b) => `<p>${esc(pname(b.product_id))}</p>`).join('') || '<p class="muted">없음</p>'}
  <h3>최근 본 자료</h3>${S.recent.slice(0, 5).map((id) => `<p><button class="link-btn" data-go="doc/${id}">${esc(id)}</button></p>`).join('') || '<p class="muted">없음</p>'}</div>
  <div class="card"><div class="card-head"><h3>알림</h3><button class="link-btn" id="notRead">모두 읽음</button></div>
  ${st.notifications.slice().reverse().map((n) => `<p>${n.read ? '' : '<b>● </b>'}${esc(n.title)} <button class="link-btn" data-go="${esc(n.link.slice(2))}">${esc(n.link)}</button></p>`).join('') || '<p class="muted">알림 없음. 외부 메신저 알림은 미연동이라 앱 내에서만 받는다.</p>'}</div></div>
  <div class="card" style="margin-top:14px"><h3>계정·기기</h3><p>${esc(S.me.display)} · ${esc(S.me.role)} · ${esc(S.me.org || '')}</p><div class="disabled-note">기기 관리는 후속 단계. 공용 기기에서는 로그아웃 후 브라우저를 닫으세요.</div></div>`;
}

async function vInbox() {
  await needMe();
  let list = [];
  try { list = await api.get('/api/inbox'); }
  catch (e) { return `<div class="empty">${esc(e.message)} (교육담당 이상)</div>`; }
  setTimeout(() => {
    document.querySelectorAll('[data-ans]').forEach((b) => (b.onclick = () => ansModal(b.dataset.ans)));
    document.querySelectorAll('[data-asg]').forEach((b) => (b.onclick = () => {
      modal(`<h2>담당 배정</h2><div class="field"><select id="asgTeam"><option>상품교육</option><option>상품</option><option>인수</option><option>전산</option><option>준법</option></select></div><div class="modal-actions"><button class="primary" id="asgGo">배정</button></div>`);
      $('asgGo').onclick = async () => {
        try { await api.post('/api/assign', { question_id: b.dataset.asg, team: $('asgTeam').value }); closeModal(); toast('배정됨'); render(); }
        catch (e) { toast(e.message); }
      };
    }));
    document.querySelectorAll('[data-pro]').forEach((b) => (b.onclick = async () => {
      try { await api.post(`/api/answers/${b.dataset.pro}/promote`, {}); toast('공식 FAQ로 전환'); render(); }
      catch (e) { toast(e.message); }
    }));
  });
  return `<div class="page-head"><div><span class="eyebrow">OPERATION</span><h1>처리함</h1><p class="subtitle">미배정·장기 대기·추가 질문을 한곳에서 본다.</p></div></div>
  ${list.map((q) => `<article class="card" style="margin-bottom:12px">${q.status === 'received' ? '<span class="badge wait">접수</span>' : '<span class="badge new">확인 중</span>'}${!q.assignee ? ' <span class="badge urgent">미배정</span>' : ''}${q.long_wait ? ' <span class="badge urgent">장기 대기</span>' : ''}${q.followup_count ? ` <span class="badge new">추가 질문 ${q.followup_count}</span>` : ''}
  <p><b>${esc(q.product_name || '')}</b> · ${esc(q.body)}</p><small>배정: ${esc(q.assignee || '없음')}</small>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="secondary" data-ans="${q.id}">답변 등록</button><button class="secondary" data-asg="${q.id}">배정</button>${q.status === 'answered' ? `<button class="secondary" data-pro="${(q.answers || []).slice(-1)[0] || ''}">FAQ 전환</button>` : ''}</div></article>`).join('') || '<div class="empty">대기 없음</div>'}`;
}

function ansModal(qid) {
  modal(`<h2>답변 등록</h2><div class="field"><label>답변 내용</label><textarea id="ansBody" rows="5" style="width:100%"></textarea></div>
  <div class="form-grid"><div class="field"><label>근거 문서 버전 (필수)</label><input id="ansSrc" placeholder="예: 상품요약서 v2.1"></div><div class="field"><label>기준일 (필수)</label><input id="ansDate" placeholder="2026.08.27"></div></div>
  <div class="modal-actions"><button class="primary" id="ansGo">답변 완료</button></div>`);
  $('ansGo').onclick = async () => {
    try { await api.post(`/api/questions/${qid}/answer`, { body: $('ansBody').value, source_version: $('ansSrc').value, based_on: $('ansDate').value }); closeModal(); toast('답변 완료'); render(); }
    catch (e) { toast(e.message); }
  };
}

async function vAdmin() {
  await needMe();
  let users = [], logs = [];
  try { users = await api.get('/api/users'); logs = await api.get('/api/audit'); }
  catch (e) { return `<div class="empty">${esc(e.message)} (관리자 전용)</div>`; }
  setTimeout(() => {
    document.querySelectorAll('[data-sus]').forEach((b) => (b.onclick = async () => {
      try { await api.post(`/api/users/${b.dataset.sus}/suspend`, {}); render(); }
      catch (e) { toast(e.message); }
    }));
  });
  return `<div class="page-head"><div><span class="eyebrow">ADMIN</span><h1>관리</h1></div></div>
  <div class="card"><h3>계정</h3>${users.map((x) => `<p>${esc(x.display)}(${esc(x.username)}) · ${esc(x.role)} ${x.suspended ? '<span class="badge urgent">정지</span>' : ''} <button class="icon-btn" data-sus="${x.id}">${x.suspended ? '해제' : '정지'}</button></p>`).join('')}</div>
  <div class="card" style="margin-top:14px"><h3>감사 로그</h3>${logs.slice(-30).reverse().map((a) => `<p><small>${esc(a.at.slice(0, 19).replace('T', ' '))} · ${esc(a.actor)} · ${esc(a.action)} · ${esc(a.detail)}</small></p>`).join('')}</div>`;
}

// ---------- 질문·자료 모달 ----------
async function qModal(productId, revisionId) {
  try { await needMe(); } catch { return; }
  const prods = await api.get('/api/products');
  modal(`<div><span class="eyebrow">NEW QUESTION</span><h2>현장 문의 등록</h2></div>
  <div class="form-grid"><div class="field"><label>상품 (필수)</label><select id="qProd">${prods.map((p) => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
  <div class="field"><label>문의 유형 (선택)</label><select id="qType"><option>자동 추천</option><option>가입 조건</option><option>보장/면책</option><option>인수</option><option>전산</option><option>판매자료</option></select></div>
  <div class="field full"><label>제목 (선택)</label><input id="qTitle" placeholder="핵심 내용을 짧게"></div>
  <div class="field full"><label>상세 내용 (필수)</label><textarea id="qBody" placeholder="확인한 내용과 문의사항을 구체적으로"></textarea></div></div>
  <div class="privacy">고객 이름·주민번호·연락처·청약번호 등 개인정보를 입력하지 마세요.</div>
  <div class="modal-actions"><button class="secondary" id="qCancel">취소</button><button class="primary" id="qGo">질문 등록</button></div>`);
  $('qCancel').onclick = closeModal;
  $('qGo').onclick = async () => {
    try {
      await api.post('/api/questions', { product_id: $('qProd').value, revision_id: revisionId || null, title: $('qTitle').value, qtype: $('qType').value, body: $('qBody').value });
      closeModal(); toast('질문 등록됨'); location.hash = '#/mine';
    } catch (e) { toast(e.message); }
  };
}

async function docModal() {
  modal(`<h2>자료 등록 (담당자)</h2><div class="form-grid">
  <div class="field full"><label>제목</label><input id="dTitle"></div>
  <div class="field"><label>상품</label><select id="dProd"></select></div>
  <div class="field"><label>상품 개정 이력 (FAQ 재검토 연결)</label><select id="dRev"><option value="">없음</option></select></div>
  <div class="field"><label>유형</label><select id="dType"><option>약관</option><option>교육자료</option><option>1매형</option><option>전산안내</option></select></div>
  <div class="field"><label>버전</label><input id="dVer" value="v0.1"></div>
  <div class="field"><label>적용 상태</label><select id="dApply"><option value="current">현재</option><option value="upcoming">예정</option><option value="past">과거 계약 확인용</option><option value="withdrawn">철회</option></select></div>
  <div class="field full"><label>요약</label><textarea id="dSum" rows="3" style="width:100%"></textarea></div>
  <div class="field full"><label>원본 파일 (선택, 20MB 이하)</label><input id="dFile" type="file"></div></div>
  <div class="disabled-note">개정 이력을 선택하면 승인 시 같은 개정의 FAQ가 재검토 대기가 된다.</div>
  <div class="modal-actions"><button class="primary" id="dGo">초안 등록</button></div>`);
  const prods = await api.get('/api/products');
  $('dProd').innerHTML = prods.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const loadRev = async () => {
    try {
      const d = await api.get('/api/products/' + $('dProd').value);
      $('dRev').innerHTML = '<option value="">없음</option>' + (d.revisions || []).map((r) => `<option value="${r.id}">${esc(r.rev)} · ${esc(r.period)}</option>`).join('');
    } catch { $('dRev').innerHTML = '<option value="">없음</option>'; }
  };
  $('dProd').onchange = loadRev;
  await loadRev();
  $('dGo').onclick = async () => {
    try {
      const d = await api.post('/api/docs', { title: $('dTitle').value, product_id: $('dProd').value, revision_id: $('dRev').value || null, type: $('dType').value, version: $('dVer').value, apply: $('dApply').value, summary: $('dSum').value });
      const f = $('dFile').files[0];
      if (f) {
        if (f.size > 20 * 1024 * 1024) throw new Error('20MB 초과');
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
        await api.post('/api/files', { document_id: d.id, name: f.name, b64 });
      }
      closeModal(); toast('초안 등록됨. 검토→승인 후 게시된다.'); render();
    } catch (e) { toast(e.message); }
  };
}

render();
