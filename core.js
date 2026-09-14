// 상품지원 허브 · 순수 로직 (브라우저 + Node 공용, DOM 없음)
'use strict';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// 역할: manager(매니저) < educator(교육담당) < reviewer(검토자) < admin(관리자)
// 질문 배정 대상: educator | product | underwrite | system | compliance (문자열, 조직 미확정)
const ROLES = ['manager', 'educator', 'reviewer', 'admin'];
function roleAtLeast(role, need) {
  return ROLES.indexOf(role) >= ROLES.indexOf(need);
}

// 질문 상태머신: 접수 → 확인 중 → 답변 완료 → 해결 확인
// 추가 질문 등록 시 확인 중으로 복귀
const Q_FLOW = { received: ['checking'], checking: ['answered'], answered: ['resolved', 'checking'], resolved: [] };
function qTransition(ok, from, to) {
  if (!Q_FLOW[from] || !Q_FLOW[from].includes(to)) return { ok: false, error: `상태 전이 불가(${from}→${to})` };
  return { ok: true, error: null };
}

// 신뢰·적용·전달 분리 표시
const TRUST = { official: '공식', reference: '참고', checking: '확인 중' };
const APPLY = { current: '현재', upcoming: '예정', past: '과거 계약 확인용', withdrawn: '철회' };
const AUDIENCE = { internal: '매니저 내부용', planner: '설계사 전달 가능', customer: '고객 전달 가능' };

// 통합검색 점수: 제목 3, 태그·상품명 2, 설명 1. PDF 본문은 미연동이므로 제외.
function searchScore(q, doc) {
  const needle = q.trim().toLowerCase();
  if (!needle) return 0;
  const terms = needle.split(/\s+/);
  let score = 0;
  const hay = {
    title: (doc.title || '').toLowerCase(),
    tags: ((doc.tags || []).join(' ') + ' ' + (doc.product_name || '')).toLowerCase(),
    desc: (doc.summary || '').toLowerCase(),
  };
  for (const term of terms) {
    if (hay.title.includes(term)) score += 3;
    if (hay.tags.includes(term)) score += 2;
    if (hay.desc.includes(term)) score += 1;
  }
  return score;
}

// 문서 버전 URL: 대표 URL과 버전 고유 URL 분리
function docUrls(docId, versionId) {
  return { canonical: `/d/${docId}`, version: `/d/${docId}/v/${versionId}` };
}

// PII 가드: 질문·내용에 개인정보 패턴이 있으면 차단 사유 반환
function piiCheck(text) {
  const s = String(text || '');
  if (/\d{6}[- ]?\d{7}/.test(s)) return '주민등록번호로 보이는 숫자가 있습니다';
  if (/01[016789][- ]?\d{3,4}[- ]?\d{4}/.test(s)) return '연락처로 보이는 숫자가 있습니다';
  if (/청약\s*(번호|서)/.test(s) && /\d{4,}/.test(s)) return '청약 관련 번호로 보이는 내용이 있습니다';
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc, validId, ROLES, roleAtLeast, Q_FLOW, qTransition, TRUST, APPLY, AUDIENCE, searchScore, docUrls, piiCheck };
}
