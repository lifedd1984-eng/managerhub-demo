// 상품지원 허브 · 개발용 가상 데이터 (실제 고객 정보·실제 보험 판단 없음)
'use strict';

function seed() {
  const users = [
    { id: 'u_mgr', username: 'manager', role: 'manager', org: '서울지역단', display: '김매니저' },
    { id: 'u_edu', username: 'educator', role: 'educator', org: '상품교육팀', display: '이교육' },
    { id: 'u_rev', username: 'reviewer', role: 'reviewer', org: '상품지원팀', display: '박검토' },
    { id: 'u_adm', username: 'admin', role: 'admin', org: '운영팀', display: '최관리' },
  ];
  const products = [
    { id: 'p1', code: 'H-2026-09', name: '무배당 건강보험 뉴 라이프', line: '건강', sale: 'selling', desc: '간편심사부터 주요 질병 보장까지 현장 핵심 자료' },
    { id: 'p2', code: 'D-2026-08', name: '무배당 운전자보험 안전동행', line: '운전자', sale: 'selling', desc: '교통사고 처리지원금과 비용 담보 핵심' },
    { id: 'p3', code: 'K-2026-08', name: '무배당 자녀보험 아이사랑', line: '자녀', sale: 'selling', desc: '성장 단계별 보장과 설계 유의사항' },
    { id: 'p4', code: 'C-2026-07', name: '무배당 종합보험 든든플랜', line: '종합', sale: 'ending', desc: '주요 질병과 상해 보장을 한곳에' },
  ];
  const revisions = [
    { id: 'r11', product_id: 'p1', rev: '2026.09 · v2', period: '2026.09 적용', note: '간편고지 항목 정리' },
    { id: 'r10', product_id: 'p1', rev: '2026.03 · v1', period: '과거 계약 확인용', note: '이전 약관' },
    { id: 'r21', product_id: 'p2', rev: '2026.08 · v1.3', period: '현재 교육자료', note: '비용 담보 예시 추가' },
    { id: 'r31', product_id: 'p3', rev: '2026.08 · v3', period: '2026.08 적용', note: '성장 단계 표 개정' },
  ];
  const documents = [
    { id: 'd1', product_id: 'p1', revision_id: 'r11', type: '1매형', title: '건강보험 뉴 라이프 핵심 1매형', version: 'v2.1', trust: 'official', apply: 'current', audience: 'planner', tags: ['현장', '안내'], summary: '현장 설명용 핵심 1매형 자료', views: 0 },
    { id: 'd2', product_id: 'p1', revision_id: 'r11', type: '약관', title: '건강보험 뉴 라이프 보통약관', version: 'v2', trust: 'official', apply: 'current', audience: 'customer', tags: ['보통약관'], summary: '현재 적용 보통약관', views: 0 },
    { id: 'd3', product_id: 'p1', revision_id: 'r10', type: '약관', title: '건강보험 뉴 라이프 보통약관', version: 'v1', trust: 'official', apply: 'past', audience: 'customer', tags: ['보통약관', '과거'], summary: '과거 계약 확인용. 최신 파일로 자동 대체하지 않음', views: 0 },
    { id: 'd4', product_id: 'p2', revision_id: 'r21', type: '교육자료', title: '운전자보험 안전동행 상품교육', version: 'v1.3', trust: 'official', apply: 'current', audience: 'internal', tags: ['교육', 'PPT'], summary: '비용 담보 예시 포함 교육자료', views: 0 },
    { id: 'd5', product_id: 'p3', revision_id: 'r31', type: '약관', title: '자녀보험 아이사랑 보통약관', version: 'v3', trust: 'official', apply: 'current', audience: 'customer', tags: ['보통약관'], summary: '2026.08 적용 보통약관', views: 0 },
    { id: 'd6', product_id: 'p2', revision_id: 'r21', type: '전산안내', title: '9월 설계 화면 임시 조치 안내', version: 'v1.0', trust: 'reference', apply: 'current', audience: 'internal', tags: ['전산', '장애'], summary: '설계 화면 오류 임시 조치', views: 0 },
  ];
  const faqs = [
    { id: 'f1', product_id: 'p1', revision_id: 'r11', q: '고혈압 약을 복용 중인 고객도 간편심사형 가입이 가능한가요?', a: '복약 사실만으로 가입 가능 여부가 확정되지는 않습니다. 상품별 간편고지 항목과 최근 치료·입원 이력을 확인한 뒤 전산 심사 결과에 따라 안내해야 합니다.', source: '상품요약서 v2.1, 간편고지 항목 3번', based_on: '2026.08.27', views: 128 },
    { id: 'f2', product_id: 'p2', revision_id: 'r21', q: '교통사고처리지원금은 여러 보험에 가입하면 중복 지급되나요?', a: '실제 손해를 보상하는 비용 담보는 합산해 실제 손해액을 초과하지 않는 범위에서 비례 보상될 수 있습니다. 특별약관을 기준으로 안내해야 합니다.', source: '특별약관 v1.3', based_on: '2026.08.26', views: 96 },
  ];
  const notices = [
    { id: 'n1', level: 'urgent', title: '건강보험 A 설계 화면 오류 및 임시 조치 안내', body: '전산 확인 중입니다. 임시 조치는 전산 안내 문서를 확인하세요.', at: '2026.08.28 09:20', views: 184 },
    { id: 'n2', level: 'new', title: '9월 신상품 교육 일정 및 사전 학습자료', body: '상품교육팀 주관. 사전 학습자료를 확인하세요.', at: '2026.08.27 16:30', views: 321 },
    { id: 'n3', level: 'new', title: '운전자보험 B 약관 및 1매형 자료 교체', body: '9월 1일 적용. 기존 자료와 구분해 사용하세요.', at: '2026.08.26 11:00', views: 203 },
  ];
  return {
    v: 1, users, sessions: [],
    products, revisions, documents,
    doc_versions: documents.map((d) => ({ id: d.id + '-v1', document_id: d.id, version: d.version, created_at: '2026.08.27', file_ref: null })),
    approvals: [], questions: [], answers: [], followups: [], faqs,
    assignments: [], notices, bookmarks: [], subscriptions: [], notifications: [], audit: [],
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { seed };
