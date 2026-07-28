"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { ADDITIONAL_PASSAGES } from "./additional-passages";

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

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL
  ?? (process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "https://api.youjinlee.com")
).replace(/\/$/, "");
const IS_LOCAL = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");

const GENRES: Array<{ id: Genre; label: string; caption: string }> = [
  { id: "novel", label: "소설", caption: "인물과 장면을 따라 읽는 글" },
  { id: "essay", label: "에세이", caption: "경험과 감정을 풀어낸 글" },
  { id: "humanities", label: "인문", caption: "개념과 논리를 연결하는 글" },
  { id: "selfhelp", label: "자기계발", caption: "방법과 사례를 설명하는 글" },
];

type Passage = { title: string; text: string; question: string; answers: string[]; correct: number };

const PASSAGE_EXTENSIONS: Record<string, string> = {
  "옥상 정원": "두 사람은 물을 주는 요일을 나누고, 비가 온 날에는 화분 아래에 고인 물을 함께 비웠다. 계절이 바뀌자 꽃은 졌지만 새 잎이 돋았다. 옥상은 이제 잠깐 인사를 나누는 작은 정원이 되었다.",
  "파란 우체통": "친구는 갑작스러운 전화에 잠시 놀랐지만 이내 예전처럼 웃었다. 두 사람은 미뤄둔 이야기부터 꺼내지 않았다. 대신 이번 주말에 만나자는 약속을 먼저 잡았다. 유나는 우체통에 넣었던 편지가 어디로 갔는지 더는 궁금하지 않았다.",
  "눈 오는 극장": "도윤은 관객들이 안전하게 돌아가는 모습을 확인한 뒤에야 극장으로 돌아왔다. 비어 있는 상영관에는 아직 화면의 잔상이 남아 있었다. 그는 다음 날 첫 상영 시간을 늦춘다는 안내를 붙이고, 젖은 외투를 의자에 걸어두었다.",
  "비 오는 날의 창문": "멈춰 있는 동안 해야 할 일이 사라지는 것은 아니었다. 다만 무엇부터 시작할지 선명해졌다. 글쓴이는 빈 시간을 길게 만들기보다 하루 중 십 분이라도 남겨두었다. 짧은 여백만으로도 서두르던 마음이 한결 느려졌다.",
  "동네 서점의 속도": "서점 주인은 책을 권할 때 줄거리를 길게 설명하지 않았다. 손님이 고른 책 옆에 다른 한 권을 조용히 놓아둘 뿐이었다. 글쓴이는 그 느슨한 제안 덕분에 취향 밖의 분야까지 읽게 되었고, 서점을 찾는 이유도 조금 달라졌다.",
  "한 그릇의 기억": "어머니는 정확한 양을 재지 않고 눈대중으로 재료를 넣었다. 글쓴이는 몇 숟갈인지 다시 물었지만 대답은 늘 비슷했다. 결국 조리법 옆에 맛을 보며 맞추라는 문장을 적었다. 기억을 옮기는 일에는 숫자만으로 설명하기 어려운 부분도 있었다.",
  "도서관의 분류": "한 분야에서 막힌 독자가 옆 선반의 책을 통해 새로운 단서를 얻기도 한다. 이런 우연은 잘 정리된 체계와 자유로운 이동이 함께 있을 때 생긴다. 도서관은 책의 자리를 알려주는 동시에 다른 질문으로 건너갈 통로도 마련해야 한다.",
  "시간을 재는 방법": "기차 시간표와 공장의 근무표는 같은 시각을 공유할 때 비로소 작동할 수 있었다. 사람들은 약속을 더 정확하게 지킬 수 있게 되었지만, 늦고 빠름을 이전보다 엄격하게 판단하기도 했다. 도구가 생활의 기준까지 바꾼 셈이다. 시간은 점점 더 촘촘하게 나뉘었다.",
  "도시의 벤치": "반대로 그늘과 등받이가 충분한 벤치는 노인과 아이, 잠시 쉬어야 하는 사람을 오래 머물게 한다. 같은 크기의 시설이라도 누구를 떠올리며 만들었는지에 따라 전혀 다른 장소가 된다. 설계에는 언제나 보이지 않는 이용자의 모습이 담긴다.",
  "숫자가 말하지 않는 것": "예를 들어 평균 대기 시간이 짧아도 일부 사람만 유난히 오래 기다렸을 수 있다. 전체 숫자 하나만 보면 그 경험은 쉽게 가려진다. 그래서 자료를 설명할 때는 범위와 예외, 값을 모은 조건을 함께 보여주는 편이 더 정확하다.",
  "완료 기준 정하기": "초안을 만든 뒤에는 동료에게 보여주거나 다음 날 다시 읽으며 고칠 수 있다. 반면 기준 없이 계속 다듬으면 무엇이 나아졌는지 판단하기 어렵다. 작은 완료 지점은 일을 대충 끝내는 선이 아니라, 다음 수정을 시작할 수 있는 발판이다.",
  "회고의 한 문장": "기록이 짧으면 매일 이어가기도 쉬웠다. 며칠 뒤 문장들을 모아보니 자주 막히는 순간과 도움이 된 행동이 반복해서 보였다. 긴 분석을 한 번 쓰는 것보다 짧은 관찰을 꾸준히 남기는 편이 다음 선택을 바꾸는 데 유용했다.",
  "쉬는 시간을 예약하기": "처음에는 쉬는 시간을 일정에 쓰는 일이 어색했다. 하지만 미리 비워둔 칸이 있자 급하지 않은 회의를 그 시간에 넣지 않게 되었다. 휴식 뒤에는 같은 일을 더 짧게 끝내는 날도 늘었다. 쉬는 일도 계획의 일부였다. 일정에는 숨을 고르는 틈도 필요했다.",
  "새벽의 세탁소": "남자는 돌아가기 전 세탁기 위에 작은 메모를 남겼다. 다음 주 같은 시간에 다시 오겠다는 짧은 문장이었다. 주인은 그 종이를 계산대 옆에 붙여두었다. 새벽의 세탁소에는 말보다 반복되는 방문으로 이어지는 관계도 있었다.",
  "비어 있는 액자": "지수는 액자 뒤쪽에 적힌 날짜를 발견했다. 사진이 사라진 날이 아니라 가족이 처음 이 집으로 이사 온 날이었다. 그는 빈 액자를 그대로 걸어두고, 그 아래에 새로 찍은 가족사진을 작은 크기로 한 장 더 놓았다.",
  "느린 엘리베이터": "처음에는 모두 휴대전화만 바라봤지만 기다림이 길어지자 자연스럽게 안부를 묻게 되었다. 수리가 끝난 뒤 엘리베이터는 다시 빨라졌다. 그래도 주민들은 전처럼 말없이 흩어지지 않고, 문이 닫히기 전 짧게 인사를 나누었다.",
  "우산 수리점": "수리가 끝난 우산에는 작은 바느질 자국이 남았다. 새것처럼 보이지는 않았지만 비를 막는 데에는 문제가 없었다. 주인은 고친 흔적도 물건의 시간이라고 말했다. 손님은 다음 비가 오기를 기다리듯 우산을 조심스럽게 접었다.",
  "열한 번째 계단": "다음 날 관리인은 계단 모서리에 눈에 잘 띄는 표시를 붙였다. 사람들은 더 이상 그곳에서 발을 헛디디지 않았다. 그러나 아이는 표시가 생긴 뒤에도 열한 번째 계단에서 잠깐 멈췄다. 자신이 먼저 알아챈 장소라는 생각이 들었기 때문이다.",
  "천천히 식는 차": "차가 미지근해질 때쯤 두 사람의 말도 조금씩 느려졌다. 당장 결론을 내야 한다는 조급함이 사라지자 서로 놓쳤던 이야기가 들렸다. 친구가 돌아간 뒤 글쓴이는 빈 잔을 바로 치우지 않고 한동안 식탁에 두었다.",
  "익숙한 길의 표지판": "며칠 뒤 표지판은 원래 방향으로 고쳐졌지만, 글쓴이는 전처럼 무심히 지나치지 않았다. 익숙한 길에도 누군가 처음 걷는 순간이 있다는 사실을 떠올렸다. 그는 갈림길에서 망설이는 사람을 보면 먼저 목적지를 묻기 시작했다.",
  "서랍 속의 영수증": "영수증의 글자는 조금씩 흐려지고 있었지만 그날의 대화는 선명하게 떠올랐다. 글쓴이는 필요한 기록만 사진으로 남긴 뒤 종이를 버렸다. 물건을 간직하는 것과 기억을 지키는 일이 언제나 같은 것은 아니라고 생각했다.",
  "소리가 없는 아침": "전기가 돌아오자 냉장고와 시계가 한꺼번에 소리를 냈다. 평소에는 알아차리지 못했던 생활의 배경음이었다. 글쓴이는 창문을 닫기 전에 조용한 골목을 한 번 더 바라봤다. 침묵도 사라지고 나서야 들리는 풍경이었다.",
  "빌린 연필": "시험이 끝난 뒤 학생은 연필을 돌려주며 끝이 조금 닳았다고 사과했다. 친구는 괜찮다며 다음에도 빌려주겠다고 말했다. 작은 물건 하나가 오간 일이었지만, 학생은 도움을 청하는 일이 생각보다 어렵지 않다는 것을 알게 되었다.",
  "줄을 서는 방식": "사람들은 표지선을 보고 자연스럽게 한 줄을 만들었지만, 급한 사정이 있는 사람을 위해 자리를 내주기도 했다. 규칙은 순서를 분명하게 했고 대화는 예외를 가능하게 했다. 둘 중 하나만으로는 모두가 편한 줄을 만들기 어려웠다.",
  "이름이 만드는 경계": "새 이름을 붙인 뒤 사람들은 그 공간을 이전과 다르게 사용하기 시작했다. 단순한 빈터였을 때는 지나치던 이들이 잠시 머물렀다. 이름은 장소를 설명하는 표지이면서, 그곳에서 무엇을 할 수 있는지 상상하게 만드는 제안이기도 했다.",
  "기억과 사진": "같은 사진을 본 가족들은 서로 다른 장면을 먼저 이야기했다. 누군가는 날씨를, 다른 사람은 사진 밖에 있던 사람을 기억했다. 사진은 하나의 순간을 남겼지만 그날 전체를 대신하지는 못했다. 기억은 이미지 주변에서 계속 새로 만들어졌다.",
  "공원의 지름길": "관리자는 사람들이 만든 발자국을 막는 대신 정식 산책로로 다듬었다. 계획된 길보다 실제 움직임이 더 적절한 답을 보여준 셈이다. 이후 다른 시설을 배치할 때도 사람들의 이동을 먼저 관찰하고, 도면은 그다음에 수정했다.",
  "번역된 단어": "번역가는 하나의 표현을 고르기 전에 그 말이 쓰이는 상황을 여러 번 떠올렸다. 사전에서 가장 가까운 단어가 대화에서도 자연스러운 것은 아니었다. 결국 뜻뿐 아니라 말하는 사람의 거리감과 감정까지 옮겨야 문장이 살아났다.",
  "내일의 첫 화면": "아침에 노트를 펼치자 전날 적어둔 문장이 바로 보였다. 무엇을 할지 다시 정하는 시간이 줄어들었고, 작은 행동부터 시작할 수 있었다. 하루의 끝에서 다음 시작을 준비하는 습관은 생각보다 큰 에너지를 아껴주었다.",
  "중간 저장의 힘": "저장된 초안은 완성되지 않았지만 다시 시작할 위치를 분명하게 알려주었다. 작업을 멈춰야 할 때도 불안이 줄었다. 다음 날에는 빈 화면이 아니라 어제의 판단에서 출발할 수 있었고, 수정할 부분도 더 쉽게 눈에 들어왔다.",
  "선택지를 줄이는 저녁": "정해둔 선택지는 자유를 빼앗기보다 사소한 결정을 줄여주었다. 남은 에너지는 휴식이나 중요한 대화에 쓸 수 있었다. 글쓴이는 모든 날을 똑같이 만들지 않고, 특히 피곤한 평일 저녁에만 이 방식을 사용했다.",
  "막힌 이유 적기": "이유를 한 줄로 적자 막연한 답답함이 구체적인 문제로 바뀌었다. 자료가 부족한지, 결정을 미루는지, 도움을 요청해야 하는지 구분할 수 있었다. 문제의 이름을 붙이는 일만으로도 다음에 시도할 행동이 훨씬 작고 선명해졌다.",
  "끝난 뒤 정리하기": "정리에는 몇 분밖에 걸리지 않았지만 다음 시작은 눈에 띄게 가벼워졌다. 필요한 파일과 도구가 제자리에 있어 준비 시간이 줄었기 때문이다. 글쓴이는 마무리를 결과를 저장하는 일과 다음 행동을 준비하는 일로 나누어 생각하게 되었다.",
};

