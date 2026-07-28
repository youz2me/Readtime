// 완독 시간 예측 로직.
//
// 공식:  예상시간(분) = (페이지수 × 페이지당글자수 × 장르계수) ÷ 개인CPM
//   - 페이지당글자수: 장르별 휴리스틱 추정표 (A안). 초기값 — 나중에 실측 피드백으로 보정될 자리.
//   - 장르계수: 선호 장르는 빠르게(<1), 비선호는 느리게(>1). 초기 가설값.
//   - 개인CPM: 글자/분. 측정 전에는 기본값.
//
// 값이 틀린 건 괜찮다. 하드코딩 상수가 아니라 "데이터로 갱신 가능한 테이블"로 두는 게 설계 포인트.

// 장르별 페이지당 글자 수 추정표
export const CHARS_PER_PAGE = {
  novel: 600, // 소설
  essay: 500, // 에세이
  humanities: 700, // 인문
  selfhelp: 680, // 자기계발
  default: 620,
};

// 페이지-글자 관계가 깨져 예측이 부정확한 유형 (B안: 숨기지 않고 정직 배지로 표시)
export const UNSUPPORTED = ['comic', 'children', 'poetry', 'picturebook', 'photo'];

export const DEFAULT_CPM = 500; // 한국어 성인 대략 400~600자/분

// 장르 계수
export function genreCoeff(category, favorites = []) {
  if (favorites.includes(category)) return 0.9; // 선호 → 빠름
  if (favorites.length > 0) return 1.15; // 비선호 → 느림
  return 1.0; // 취향 정보 없음
}

// 분 → "N시간 M분" 사람이 읽는 문자열
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function predict({ pages, category = 'default', cpm = DEFAULT_CPM, favorites = [] }) {
  const supported = !UNSUPPORTED.includes(category);
  const charsPerPage = CHARS_PER_PAGE[category] ?? CHARS_PER_PAGE.default;
  const coeff = genreCoeff(category, favorites);

  const totalChars = pages * charsPerPage * coeff;
  const point = Math.max(1, Math.round(totalChars / cpm)); // 분(점 추정)

  // 오차 ±22% 정직 구간 (요구 오차 ±20~30% 반영)
  const spread = 0.22;
  const low = Math.max(1, Math.round(point * (1 - spread)));
  const high = Math.round(point * (1 + spread));

  return {
    supported,
    minutes: point,
    text: formatMinutes(point),
    range: { low, high, text: `${formatMinutes(low)} ~ ${formatMinutes(high)}` },
    inputs: { pages, category, cpm, charsPerPage, coeff },
    disclaimer: '재미로 만든 예측이며 개인 속도에 따라 오차가 있을 수 있어요.',
    note: supported
      ? null
      : '이 유형(만화·어린이·시집·그림책 등)은 페이지-글자 관계가 달라 예측 정확도가 낮아요.',
  };
}
