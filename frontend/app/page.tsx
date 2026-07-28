"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Genre = "novel" | "essay" | "humanities" | "selfhelp";
type Step = "calibrate" | "search" | "result";
type TestPhase = "ready" | "reading" | "question" | "complete";

type Book = {
  title: string;
  author: string;
  pages: number;
  category: string;
  supported: boolean;
  isbn?: string;
  cover?: string;
  description?: string;
  publisher?: string;
  publishedAt?: string;
  link?: string;
};

type Prediction = {
  minutes: number;
  range: { low: number; high: number };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const IS_LOCAL = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");

const GENRES: Array<{ id: Genre; label: string; caption: string }> = [
  { id: "novel", label: "소설", caption: "인물과 장면을 따라 읽는 글" },
  { id: "essay", label: "에세이", caption: "경험과 감정을 풀어낸 글" },
  { id: "humanities", label: "인문", caption: "개념과 논리를 연결하는 글" },
  { id: "selfhelp", label: "자기계발", caption: "방법과 사례를 설명하는 글" },
];

const PASSAGES: Record<Genre, { text: string; question: string; answers: string[]; correct: number }> = {
  novel: {
    text: `기차가 작은 역에 멈춘 것은 해가 산등성이 아래로 사라질 무렵이었다. 승강장에는 낡은 시계와 나무 의자 하나뿐이었고, 내린 사람은 지호 혼자였다. 그는 오래 접어둔 편지를 주머니에서 꺼냈다. 주소는 빗물에 번져 있었지만 마지막 문장만은 또렷했다. “등대가 보이는 집에서 기다릴게.”

역을 나서자 바다 냄새가 났다. 지도에는 십 분이면 닿는 길이라고 적혀 있었지만 골목은 생각보다 복잡했다. 지호는 두 번이나 같은 우체통 앞을 지나쳤다. 세 번째로 그 자리에 섰을 때, 담장 너머에서 노란 불빛이 켜졌다. 그리고 누군가 그의 이름을 아주 오래전처럼 불렀다.

그는 곧바로 대답하지 않았다. 여기까지 오는 동안 준비했던 말들이 갑자기 모두 쓸모없게 느껴졌다. 대신 손에 쥔 편지를 다시 접어 주머니에 넣고, 열린 대문 쪽으로 천천히 걸어갔다.`,
    question: "지호가 찾아가던 집을 알려준 단서는 무엇이었나요?",
    answers: ["노란 우체통", "등대가 보이는 집", "산등성이 아래의 역"],
    correct: 1,
  },
  essay: {
    text: `아침에 같은 길을 걷더라도 매일 같은 풍경을 보는 것은 아니다. 어떤 날에는 빵집 앞에 놓인 빈 상자가 먼저 보이고, 어떤 날에는 신호를 기다리는 사람의 구두가 눈에 들어온다. 풍경이 달라진 것이 아니라 내가 들고 나온 마음이 달라진 것이다.

나는 한동안 산책에도 목적이 있어야 한다고 생각했다. 몇 걸음을 걸었는지 기록하고, 정해둔 시간 안에 돌아와야 마음이 놓였다. 그러다 어느 날 휴대전화를 집에 두고 나왔다. 처음에는 불안했지만 곧 걸음이 느려졌다. 골목의 작은 화분과 오래된 간판처럼 기록되지 않는 것들이 보이기 시작했다.

그날 이후 가끔은 아무것도 남기지 않는 산책을 한다. 성과가 없어서 실패한 시간이 아니라, 측정하지 않았기에 온전히 내 것이 된 시간이라고 생각하면서.`,
    question: "글쓴이가 휴대전화 없이 산책하며 발견한 변화는 무엇인가요?",
    answers: ["걸음이 더 빨라졌다", "기록되지 않던 것들이 보였다", "새로운 운동 경로를 만들었다"],
    correct: 1,
  },
  humanities: {
    text: `지도는 현실을 작게 옮겨놓은 그림처럼 보이지만, 실제로는 무엇을 남기고 무엇을 지울지 결정한 결과다. 모든 골목과 나무, 사람의 움직임을 한 장에 담을 수 없기 때문이다. 지도를 만드는 사람은 사용 목적에 따라 중요한 정보를 선택하고 나머지를 생략한다.

지하철 노선도는 이 사실을 잘 보여준다. 실제 거리와 방향은 크게 왜곡되지만, 승객에게 중요한 환승 관계는 훨씬 선명해진다. 정확한 지형을 포기하는 대신 이동에 필요한 이해를 얻는 것이다. 그러므로 좋은 지도는 현실과 똑같은 지도가 아니라, 사용자의 질문에 잘 답하는 지도다.

우리가 데이터를 정리하거나 복잡한 현상을 설명할 때도 같은 선택을 한다. 무엇을 측정했는지만큼 무엇을 제외했는지 밝혀야 하는 이유가 여기에 있다.`,
    question: "글에서 좋은 지도를 판단하는 기준은 무엇인가요?",
    answers: ["현실과 완전히 똑같은가", "모든 정보를 담았는가", "사용자의 질문에 잘 답하는가"],
    correct: 2,
  },
  selfhelp: {
    text: `새로운 습관을 만들 때 가장 흔한 실수는 의욕이 가장 높은 날을 기준으로 계획하는 것이다. 첫날에는 한 시간 운동할 수 있지만 피곤한 수요일 저녁에도 같은 계획을 지키기는 어렵다. 좋은 계획은 최고의 나보다 평범한 나를 기준으로 설계되어야 한다.

행동의 크기를 줄이면 시작을 방해하는 마찰도 작아진다. 매일 책 한 권을 읽겠다는 목표 대신 잠들기 전 두 쪽을 펼치는 행동을 정하는 식이다. 두 쪽은 작아 보이지만 반복되면 책을 펼치는 일이 더 이상 결심을 요구하지 않게 된다.

중요한 것은 처음부터 큰 성과를 내는 것이 아니라, 다음 행동이 자연스럽게 이어지는 환경을 만드는 것이다. 꾸준함은 강한 의지의 증거라기보다 시작하기 쉽게 설계된 시스템의 결과에 가깝다.`,
    question: "글에서 습관 계획의 기준으로 삼으라고 한 것은 무엇인가요?",
    answers: ["의욕이 가장 높은 날", "평범한 상태의 나", "가장 큰 성과를 낸 사람"],
    correct: 1,
  },
};

const SAMPLE_BOOKS: Book[] = [
  { title: "데미안", author: "헤르만 헤세", pages: 240, category: "novel", supported: true },
  { title: "불편한 편의점", author: "김호연", pages: 268, category: "novel", supported: true },
  { title: "여행의 이유", author: "김영하", pages: 216, category: "essay", supported: true },
  { title: "코스모스", author: "칼 세이건", pages: 720, category: "humanities", supported: true },
  { title: "사피엔스", author: "유발 하라리", pages: 636, category: "humanities", supported: true },
  { title: "아주 작은 습관의 힘", author: "제임스 클리어", pages: 320, category: "selfhelp", supported: true },
  { title: "슬램덩크 1", author: "이노우에 다케히코", pages: 190, category: "comic", supported: false },
];

const BESTSELLERS: Book[] = [
  { title: "소년이 온다", author: "한강", pages: 216, category: "novel", supported: true },
  { title: "모순", author: "양귀자", pages: 308, category: "novel", supported: true },
  { title: "초역 부처의 말", author: "코이케 류노스케", pages: 264, category: "humanities", supported: true },
  { title: "내가 틀릴 수도 있습니다", author: "비욘 나티코 린데블라드", pages: 312, category: "essay", supported: true },
  { title: "도둑맞은 집중력", author: "요한 하리", pages: 464, category: "humanities", supported: true },
  { title: "불변의 법칙", author: "모건 하우절", pages: 420, category: "selfhelp", supported: true },
];

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}시간 ${rest ? `${rest}분` : ""}` : `${rest}분`;
}

function getReadingSpeedGuide(wpm: number) {
  if (wpm < 120) return "천천히 읽는 편";
  if (wpm < 290) return "일반 성인 범위";
  if (wpm < 360) return "빠른 편";
  return "매우 빠른 편";
}

export default function Home() {
  const [step, setStep] = useState<Step>("calibrate");
  const [genre, setGenre] = useState<Genre>("novel");
  const [phase, setPhase] = useState<TestPhase>("ready");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [cpm, setCpm] = useState(500);
  const [wpm, setWpm] = useState(200);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [searchMessage, setSearchMessage] = useState("읽고 싶은 책의 제목을 검색하세요.");
  const [bestsellers, setBestsellers] = useState<Book[]>(BESTSELLERS);
  const [bestsellerDemoMode, setBestsellerDemoMode] = useState(false);

  const passage = PASSAGES[genre];
  const charCount = passage.text.replace(/\s/g, "").length;
  const wordCount = passage.text.trim().split(/\s+/).length;
  const genreName = GENRES.find((item) => item.id === genre)?.label ?? "책";
  const speedGuide = getReadingSpeedGuide(wpm);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBestsellers() {
      try {
        const response = await fetch(`${API_BASE}/api/bestsellers`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (Array.isArray(data.items) && data.items.length) {
          setBestsellers(data.items);
          setBestsellerDemoMode(false);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") setBestsellerDemoMode(true);
      }
    }
    loadBestsellers();
    return () => controller.abort();
  }, []);

  const recommendations = useMemo(() => {
    if (!selected) return [];
    const pool = [...books, ...bestsellers, ...SAMPLE_BOOKS];
    const booksWithCovers = pool.filter((book) => book.cover);
    const recommendationPool = booksWithCovers.length >= 3 ? booksWithCovers : pool;
    const unique = new Map<string, Book>();
    recommendationPool
      .filter((book) => book.supported && book.title !== selected.title)
      .sort((a, b) => {
        const genreScoreA = a.category === selected.category ? 0 : 1;
        const genreScoreB = b.category === selected.category ? 0 : 1;
        const timeScoreA = Math.abs(a.pages - selected.pages);
        const timeScoreB = Math.abs(b.pages - selected.pages);
        return genreScoreA - genreScoreB || timeScoreA - timeScoreB;
      })
      .forEach((book) => unique.set(book.title, book));
    return [...unique.values()].slice(0, 3);
  }, [books, bestsellers, selected]);

  function resetTest(nextGenre?: Genre) {
    if (nextGenre) setGenre(nextGenre);
    setPhase("ready");
    setStartedAt(null);
    setElapsed(null);
  }

  function showToast(message: string) {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => current?.id === id ? null : current);
    }, 3600);
  }

  function startTest() {
    setPhase("reading");
    setStartedAt(Date.now());
  }

  function finishTest() {
    if (!startedAt) return;
    const seconds = Math.max(1, (Date.now() - startedAt) / 1000);
    if (seconds < 8) {
      resetTest();
      showToast("측정 시간이 너무 짧아 결과를 저장하지 않았어요. 글을 처음부터 다시 읽어주세요.");
      return;
    }
    setElapsed(seconds);
    setPhase("question");
  }

  function answer(index: number) {
    if (index !== passage.correct || !elapsed) {
      resetTest();
      showToast("내용 확인에 실패해 이번 측정은 제외했어요. 다시 측정해주세요.");
      return;
    }
    const measuredCpm = Math.round(charCount / (elapsed / 60));
    const measuredWpm = Math.round(wordCount / (elapsed / 60));
    setCpm(Math.min(1200, Math.max(150, measuredCpm)));
    setWpm(Math.min(500, Math.max(50, measuredWpm)));
    setPhase("complete");
  }

  async function searchBooks(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchMessage("책을 찾고 있어요.");
    try {
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setBooks(data.items);
      setDemoMode(false);
      setSearchMessage(`${data.count}권을 찾았어요.`);
    } catch {
      const hits = SAMPLE_BOOKS.filter((book) =>
        `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase()),
      );
      setBooks(hits.length ? hits : SAMPLE_BOOKS);
      setDemoMode(true);
      setSearchMessage("현재는 샘플 도서로 결과를 보여드려요.");
    } finally {
      setSearching(false);
    }
  }

  async function chooseBook(book: Book) {
    if (!book.supported) {
      showToast("만화·그림책처럼 텍스트 밀도를 추정하기 어려운 책은 아직 시간을 계산할 수 없어요.");
      return;
    }
    let resolvedBook = book;
    if (!book.pages && book.isbn) {
      try {
        const response = await fetch(`${API_BASE}/api/books/${encodeURIComponent(book.isbn)}`);
        if (response.ok) {
          const data = await response.json();
          resolvedBook = { ...book, ...data.item };
        }
      } catch {
        // 아래의 페이지 수 안내로 처리합니다.
      }
    }
    if (!resolvedBook.pages) {
      showToast("이 책은 페이지 정보를 확인할 수 없어 아직 시간을 계산하기 어려워요.");
      return;
    }
    setSelected(resolvedBook);
    const localEstimate = () => {
      const charsPerPage = { novel: 600, essay: 500, humanities: 700, selfhelp: 680 }[resolvedBook.category] ?? 620;
      const coefficient = resolvedBook.category === genre ? 0.9 : 1.15;
      const minutes = Math.max(1, Math.round((resolvedBook.pages * charsPerPage * coefficient) / cpm));
      return { minutes, range: { low: Math.round(minutes * 0.78), high: Math.round(minutes * 1.22) } };
    };
    try {
      const response = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: resolvedBook.pages, category: resolvedBook.category, cpm, favorites: [genre] }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPrediction({ minutes: data.minutes, range: data.range });
    } catch {
      setPrediction(localEstimate());
      setDemoMode(true);
    }
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function go(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function skipCalibration() {
    setWpm(200);
    setCpm(500);
    go("search");
  }

  return (
    <main>
      <header className="topbar">
        <button className="wordmark" type="button" onClick={() => go("calibrate")}>READTIME</button>
        <nav aria-label="진행 단계">
          <button className={step === "calibrate" ? "active" : ""} onClick={() => go("calibrate")}>속도 측정</button>
          <button
            className={step === "search" ? "active" : ""}
            onClick={() => (phase === "complete" || IS_LOCAL) && go("search")}
            disabled={phase !== "complete" && !IS_LOCAL}
          >
            책 검색
          </button>
          <button className={step === "result" ? "active" : ""} disabled={!prediction} onClick={() => prediction && go("result")}>예상 시간</button>
        </nav>
        <span className="step-count">{step === "calibrate" ? "1" : step === "search" ? "2" : "3"} / 3</span>
      </header>

      {step === "calibrate" && (
        <section className="screen calibration-screen">
          <div className="screen-heading">
            <p>나에게 맞는 기준부터</p>
            <h1>평소 읽는 장르로<br />속도를 측정해보세요.</h1>
            <p className="lead">장르마다 읽는 방식이 다르니까, 하나의 예시 글로 모두를 재지 않습니다.</p>
          </div>

          <div className="genre-options">
            {GENRES.map((item) => (
              <button key={item.id} className={genre === item.id ? "selected" : ""} onClick={() => resetTest(item.id)}>
                <strong>{item.label}</strong>
                <span>{item.caption}</span>
              </button>
            ))}
          </div>

          <div className="test-stage">
            {phase === "ready" && (
              <div className="quiet-state">
                <p>{genreName} 예시 글 · 약 {wordCount}단어</p>
                <h2>글을 읽고 질문에 답해보세요.</h2>
                <span>시작 버튼을 누르면 글과 타이머가 함께 나타납니다.<br />끝까지 읽은 뒤 내용 확인 질문에 답해야 측정이 완료돼요.</span>
                <div className="action-pair">
                  <button className="primary" onClick={startTest}>읽기 시작</button>
                  {IS_LOCAL && (
                    <button className="secondary" onClick={skipCalibration}>
                      측정 건너뛰기
                    </button>
                  )}
                </div>
                {IS_LOCAL && <small className="skip-note">평균 속도인 분당 200단어로 계산합니다.</small>}
              </div>
            )}

            {phase === "reading" && (
              <div className="reading-view">
                <div className="reading-meta"><span>{genreName} 예시 글 · 읽은 뒤 질문 1개</span><span>측정 중</span></div>
                <article>{passage.text}</article>
                <button className="primary wide" onClick={finishTest}>다 읽었어요</button>
              </div>
            )}

            {phase === "question" && (
              <div className="question-view">
                <p>내용 확인</p>
                <h2>{passage.question}</h2>
                <div>
                  {passage.answers.map((item, index) => (
                    <button key={item} onClick={() => answer(index)}>{item}</button>
                  ))}
                </div>
              </div>
            )}

            {phase === "complete" && (
              <div className="complete-view">
                <p>측정 완료</p>
                <h2>1분에 약 <strong>{wpm}단어</strong>를 읽어요.</h2>
                <div className="speed-guide">
                  <strong>짧은 예시 글 기준 · {speedGuide}</strong>
                  <span>한국어 성인 묵독 연구의 평균은 약 202단어/분이에요.</span>
                  <small>글의 길이와 난이도, 익숙한 정도에 따라 달라질 수 있어요.</small>
                </div>
                <span>{Math.round(elapsed ?? 0)}초 동안 {wordCount}단어를 읽은 결과예요. 한국어는 띄어쓰기 단위로 세었어요.</span>
                <div className="action-pair">
                  <button className="primary" onClick={() => go("search")}>책 검색하기</button>
                  <button className="secondary" onClick={() => resetTest()}>다시 측정</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {step === "search" && (
        <section className="screen search-screen">
          <div className="screen-heading centered">
            <p>나의 읽기 속도 1분에 약 {wpm}단어 · 선호 장르 {genreName}</p>
            <h1>어떤 책을 읽을까요?</h1>
            <p className="lead">책을 선택하면 방금 측정한 속도로 완독 시간을 계산합니다.</p>
          </div>

          <form className="book-search" onSubmit={searchBooks}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="책 제목을 입력하세요" aria-label="책 제목" />
            <button className="primary" disabled={searching}>{searching ? "검색 중" : "검색"}</button>
          </form>
          <p className="search-message">{searchMessage}{demoMode && " · sample mode"}</p>

          {books.length > 0 && (
            <div className="search-results">
              <div className="book-section-heading">
                <p>검색 결과</p>
                <h2>찾으신 책이에요</h2>
              </div>
              <div className="book-grid">
                {books.map((book) => (
                  <button key={book.title} className="book-card" onClick={() => chooseBook(book)}>
                    <span className="book-cover">
                      {book.cover ? <img src={book.cover} alt="" /> : book.title.slice(0, 1)}
                    </span>
                    <strong>{book.title}</strong>
                    <small>{book.author}</small>
                    <span>{book.pages || "?"}쪽 · {book.supported ? "시간 예측" : "예측 미지원"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bestseller-section">
            <div className="book-section-heading">
              <p>지금 많이 읽는 책</p>
              <h2>알라딘 베스트셀러</h2>
              <span>먼저 둘러보고, 마음에 드는 책을 바로 골라보세요.</span>
            </div>
            <div className="bestseller-list">
              {bestsellers.map((book, index) => (
                <button key={book.title} className="book-card bestseller-card" onClick={() => chooseBook(book)}>
                  <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="book-cover">
                    {book.cover ? <img src={book.cover} alt="" /> : book.title.slice(0, 1)}
                  </span>
                  <strong>{book.title}</strong>
                  <small>{book.author}</small>
                  <span>{book.pages ? `${book.pages}쪽` : "페이지 선택 시 확인"} · 예상 시간 보기</span>
                </button>
              ))}
            </div>
            {bestsellerDemoMode && <p className="data-note">백엔드 연결 전이라 예시 목록을 보여드리고 있어요.</p>}
          </div>
        </section>
      )}

      {step === "result" && selected && prediction && (
        <section className="result-screen">
          <div className="result-hero">
            <div className="result-book-cover">
              {selected.cover ? <img src={selected.cover} alt={`${selected.title} 표지`} /> : selected.title.slice(0, 1)}
            </div>
            <div>
              <p>
                {selected.author}
                {selected.publisher && ` · ${selected.publisher}`}
                {` · ${selected.pages}쪽`}
              </p>
              <h1>{selected.title}</h1>
              {selected.description && <p className="book-description">{selected.description}</p>}
              <p className="result-copy">지금 속도로 읽으면</p>
              <div className="result-time">{formatMinutes(prediction.minutes)}</div>
              <span>예상 범위 {formatMinutes(prediction.range.low)} – {formatMinutes(prediction.range.high)}</span>
                <div className="result-facts">
                <div><strong>약 {wpm}단어</strong><span>1분에 읽는 양</span></div>
                  <div><strong>{genreName}</strong><span>선호 장르</span></div>
                  <div><strong>약 ±{formatMinutes(Math.max(
                    prediction.minutes - prediction.range.low,
                    prediction.range.high - prediction.minutes,
                  ))}</strong><span>예상 오차</span></div>
                </div>
            </div>
          </div>

          <div className="recommend-section">
            <div>
              <p>다음 책도 골라보세요</p>
              <h2>비슷한 결의 추천</h2>
            </div>
            <div className="recommend-grid">
              {recommendations.map((book) => (
                <button key={book.title} onClick={() => chooseBook(book)}>
                  <span className="mini-cover">
                    {book.cover ? <img src={book.cover} alt={`${book.title} 표지`} /> : book.title.slice(0, 1)}
                  </span>
                  <strong>{book.title}</strong>
                  <small>{book.author} · {book.pages ? `${book.pages}쪽` : "페이지 선택 시 확인"}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="result-actions">
            <button className="primary" onClick={() => go("search")}>다른 책 검색</button>
            <button className="secondary" onClick={() => go("calibrate")}>속도 다시 측정</button>
          </div>
        </section>
      )}

      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          <span aria-hidden="true">!</span>
          <p>{toast.message}</p>
          <button type="button" aria-label="알림 닫기" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </main>
  );
}