const RAW_PASSAGES: Record<Genre, Passage[]> = {
  novel: [{
    title: "등대가 보이는 집",
    text: `기차가 작은 역에 멈춘 것은 해가 산등성이 아래로 사라질 무렵이었다. 승강장에는 낡은 시계와 나무 의자 하나뿐이었고, 내린 사람은 지호 혼자였다. 그는 오래 접어둔 편지를 주머니에서 꺼냈다. 주소는 빗물에 번져 있었지만 마지막 문장만은 또렷했다. “등대가 보이는 집에서 기다릴게.”

역을 나서자 바다 냄새가 났다. 지도에는 십 분이면 닿는 길이라고 적혀 있었지만 골목은 생각보다 복잡했다. 지호는 두 번이나 같은 우체통 앞을 지나쳤다. 세 번째로 그 자리에 섰을 때, 담장 너머에서 노란 불빛이 켜졌다. 그리고 누군가 그의 이름을 아주 오래전처럼 불렀다.

그는 곧바로 대답하지 않았다. 여기까지 오는 동안 준비했던 말들이 갑자기 모두 쓸모없게 느껴졌다. 대신 손에 쥔 편지를 다시 접어 주머니에 넣고, 열린 대문 쪽으로 천천히 걸어갔다.`,
    question: "지호가 찾아가던 집을 알려준 단서는 무엇이었나요?",
    answers: ["노란 우체통", "등대가 보이는 집", "산등성이 아래의 역"],
    correct: 1,
  }, {
    title: "마지막 버스",
    text: `수연이 정류장에 도착했을 때 전광판에는 막차가 삼 분 뒤 도착한다고 적혀 있었다. 비는 가늘었지만 바람이 세서 우산이 자꾸 뒤집혔다. 벤치 아래에는 젖은 운동화 한 짝이 놓여 있었고, 맞은편 가게의 불은 이미 꺼져 있었다.

버스가 모퉁이를 돌아오는 순간, 골목 끝에서 한 노인이 손을 흔들며 뛰어왔다. 운전기사는 문을 닫으려다 잠시 멈췄다. 수연은 올라타는 대신 우산을 든 채 노인 쪽으로 달려갔다. 함께 버스에 올랐을 때 기사는 아무 말 없이 난방 온도를 조금 높였다.

창밖의 정류장이 멀어지자 노인은 고맙다며 작은 귤 두 개를 건넸다. 수연은 하나만 받아 들고 웃었다. 막차 안에는 젖은 옷 냄새와 귤 향이 천천히 섞이고 있었다.`,
    question: "운전기사가 버스 문을 바로 닫지 않은 이유는 무엇인가요?",
    answers: ["수연이 표를 찾고 있어서", "노인이 버스를 향해 뛰어오고 있어서", "운동화 주인을 기다리려고"],
    correct: 1,
  }, {
    title: "옥상 정원",
    text: `민호는 이사 온 건물의 옥상에서 작은 화분 하나를 발견했다. 흙은 말라 있었지만 이름 모를 싹은 아직 푸른빛을 띠고 있었다. 그는 매일 출근 전에 물을 조금씩 주었다.

몇 주 뒤 싹은 노란 꽃을 피웠다. 그날 저녁 옆집 아이가 옥상으로 올라와 꽃을 보더니 오래전 할아버지가 심은 것이라고 말했다. 민호는 화분을 아이 쪽으로 밀어주었다.

아이는 고개를 저으며 함께 돌보자고 했다. 다음 날부터 옥상에는 물뿌리개가 두 개 놓였다.`,
    question: "화분을 처음 심은 사람은 누구였나요?",
    answers: ["민호", "옆집 아이", "아이의 할아버지"],
    correct: 2,
  }, {
    title: "파란 우체통",
    text: `유나는 매주 금요일이면 문을 닫은 사진관 앞을 지나갔다. 어느 날 그곳에 파란 우체통이 놓였고, 겉면에는 보내지 못한 말을 넣어달라는 문장이 적혀 있었다.

유나는 망설이다 오래 연락하지 못한 친구에게 쓴 편지를 넣었다. 주소도 우표도 없는 편지였다. 다음 주 우체통 옆에는 누군가 남긴 짧은 답장이 붙어 있었다. 늦었다고 생각할 때가 가장 빠를지도 모른다는 내용이었다.

그날 유나는 집에 도착하자마자 친구의 번호를 눌렀다. 신호음이 세 번 울린 뒤 익숙한 목소리가 들렸다.`,
    question: "유나가 집에 돌아와 한 행동은 무엇인가요?",
    answers: ["사진관 문을 열었다", "친구에게 전화를 걸었다", "우체통을 가져왔다"],
    correct: 1,
  }, {
    title: "눈 오는 극장",
    text: `작은 극장의 마지막 상영에는 관객이 세 명뿐이었다. 매표소 직원인 도윤은 폭설 때문에 영화를 취소할지 고민했다. 하지만 먼 곳에서 온 부부가 이 영화를 오래 기다렸다고 말했다.

도윤은 예정대로 영사기를 켰다. 영화가 끝났을 때 눈은 더 많이 쌓여 버스가 끊긴 뒤였다. 그는 창고에서 빗자루를 꺼내 관객들과 함께 극장 앞길을 치웠다.

네 사람은 한참 뒤 큰길까지 걸어 나왔다. 부부는 오늘 본 영화보다 극장 앞에서 보낸 시간을 더 오래 기억할 것 같다고 말했다.`,
    question: "도윤이 상영을 취소하지 않은 이유는 무엇인가요?",
    answers: ["관객이 가득 차서", "부부가 영화를 오래 기다렸다고 해서", "눈이 곧 그칠 예정이라서"],
    correct: 1,
  }, ...ADDITIONAL_PASSAGES.novel],
  essay: [{
    title: "기록하지 않는 산책",
    text: `아침에 같은 길을 걷더라도 매일 같은 풍경을 보는 것은 아니다. 어떤 날에는 빵집 앞에 놓인 빈 상자가 먼저 보이고, 어떤 날에는 신호를 기다리는 사람의 구두가 눈에 들어온다. 풍경이 달라진 것이 아니라 내가 들고 나온 마음이 달라진 것이다.

나는 한동안 산책에도 목적이 있어야 한다고 생각했다. 몇 걸음을 걸었는지 기록하고, 정해둔 시간 안에 돌아와야 마음이 놓였다. 그러다 어느 날 휴대전화를 집에 두고 나왔다. 처음에는 불안했지만 곧 걸음이 느려졌다. 골목의 작은 화분과 오래된 간판처럼 기록되지 않는 것들이 보이기 시작했다.

그날 이후 가끔은 아무것도 남기지 않는 산책을 한다. 성과가 없어서 실패한 시간이 아니라, 측정하지 않았기에 온전히 내 것이 된 시간이라고 생각하면서.`,
    question: "글쓴이가 휴대전화 없이 산책하며 발견한 변화는 무엇인가요?",
    answers: ["걸음이 더 빨라졌다", "기록되지 않던 것들이 보였다", "새로운 운동 경로를 만들었다"],
    correct: 1,
  }, {
    title: "오래 쓰는 물건",
    text: `나는 새 물건을 사면 오래된 물건을 쉽게 버리곤 했다. 더 깨끗하고 편리한 것이 생겼으니 이전 것은 역할을 다했다고 생각했다. 하지만 할머니의 부엌에서는 손잡이가 닳은 냄비와 여러 번 꿰맨 앞치마가 여전히 제자리를 지키고 있었다.

할머니는 물건을 아끼는 이유가 절약 때문만은 아니라고 말했다. 자주 쓴 물건에는 몸의 습관이 남고, 고쳐 쓴 흔적에는 그 시절의 생활이 남는다는 것이다. 낡은 냄비의 찌그러진 자국도 어느 명절에 생겼는지 할머니는 기억했다.

그 뒤로 나는 물건이 고장 나면 먼저 고칠 수 있는지 살핀다. 모든 것을 평생 쓸 수는 없지만, 무엇을 버리는지 한 번 더 생각하는 동안 내 생활의 모양도 조금 더 선명하게 보이기 시작했다.`,
    question: "할머니가 오래된 물건을 계속 사용하는 주된 이유는 무엇인가요?",
    answers: ["새 물건을 살 수 없어서", "물건에 생활의 기억과 습관이 남아서", "부엌을 꾸미기 위해서"],
    correct: 1,
  }, {
    title: "비 오는 날의 창문",
    text: `비 오는 날이면 나는 일부러 창가 자리에 앉는다. 맑은 날에는 목적지를 향해 서둘러 걷지만, 비가 오면 유리 위의 물방울을 따라 시선이 천천히 움직인다.

예전에는 이런 시간을 낭비라고 생각했다. 해야 할 일을 미뤄둔 채 멍하니 있는 것 같았기 때문이다. 그러나 잠시 멈춘 뒤에는 복잡했던 생각의 순서가 자연스럽게 정리되곤 했다.

요즘은 일정표에도 아무것도 하지 않는 시간을 남겨둔다. 빈 시간은 계획의 실패가 아니라 다음 움직임을 위한 여백일 수 있다.`,
    question: "글쓴이가 일정표에 빈 시간을 남기는 이유는 무엇인가요?",
    answers: ["약속을 잊기 위해서", "다음 움직임을 위한 여백을 만들기 위해서", "비 오는 날에만 쉬기 위해서"],
    correct: 1,
  }, {
    title: "동네 서점의 속도",
    text: `큰 서점에서는 원하는 책의 위치를 검색하고 곧장 찾아간다. 동네 서점에서는 검색대가 없어 주인의 손글씨 메모와 진열대를 천천히 살피게 된다.

처음에는 불편했지만 목적 없이 책등을 읽는 동안 예상하지 못한 책을 자주 만났다. 필요한 것을 빨리 찾는 능력과 무엇이 필요한지 새로 발견하는 경험은 서로 다른 종류의 효율이었다.

이제 나는 급한 책은 온라인으로 주문하고, 생각을 넓히고 싶은 날에는 동네 서점에 간다. 느린 방식이 언제나 뒤처진 방식은 아니었다.`,
    question: "글쓴이가 동네 서점에서 얻은 경험은 무엇인가요?",
    answers: ["책을 더 싸게 사는 경험", "예상하지 못한 책을 발견하는 경험", "검색 기술을 배우는 경험"],
    correct: 1,
  }, {
    title: "한 그릇의 기억",
    text: `오랜만에 고향에 내려가 어머니가 끓인 국을 먹었다. 특별한 재료가 들어간 것도 아닌데 첫 숟갈에서 어린 시절의 저녁 풍경이 떠올랐다.

맛을 기억하는 것은 혀만의 일이 아닌 듯했다. 식탁의 높이, 창밖에서 들리던 소리, 마주 앉은 사람의 표정까지 한꺼번에 돌아왔다. 음식은 지나간 시간을 보관하는 작은 그릇이었다.

서울로 돌아오는 날 나는 조리법을 적어달라고 했다. 똑같은 맛을 만들 수는 없어도 그 기억을 다음 식탁으로 옮기고 싶었다.`,
    question: "글쓴이가 조리법을 적어달라고 한 이유는 무엇인가요?",
    answers: ["식당을 열기 위해서", "기억을 다음 식탁으로 이어가고 싶어서", "재료 가격을 계산하려고"],
    correct: 1,
  }, ...ADDITIONAL_PASSAGES.essay],
  humanities: [{
    title: "좋은 지도의 조건",
    text: `지도는 현실을 작게 옮겨놓은 그림처럼 보이지만, 실제로는 무엇을 남기고 무엇을 지울지 결정한 결과다. 모든 골목과 나무, 사람의 움직임을 한 장에 담을 수 없기 때문이다. 지도를 만드는 사람은 사용 목적에 따라 중요한 정보를 선택하고 나머지를 생략한다.

지하철 노선도는 이 사실을 잘 보여준다. 실제 거리와 방향은 크게 왜곡되지만, 승객에게 중요한 환승 관계는 훨씬 선명해진다. 정확한 지형을 포기하는 대신 이동에 필요한 이해를 얻는 것이다. 그러므로 좋은 지도는 현실과 똑같은 지도가 아니라, 사용자의 질문에 잘 답하는 지도다.

우리가 데이터를 정리하거나 복잡한 현상을 설명할 때도 같은 선택을 한다. 무엇을 측정했는지만큼 무엇을 제외했는지 밝혀야 하는 이유가 여기에 있다.`,
    question: "글에서 좋은 지도를 판단하는 기준은 무엇인가요?",
    answers: ["현실과 완전히 똑같은가", "모든 정보를 담았는가", "사용자의 질문에 잘 답하는가"],
    correct: 2,
  }, {
    title: "도서관의 분류",
    text: `도서관의 분류표는 책을 찾기 위한 주소이면서 지식을 바라보는 하나의 관점이다. 비슷한 주제의 책을 가까이 두면 독자는 원하는 책뿐 아니라 주변의 다른 책도 발견할 수 있다. 그러나 어떤 책은 역사이면서 과학이고, 문학이면서 사회에 대한 기록이기도 하다.

한 권의 책을 단 하나의 칸에 넣는 순간 다른 가능성은 보이지 않게 된다. 디지털 검색은 여러 표지를 붙일 수 있어 이 문제를 줄이지만, 검색어를 모르면 발견하기 어렵다는 새로운 한계가 생긴다.

그래서 좋은 지식 체계는 완벽한 분류를 주장하기보다 사용자가 다른 길로 이동할 수 있게 해야 한다. 분류는 정답이 아니라 탐색을 돕는 임시적인 안내선에 가깝다.`,
    question: "글에서 분류를 '임시적인 안내선'이라고 표현한 이유는 무엇인가요?",
    answers: ["모든 책은 한 주제에만 속해서", "분류가 여러 탐색 경로 중 하나이기 때문에", "디지털 검색은 분류가 필요 없어서"],
    correct: 1,
  }, {
    title: "시간을 재는 방법",
    text: `시계가 널리 쓰이기 전 사람들은 해의 위치와 계절의 변화를 통해 시간을 짐작했다. 시간은 지금처럼 동일한 분과 초의 연속이라기보다 생활의 사건과 연결된 감각이었다.

정밀한 시계는 먼 지역의 일정을 맞추고 산업을 조직하는 데 도움을 주었다. 동시에 사람들은 같은 한 시간을 생산성과 효율로 비교하기 시작했다.

시간을 측정하는 도구는 시간을 보여주기만 하지 않는다. 우리가 시간을 사용하고 평가하는 방식에도 영향을 준다.`,
    question: "글에서 정밀한 시계가 바꾼 것은 무엇인가요?",
    answers: ["계절의 길이", "시간을 조직하고 평가하는 방식", "해가 뜨는 방향"],
    correct: 1,
  }, {
    title: "도시의 벤치",
    text: `도시의 벤치는 단순히 앉는 시설처럼 보이지만 위치와 형태에 따라 공간의 사용법을 바꾼다. 서로 마주 보는 벤치는 대화를 유도하고, 한 방향을 보는 벤치는 풍경에 집중하게 한다.

어떤 벤치는 눕지 못하도록 중간에 칸막이를 둔다. 질서를 위한 설계라고 설명되지만, 머물 곳이 없는 사람을 밀어내는 효과도 낳는다.

공공 디자인은 편리함만의 문제가 아니다. 누가 머물 수 있고 누가 배제되는지를 결정한다는 점에서 사회적 선택이기도 하다.`,
    question: "글에서 공공 디자인을 사회적 선택이라고 한 이유는 무엇인가요?",
    answers: ["디자인 비용이 비싸서", "공간에 머물 수 있는 사람을 결정하기 때문에", "모든 벤치가 같은 모양이라서"],
    correct: 1,
  }, {
    title: "숫자가 말하지 않는 것",
    text: `평균은 많은 정보를 하나의 숫자로 압축해 집단의 경향을 보여준다. 그러나 평균 소득만으로는 구성원 사이의 차이가 얼마나 큰지 알기 어렵다.

같은 평균을 가진 두 집단도 한쪽은 값이 고르게 모여 있고 다른 쪽은 극단적으로 나뉘어 있을 수 있다. 숫자가 정확하더라도 해석이 충분하지 않을 수 있는 이유다.

데이터를 읽을 때는 대표값뿐 아니라 분포와 수집 방식도 함께 살펴야 한다. 좋은 질문은 숫자를 의심하는 것이 아니라 숫자가 설명하지 못한 부분을 찾는 일이다.`,
    question: "평균만으로 알기 어려운 것은 무엇인가요?",
    answers: ["집단의 대략적인 경향", "구성원 사이 값의 차이", "자료의 단위"],
    correct: 1,
  }, ...ADDITIONAL_PASSAGES.humanities],
  selfhelp: [{
    title: "작게 시작하는 습관",
    text: `새로운 습관을 만들 때 가장 흔한 실수는 의욕이 가장 높은 날을 기준으로 계획하는 것이다. 첫날에는 한 시간 운동할 수 있지만 피곤한 수요일 저녁에도 같은 계획을 지키기는 어렵다. 좋은 계획은 최고의 나보다 평범한 나를 기준으로 설계되어야 한다.

행동의 크기를 줄이면 시작을 방해하는 마찰도 작아진다. 매일 책 한 권을 읽겠다는 목표 대신 잠들기 전 두 쪽을 펼치는 행동을 정하는 식이다. 두 쪽은 작아 보이지만 반복되면 책을 펼치는 일이 더 이상 결심을 요구하지 않게 된다.

중요한 것은 처음부터 큰 성과를 내는 것이 아니라, 다음 행동이 자연스럽게 이어지는 환경을 만드는 것이다. 꾸준함은 강한 의지의 증거라기보다 시작하기 쉽게 설계된 시스템의 결과에 가깝다.`,
    question: "글에서 습관 계획의 기준으로 삼으라고 한 것은 무엇인가요?",
    answers: ["의욕이 가장 높은 날", "평범한 상태의 나", "가장 큰 성과를 낸 사람"],
    correct: 1,
  }, {
    title: "집중을 되찾는 시작",
    text: `집중이 흐트러질 때 우리는 의지가 약하다고 자책하기 쉽다. 하지만 책상 위에 알림이 켜진 휴대전화가 있고 브라우저 탭이 열 개라면 누구라도 한 가지 일에 머물기 어렵다. 집중은 성격보다 환경의 영향을 더 많이 받는다.

일을 시작하기 전 필요한 자료만 남기고 나머지 창을 닫아보자. 휴대전화는 손이 닿지 않는 곳에 두고, 끝낼 시간보다 시작할 시간을 정한다. 삼십 분 동안 완벽하게 몰입하겠다는 목표 대신 단 십 분만 한 작업에 머무르는 것이다.

짧은 집중이 끝나면 무엇이 방해했는지 한 줄로 기록한다. 이 기록은 실패 목록이 아니라 다음 환경을 바꾸는 단서가 된다. 집중력을 기르는 일은 마음을 다잡는 것보다 방해 요소를 하나씩 줄이는 과정에 가깝다.`,
    question: "글에서 집중을 높이기 위해 먼저 바꾸라고 한 것은 무엇인가요?",
    answers: ["개인의 성격", "주변 환경과 방해 요소", "일의 마감 시간"],
    correct: 1,
  }, {
    title: "완료 기준 정하기",
    text: `일이 끝나지 않는 이유 중 하나는 시작 전에 완료의 모습을 정하지 않기 때문이다. 보고서를 잘 쓰겠다는 목표만으로는 어디까지 해야 하는지 판단하기 어렵다.

제목과 핵심 문장 세 개를 작성하면 초안 완료라고 기준을 정해보자. 기준이 구체적이면 시작할 행동과 멈출 시점이 선명해진다.

완료 기준은 결과의 수준을 낮추는 장치가 아니다. 수정 가능한 첫 결과를 빠르게 만들어 다음 단계로 이동하게 하는 약속이다.`,
    question: "완료 기준을 미리 정하면 좋은 점은 무엇인가요?",
    answers: ["일을 시작하지 않아도 된다", "시작할 행동과 멈출 시점이 선명해진다", "수정이 필요 없어졌다"],
    correct: 1,
  }, {
    title: "회고의 한 문장",
    text: `하루를 돌아보기 위해 긴 일기를 쓸 필요는 없다. 잠들기 전 오늘 다시 하고 싶은 행동 하나와 바꾸고 싶은 행동 하나를 적는 것으로 충분하다.

기록이 길어지면 바쁜 날에는 쉽게 포기한다. 반면 짧은 질문은 부담이 적고 여러 날의 답을 비교하기도 쉽다.

회고의 목적은 자신을 평가하는 데 있지 않다. 반복되는 선택을 발견하고 내일의 행동을 조금 더 쉽게 정하는 데 있다.`,
    question: "글에서 회고의 목적으로 제시한 것은 무엇인가요?",
    answers: ["자신에게 점수를 매기는 것", "반복되는 선택을 발견해 내일의 행동을 정하는 것", "긴 일기를 완성하는 것"],
    correct: 1,
  }, {
    title: "쉬는 시간을 예약하기",
    text: `피곤해진 뒤에 쉬려고 하면 휴식은 늘 가장 마지막 순서로 밀린다. 일이 예상보다 길어질수록 쉬는 시간부터 줄이기 때문이다.

그래서 중요한 일정처럼 휴식도 미리 달력에 넣을 필요가 있다. 오후 세 시에 십 분 걷기처럼 시간과 행동을 구체적으로 정하면 실행 가능성이 높아진다.

휴식은 일을 하지 않는 공백이 아니다. 집중력을 회복해 다음 일을 지속할 수 있게 하는 작업의 일부다.`,
    question: "휴식을 미리 달력에 넣으라고 한 이유는 무엇인가요?",
    answers: ["휴식 시간을 쉽게 미루지 않기 위해서", "업무 시간을 더 길게 만들기 위해서", "달력을 가득 채우기 위해서"],
    correct: 0,
  }, ...ADDITIONAL_PASSAGES.selfhelp],
};

