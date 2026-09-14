// 상품지원 허브 · 설정과 어댑터 (미확정 항목은 여기서만 바꾼다)
// SSO·조직·전달정책·호스팅을 코드에 고정하지 않는다.
'use strict';

const config = {
  // 인증 방식: 'local-dev'(개발용 계정) | 'sso'(어댑터 스텁, 미연동)
  authMode: 'local-dev',
  // 알림 채널: 'inapp'(앱 내 알림함) | 'kakao'(미연동)
  notifyChannel: 'inapp',
  // PDF 본문 검색: 'meta'(제목·설명·태그) | 'fulltext'(미연동)
  pdfSearch: 'meta',
  // 파일 저장소: 'local'(./files) | 'object'(미연동)
  fileStore: 'local',
  // 외부 전달 정책: 기본값. 문서별 override가 우선한다.
  defaultAudience: 'internal', // internal(매니저 내부용) | planner(설계사 전달 가능) | customer(고객 전달 가능)
  // 조직 체계 미확정: 소속은 문자열로만 보관하고 체계 검증은 하지 않는다
  orgStrict: false,
};

const adapters = {
  auth: {
    // SSO 확정 시 이 함수만 교체한다. {id, username, role, org} 반환.
    async ssoLogin(_token) { throw new Error('SSO 미연동: authMode=sso 확정 후 연결 필요'); },
  },
  notify: {
    // 외부 메신저 확정 시 교체. 현재는 앱 내 알림함만 쓴다.
    async external(_user, _message) { throw new Error('외부 알림 미연동'); },
  },
  pdfText: {
    // PDF 텍스트 추출 확정 시 교체. 현재 메타데이터 검색만 제공한다.
    async extract(_fileRef) { throw new Error('PDF 본문 검색 미연동'); },
  },
  files: {
    // 오브젝트 스토리지 확정 시 교체 (put/get/remove + 서명 URL)
    async put() { throw new Error('외부 저장소 미연동'); },
    async get() { throw new Error('외부 저장소 미연동'); },
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { config, adapters };
