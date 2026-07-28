// 알라딘 상품 검색 API 래퍼.
//
// 중요: 부하 테스트 때 알라딘(남의 서버)을 수천 번 때리면 안 된다.
// 그래서 USE_MOCK 으로 목(mock) 응답을 쓴다. 로컬/부하 실험에서는 목이 기본.
// 실제 호출은 ALADIN_TTB_KEY 가 있고 USE_MOCK=0 일 때만.

// 알라딘 카테고리명 → 우리 내부 장르 키
function categorize(categoryName = '') {
  const c = categoryName;
  if (/만화|코믹/.test(c)) return 'comic';
  if (/어린이|유아/.test(c)) return 'children';
  if (/시|에세이\/시/.test(c) && /시집|시\//.test(c)) return 'poetry';
  if (/그림책/.test(c)) return 'picturebook';
  if (/사진|화보|도감/.test(c)) return 'photo';
  if (/에세이/.test(c)) return 'essay';
  if (/인문/.test(c)) return 'humanities';
  if (/자기계발/.test(c)) return 'selfhelp';
  if (/소설/.test(c)) return 'novel';
  return 'default';
}

const UNSUPPORTED = new Set(['comic', 'children', 'poetry', 'picturebook', 'photo']);

// --- 목 데이터: 지원/비지원 분기를 둘 다 보여주도록 구성 ---
const MOCK_BOOKS = [
  { title: '데미안', author: '헤르만 헤세', pages: 240, category: 'novel' },
  { title: '아주 작은 습관의 힘', author: '제임스 클리어', pages: 320, category: 'selfhelp' },
  { title: '코스모스', author: '칼 세이건', pages: 720, category: 'humanities' },
  { title: '슬램덩크 1', author: '이노우에 다케히코', pages: 190, category: 'comic' }, // 비지원
  { title: '강아지똥', author: '권정생', pages: 36, category: 'children' }, // 비지원
];

function decorate(book) {
  return { ...book, supported: !UNSUPPORTED.has(book.category) };
}

function mockSearch(query) {
  const q = query.toLowerCase();
  const hit = MOCK_BOOKS.filter((b) => b.title.toLowerCase().includes(q));
  return (hit.length ? hit : MOCK_BOOKS).map(decorate);
}

function normalizeAladin(item) {
  const category = categorize(item.categoryName);
  return decorate({
    title: item.title,
    author: item.author,
    pages: item.subInfo?.itemPage ?? item.itemPage ?? 0,
    category,
    categoryName: item.categoryName,
    isbn: item.isbn13,
  });
}

export async function searchBooks(query, { useMock, ttbKey } = {}) {
  if (useMock || !ttbKey) return mockSearch(query);

  const url = new URL('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx');
  url.searchParams.set('ttbkey', ttbKey);
  url.searchParams.set('Query', query);
  url.searchParams.set('QueryType', 'Title');
  url.searchParams.set('MaxResults', '10');
  url.searchParams.set('SearchTarget', 'Book');
  url.searchParams.set('Cover', 'None');
  url.searchParams.set('Output', 'js');
  url.searchParams.set('Version', '20131101');
  url.searchParams.set('OptResult', 'itemPage');

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Aladin API ${res.status}`);
  const data = await res.json();
  return (data.item ?? []).map(normalizeAladin);
}