const PASSAGES = Object.fromEntries(
  Object.entries(RAW_PASSAGES).map(([genre, passages]) => [
    genre,
    passages.map((passage) => ({
      ...passage,
      text: PASSAGE_EXTENSIONS[passage.title]
        ? `${passage.text}\n\n${PASSAGE_EXTENSIONS[passage.title]}`
        : passage.text,
    })),
  ]),
) as Record<Genre, Passage[]>;

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
  const [passageIndex, setPassageIndex] = useState(0);
  const [phase, setPhase] = useState<TestPhase>("ready");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [cpm, setCpm] = useState(500);
  const [wpm, setWpm] = useState(200);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [searchMessage, setSearchMessage] = useState("제목이나 저자를 입력해 주세요.");
  const [bestsellers, setBestsellers] = useState<Book[]>(BESTSELLERS);
  const [bestsellerDemoMode, setBestsellerDemoMode] = useState(false);

  const genrePassages = PASSAGES[genre];
  const passage = genrePassages[passageIndex] ?? genrePassages[0];
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
    if (nextGenre) {
      setGenre(nextGenre);
      setPassageIndex(0);
    }
    setPhase("ready");
    setStartedAt(null);
    setElapsed(null);
  }

  function showToast(title: string, message: string) {
    const nextToast = { title, message };
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => current === nextToast ? null : current);
    }, 3600);
  }

  function startTest(random: boolean, timestamp: number) {
    if (random) setPassageIndex(Math.floor(Math.random() * genrePassages.length));
    setPhase("reading");
    setStartedAt(timestamp);
  }

  function finishTest(event: MouseEvent<HTMLButtonElement>) {
    if (!startedAt) return;
    const seconds = Math.max(1, (event.timeStamp - startedAt) / 1000);
    if (seconds < 8) {
      resetTest();
      showToast("속도를 재지 못했어요", "8초 이상 읽어야 정확히 잴 수 있어요. 천천히 다시 읽어 주세요.");
      return;
    }
    setElapsed(seconds);
    setPhase("question");
  }

  function answer(index: number) {
    if (index !== passage.correct || !elapsed) {
      resetTest();
      showToast("이번 기록은 제외했어요", "답이 맞지 않아 속도가 정확하지 않을 수 있어요. 다른 글로 다시 재볼게요.");
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
    if (!query.trim()) {
      setSearchMessage("찾을 책의 제목이나 저자를 입력해 주세요.");
      return;
    }
    setSearching(true);
    setSearchMessage("책을 찾고 있어요.");
    try {
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setBooks(data.items);
      setSearchMessage(data.count ? `${data.count}권을 찾았어요. 책을 고르면 완독 시간을 보여드려요.` : "검색 결과가 없어요. 제목이나 저자를 다시 확인해 주세요.");
    } catch {
      const hits = SAMPLE_BOOKS.filter((book) =>
        `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase()),
      );
      setBooks(hits.length ? hits : SAMPLE_BOOKS);
      setSearchMessage("검색 서비스에 연결하지 못해 예시 책을 보여드려요.");
    } finally {
      setSearching(false);
    }
  }

  async function chooseBook(book: Book) {
    if (!book.supported) {
      showToast("이 책은 시간을 계산하기 어려워요", "그림이 많거나 페이지 수가 일정하지 않은 책은 결과가 부정확할 수 있어요.");
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
      showToast("페이지 수를 찾지 못했어요", "다른 판본을 검색하거나 페이지 수가 표시된 책을 골라 주세요.");
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
          <button className={step === "calibrate" ? "active" : ""} onClick={() => go("calibrate")}>1. 속도 재기</button>
          <button
            className={step === "search" ? "active" : ""}
            onClick={() => (phase === "complete" || IS_LOCAL) && go("search")}
            disabled={phase !== "complete" && !IS_LOCAL}
          >
            2. 책 고르기
          </button>
          <button className={step === "result" ? "active" : ""} disabled={!prediction} onClick={() => prediction && go("result")}>3. 시간 보기</button>
        </nav>
        <span className="step-count">{step === "calibrate" ? "1" : step === "search" ? "2" : "3"} / 3</span>
      </header>

      {step === "calibrate" && (
        <section className={`screen calibration-screen phase-${phase}`}>
          <div className="screen-heading">
            <p>먼저 읽기 속도를 재요</p>
            <h1>평소 읽는 장르로<br />속도를 측정해보세요.</h1>
            <p className="lead">짧은 글을 읽고 질문 하나에 답하면 끝나요. 약 2분 걸려요.</p>
          </div>

          <div className="genre-options">
            {GENRES.map((item) => (
              <button key={item.id} className={genre === item.id ? "selected" : ""} aria-pressed={genre === item.id} onClick={() => resetTest(item.id)}>
                <strong>{item.label}</strong>
                <span>{item.caption}</span>
              </button>
            ))}
          </div>

          <div className="test-stage">
            {phase === "ready" && (
              <div className="quiet-state">
                <p>{genreName} 글 · 약 {wordCount}단어</p>
                <h2>준비되면 글을 읽어 주세요.</h2>
                <span>읽기를 누르면 바로 측정해요.<br />다 읽은 뒤 질문 하나에 답하면 속도를 알려드려요.</span>
                <div className="action-pair">
                  <button className="primary" onClick={(event) => startTest(true, event.timeStamp)}>예시 글 읽기</button>
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
                <div className="reading-meta"><span>{genreName} · {passage.title}</span><span>읽는 시간 재는 중</span></div>
                <article>{passage.text}</article>
                <button className="primary wide" onClick={finishTest}>다 읽고 질문에 답하기</button>
              </div>
            )}

            {phase === "question" && (
              <div className="question-view">
                <p>마지막 질문이에요</p>
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
                <p>속도를 다 쟀어요</p>
                <h2>1분에 약 <strong>{wpm}단어</strong>를 읽는 편이에요.</h2>
                <div className="speed-guide">
                  <strong>짧은 예시 글 기준 · {speedGuide}</strong>
                  <span>한국 사람의 평균 읽기 속도는 1분에 약 202단어예요.</span>
                  <small>책의 난이도와 익숙한 정도에 따라 실제 속도는 달라질 수 있어요.</small>
                </div>
                <span>{wordCount}단어를 {Math.round(elapsed ?? 0)}초 동안 읽은 결과예요.</span>
                <div className="action-pair">
                  <button className="primary" onClick={() => go("search")}>완독 시간 볼 책 고르기</button>
                  <button className="secondary" onClick={() => resetTest()}>다른 글로 다시 재기</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {step === "search" && (
        <section className="screen search-screen">
          <div className="screen-heading centered">
            <p>내 속도 · 1분에 약 {wpm}단어</p>
            <h1>읽을 책을 골라 주세요.</h1>
            <p className="lead">책을 고르면 내 속도에 맞춘 예상 완독 시간을 바로 보여드려요.</p>
          </div>

          <form className="book-search" onSubmit={searchBooks}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목이나 저자 검색" aria-label="책 제목이나 저자" />
            <button className="primary" disabled={searching}>{searching ? "찾는 중…" : "책 찾기"}</button>
          </form>
          <p className="search-message" role="status" aria-live="polite">{searchMessage}</p>

          {books.length > 0 && (
            <div className="search-results">
              <div className="book-section-heading">
                <p>검색 결과</p>
                <h2>{books.length}권을 찾았어요</h2>
              </div>
              <div className="book-grid">
                {books.map((book) => (
                  <button key={book.title} className="book-card" aria-label={`${book.title}, ${book.author}${book.supported ? " 완독 시간 보기" : " 시간 계산할 수 없음"}`} onClick={() => chooseBook(book)}>
                    <span className="book-cover">
                      {book.cover ? <img src={book.cover} alt="" /> : book.title.slice(0, 1)}
                    </span>
                    <strong>{book.title}</strong>
                    <small>{book.author}</small>
                    <span>{book.pages ? `${book.pages}쪽` : "페이지 수 없음"} · {book.supported ? "완독 시간 보기" : "시간 계산 어려움"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bestseller-section">
            <div className="book-section-heading">
              <p>많이 찾는 책</p>
              <h2>바로 골라도 좋아요</h2>
              <span>책을 누르면 예상 완독 시간을 보여드려요.</span>
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
            {bestsellerDemoMode && <p className="data-note">베스트셀러 정보를 불러오지 못해 예시 책을 보여드려요.</p>}
          </div>
        </section>
      )}

      {step === "result" && selected && prediction && (
        <section className="result-screen">
          <div className="result-hero">
            <div className="result-book-cover">
              {selected.cover ? <img src={selected.cover} alt={`${selected.title} 표지`} /> : selected.title.slice(0, 1)}
            </div>
            <div className="result-details">
              <div className="result-book-heading">
                <h1>{selected.title}</h1>
                <p className="book-meta">
                  <span><small>지은이</small>{selected.author}</span>
                  {selected.publisher && <span className="book-publisher"><small>출판사</small>{selected.publisher}</span>}
                  <span><small>분량</small>{selected.pages}쪽</span>
                </p>
                {selected.description && <p className="book-description">{selected.description}</p>}
              </div>
              <div className="result-estimate">
                <p className="result-copy">내 속도로 읽으면</p>
                <div className="result-time">{formatMinutes(prediction.minutes)}</div>
                <span className="result-range">보통 {formatMinutes(prediction.range.low)}~{formatMinutes(prediction.range.high)} 걸려요.</span>
                <div className="result-facts">
                  <div><strong>약 {wpm}단어</strong><span>1분에 읽는 양</span></div>
                  <div><strong>{genreName}</strong><span>속도를 잰 장르</span></div>
                  <div><strong>약 ±{formatMinutes(Math.max(
                    prediction.minutes - prediction.range.low,
                    prediction.range.high - prediction.minutes,
                  ))}</strong><span>예상 오차</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="recommend-section">
            <div>
              <p>비슷한 책</p>
              <h2>다른 책의 시간도 볼까요?</h2>
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
            <button className="primary" onClick={() => go("search")}>다른 책 고르기</button>
            <button className="secondary" onClick={() => go("calibrate")}>읽기 속도 다시 재기</button>
          </div>
        </section>
      )}

      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          <span aria-hidden="true">!</span>
          <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
          <button type="button" aria-label="알림 닫기" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </main>
  );
}
