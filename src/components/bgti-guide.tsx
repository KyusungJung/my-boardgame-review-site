"use client";

import { Button, Tag, Typography } from "antd";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { bgtiAxes } from "@/lib/bgti";
import { bgtiTestQuestions } from "@/lib/bgti-test-questions";
import type { GameVideo } from "@/lib/types";

const axisPalettes = {
  speed: "#e6a817",
  django: "#c79534",
  light: "#df7565",
  heavy: "#a7433f",
  peaceful: "#55b999",
  aggressive: "#2f9a95",
  thematic: "#9270c8",
  mechanic: "#7353ad",
} as const;

const axisCopy = {
  speed: { title: "스피드형", role: "빠른 템포의 진행자", body: "턴 사이의 공백을 줄이고, 직관적으로 선택하며, 짧고 경쾌한 판을 선호합니다." },
  django: { title: "장고형", role: "깊게 계산하는 분석가", body: "한 수의 여파를 오래 바라보고, 최선의 선택을 찾는 과정 자체에서 재미를 느낍니다." },
  light: { title: "라이트형", role: "가볍게 여는 분위기 메이커", body: "규칙 설명이 짧고 바로 웃을 수 있는 게임, 처음 온 사람도 함께 들어올 수 있는 게임을 좋아합니다." },
  heavy: { title: "헤비형", role: "긴 호흡의 정복자", body: "복잡한 규칙과 긴 플레이 타임, 촘촘한 자원 순환과 큰 판의 밀도를 즐깁니다." },
  peaceful: { title: "평화형", role: "함께 쌓아 올리는 빌더", body: "협력, 자기 엔진 구축, 예쁜 개인판처럼 서로의 판을 존중하는 플레이에 편안함을 느낍니다." },
  aggressive: { title: "공격형", role: "판을 흔드는 인터랙터", body: "견제, 블러핑, 협상, 타이밍 싸움처럼 사람 사이의 긴장감이 살아 있는 게임에 에너지를 얻습니다." },
  thematic: { title: "테마형", role: "이야기에 몰입하는 탐험가", body: "세계관, 일러스트, 컴포넌트, 플레이 중 생기는 장면과 서사가 게임의 맛을 완성한다고 봅니다." },
  mechanic: { title: "시스템형", role: "규칙을 읽는 설계자", body: "균형 잡힌 메커니즘, 깔끔한 아이콘, 점수 구조와 승리 루트의 정교함에 끌립니다." },
} as const;

type BgtiType = {
  code: string;
  title: string;
  mbtiHint: string;
  summary: string;
  quote: string;
  profile: string;
  strength: string;
  caution: string;
  games: string[];
};

type BgtiVideoResult = { game: string; video: GameVideo | null };

const bgtiTypes: BgtiType[] = [
  { code: "SLPT", title: "분위기 메이커", mbtiHint: "ESFP/ENFP의 밝은 사교성", summary: "빠르고 가볍게, 이야기와 웃음을 먼저 여는 타입입니다.", quote: "좋은 게임은 모두가 한 번씩 웃는 장면을 남긴다.", profile: "SLPT는 룰보다 분위기를 먼저 읽습니다. 설명이 길어지는 순간보다 첫 라운드의 웃음, 카드 한 장에서 터지는 이야기, 낯선 사람도 자연스럽게 들어오는 흐름을 소중히 여깁니다.", strength: "새 모임의 긴장을 풀고 게임을 시작하게 만드는 힘이 큽니다. 결과보다 장면을 기억해 플레이 후에도 대화가 이어집니다.", caution: "게임이 너무 건조하거나 장고가 길어지면 금세 에너지가 빠질 수 있습니다. 짧은 라운드와 리액션 포인트가 있는 게임이 잘 맞습니다.", games: ["딕싯", "텔레스트레이션", "저스트 원"] },
  { code: "SLPM", title: "힐링 가드너", mbtiHint: "ISFJ/ISFP의 온화한 취향", summary: "쉬운 규칙 안에서 예쁜 빌드와 깔끔한 퍼즐을 즐깁니다.", quote: "내 판이 예쁘게 자라나는 순간, 승패보다 오래 남는다.", profile: "SLPM은 부담 없는 규칙과 정돈된 시스템 사이에서 편안함을 느낍니다. 보기 좋은 컴포넌트, 내 앞에 차곡차곡 놓이는 타일과 카드, 과하지 않은 경쟁이 플레이의 안정감을 만듭니다.", strength: "초보자와 숙련자 사이의 온도를 잘 맞춥니다. 자기 판을 꾸리는 재미를 살려 모임을 차분하게 이끕니다.", caution: "강한 공격이나 복잡한 예외 규칙은 피로하게 느껴질 수 있습니다. 예쁜 테마와 명확한 점수 구조가 있는 게임을 고르면 만족도가 높습니다.", games: ["캐스캐디아", "윙스팬", "아줄"] },
  { code: "SLAT", title: "유쾌한 트롤러", mbtiHint: "ENTP/ESTP의 장난스러운 순발력", summary: "가벼운 게임의 반응과 견제, 장난스러운 상호작용을 좋아합니다.", quote: "가벼운 한 방이 테이블 전체의 표정을 바꾼다.", profile: "SLAT는 짧은 규칙 안에서 사람의 반응을 보는 재미를 압니다. 블러핑, 가벼운 공격, 예상 못 한 반전이 있을 때 가장 생생하게 살아납니다.", strength: "처지는 모임에 즉흥성과 웃음을 넣습니다. 게임을 어렵게 만들지 않으면서도 서로를 바라보게 합니다.", caution: "장난의 강도가 사람마다 다르다는 점을 잊지 않는 것이 좋습니다. 뒤끝 없이 웃을 수 있는 합의가 있을 때 가장 빛납니다.", games: ["바퀴벌레 포커", "뱅!", "러브 레터"] },
  { code: "SLAM", title: "전술적 실력파", mbtiHint: "ESTP/ISTP의 빠른 판단", summary: "짧고 단순한 규칙 안에서도 빠르게 최선의 수를 찾습니다.", quote: "규칙은 짧을수록, 선택은 날카로울수록 좋다.", profile: "SLAM은 배우기 쉬운 규칙 속에서도 승부의 깊이를 찾아냅니다. 오래 고민하기보다 현재 판에서 가장 효율적인 선택을 빠르게 잡아내는 편입니다.", strength: "게임 진행이 시원하고, 짧은 대국에서도 실력 차이를 즐겁게 드러냅니다.", caution: "테마가 강하거나 운 요소가 큰 게임은 밋밋하게 느껴질 수 있습니다. 간결한 추상성과 명확한 상호작용이 잘 맞습니다.", games: ["스플렌더", "쇼텐토텐", "하이브"] },
  { code: "SHPT", title: "테마 탐험가", mbtiHint: "ENFP/ESFP의 몰입과 추진력", summary: "무거운 게임도 세계관의 맛을 위해 거침없이 뛰어듭니다.", quote: "룰이 조금 무거워도, 그 세계에 들어갈 수 있다면 충분하다.", profile: "SHPT는 복잡한 시스템을 장벽보다 모험의 일부로 받아들입니다. 긴 세팅과 많은 컴포넌트도 이야기를 만든다면 기꺼이 뛰어듭니다.", strength: "테마 게임의 분위기를 살리고, 테이블 위 사건을 영화처럼 기억하게 만듭니다.", caution: "밸런스나 최적화보다 몰입을 우선하다 보니 계산형 플레이어와 온도 차이가 날 수 있습니다.", games: ["네메시스", "좀비사이드", "엘드리치 호러"] },
  { code: "SHPM", title: "효율의 마스터", mbtiHint: "ENTJ/ESTJ의 실행력", summary: "복잡한 엔진을 빠른 판단으로 매끄럽게 굴리는 타입입니다.", quote: "잘 만든 엔진은 기다리지 않고 굴러간다.", profile: "SHPM은 무거운 게임에서도 흐름을 잃지 않습니다. 자원 순환, 카드 콤보, 행동 효율을 빠르게 파악해 엔진을 성장시키는 데 능합니다.", strength: "긴 게임을 루즈하지 않게 만들고, 복잡한 선택지를 실전적으로 정리합니다.", caution: "속도가 빠른 만큼 다른 플레이어에게 압박으로 느껴질 수 있습니다. 설명과 템포 조절이 더해지면 모임의 중심이 됩니다.", games: ["테라포밍 마스", "아크 노바", "비티컬처"] },
  { code: "SHAT", title: "본능적 사령관", mbtiHint: "ENTJ/ESTP의 주도성", summary: "묵직한 상호작용 속에서도 속도를 잃지 않고 판을 흔듭니다.", quote: "판은 읽는 것이 아니라 움직이는 것이다.", profile: "SHAT는 무거운 상호작용을 두려워하지 않습니다. 견제, 영향력, 타이밍 싸움 속에서 빠르게 결정을 내리고 흐름을 자신 쪽으로 끌어옵니다.", strength: "테이블에 긴장감과 추진력을 만듭니다. 경쟁형 게임에서 판세를 읽고 흔드는 감각이 좋습니다.", caution: "강한 주도성이 공격적으로 보일 수 있습니다. 모임의 합의와 리액션을 살피면 더 오래 사랑받는 플레이가 됩니다.", games: ["듄: 임페리움", "사이쓰", "코스믹 인카운터"] },
  { code: "SHAM", title: "하드코어 타짜", mbtiHint: "INTJ/ENTJ의 승부 감각", summary: "치열한 수 싸움과 헤비 게임을 빠르게 끝까지 밀어붙입니다.", quote: "복잡한 판일수록, 가장 빠른 길은 더 선명해진다.", profile: "SHAM은 어려운 규칙, 강한 상호작용, 빠른 의사결정이 만나는 지점에서 빛납니다. 치열한 판에서도 흔들리지 않고 승부의 핵심을 잡습니다.", strength: "고난도 게임을 밀도 있게 즐기며, 실력자끼리의 테이블에서 강한 몰입감을 만듭니다.", caution: "초보자와 함께할 때는 템포와 견제 강도를 낮추는 배려가 필요합니다.", games: ["브라스: 버밍엄", "한자 테우토니카", "푸드 체인 거물"] },
  { code: "DLPT", title: "감성 스토리텔러", mbtiHint: "INFP/ISFP의 서정성", summary: "쉬운 게임도 장면과 아트워크를 천천히 음미합니다.", quote: "카드 한 장에도 오늘의 이야기가 있다.", profile: "DLPT는 빠르게 끝나는 게임에서도 장면을 놓치지 않습니다. 일러스트, 문장, 선택의 의미를 천천히 음미하며 플레이를 자기만의 이야기로 바꿉니다.", strength: "게임의 감정선을 잘 살리고, 모임 후에도 기억에 남는 장면을 말로 풀어냅니다.", caution: "너무 빠른 진행이나 리액션 위주의 게임에서는 감상할 틈을 잃을 수 있습니다.", games: ["에버델", "캔버스", "팍스 파미르"] },
  { code: "DLPM", title: "완벽주의 퍼즐러", mbtiHint: "ISTJ/INTP의 세밀함", summary: "가벼운 퍼즐에서도 한 점의 오차까지 신중하게 다룹니다.", quote: "작은 타일 하나가 전체 그림의 균형을 바꾼다.", profile: "DLPM은 작고 조용한 게임에서도 완성도를 봅니다. 쉬운 규칙의 퍼즐이라도 배치, 순서, 점수 효율을 꼼꼼히 따져 만족스러운 해답을 찾습니다.", strength: "잔잔한 게임을 깊게 즐기고, 패턴과 가능성을 섬세하게 읽습니다.", caution: "완벽한 수를 찾느라 흐름이 느려질 수 있습니다. 제한 시간이나 가벼운 목표를 두면 더 편하게 즐길 수 있습니다.", games: ["캘리코", "패치워크", "사그라다"] },
  { code: "DLAT", title: "신중한 심리학자", mbtiHint: "INFJ/INTJ의 관찰력", summary: "블러핑과 심리를 오래 읽고 완벽한 타이밍을 노립니다.", quote: "상대가 말하지 않는 선택지도 정보다.", profile: "DLAT는 사람의 표정, 말의 순서, 카드 한 장의 망설임을 오래 관찰합니다. 가벼운 심리전에서도 결정을 서두르지 않고 가장 좋은 타이밍을 기다립니다.", strength: "블러핑 게임에서 분위기를 읽고, 결정적인 순간에 판을 뒤집는 힘이 있습니다.", caution: "정보를 너무 오래 붙잡으면 타이밍을 놓칠 수 있습니다. 직감도 데이터의 일부로 받아들이면 강해집니다.", games: ["스컬", "레지스탕스 아발론", "더 게임"] },
  { code: "DLAM", title: "수 싸움의 정석", mbtiHint: "INTP/ISTP의 논리성", summary: "단순한 규칙 속 추상 전략에서 장고의 힘을 발휘합니다.", quote: "가장 단순한 판 위에서 가장 복잡한 생각이 열린다.", profile: "DLAM은 테마보다 구조를 봅니다. 룰은 짧아도 경우의 수가 깊고, 상대의 다음 수를 읽는 게임에서 집중력이 살아납니다.", strength: "추상 전략과 2인 대결에서 강합니다. 판의 균형과 수순을 차분히 분석합니다.", caution: "분위기형 모임에서는 너무 진지해 보일 수 있습니다. 가벼운 복기와 설명을 곁들이면 함께 즐기기 좋습니다.", games: ["산토리니", "쿼리도", "체스"] },
  { code: "DHPT", title: "대서사시의 주인공", mbtiHint: "INFJ/ENFJ의 의미 추구", summary: "방대한 세계관과 긴 여정에 깊게 몰입합니다.", quote: "긴 이야기는 오래 걸려도, 끝난 뒤 더 오래 남는다.", profile: "DHPT는 캠페인, 시나리오, 성장 서사가 있는 게임에서 가장 깊게 빠져듭니다. 한 수의 효율보다 그 선택이 이야기에서 어떤 의미인지 중요하게 여깁니다.", strength: "긴 호흡의 게임을 끝까지 밀고 가는 몰입감이 있습니다. 팀의 기억을 하나의 서사로 묶습니다.", caution: "규칙과 세팅 부담이 커도 참고 들어가는 편이라 체력 소모를 관리해야 합니다.", games: ["글룸헤이븐", "테인티드 그레일", "7대륙"] },
  { code: "DHPM", title: "유로게임의 화신", mbtiHint: "INTJ/ISTJ의 계획성", summary: "모든 변수를 계산하며 최적의 경로를 찾는 타입입니다.", quote: "좋은 전략은 우연을 줄이고 선택을 남긴다.", profile: "DHPM은 복잡한 유로게임의 큰 그림을 즐깁니다. 자원, 행동, 타이밍, 점수 루트를 한꺼번에 보며 가장 효율적인 경로를 설계합니다.", strength: "장기 계획과 최적화에 강하고, 여러 변수의 상호작용을 안정적으로 정리합니다.", caution: "분석 시간이 길어질 수 있습니다. 목표 루트를 미리 좁히면 모임 템포가 좋아집니다.", games: ["가이아 프로젝트", "온 마스", "라세르다 시리즈"] },
  { code: "DHAT", title: "냉혹한 정치가", mbtiHint: "ENTJ/INFJ의 전략적 관계 읽기", summary: "협상, 배신, 정치질이 얽힌 판에서 한 수를 고릅니다.", quote: "계약은 말로 맺지만, 승리는 타이밍으로 완성된다.", profile: "DHAT는 복잡한 판세와 사람 사이의 이해관계를 동시에 봅니다. 협상과 동맹, 배신의 가능성까지 계산하며 가장 유리한 균형점을 찾습니다.", strength: "정치 게임과 영향력 게임에서 설득력과 인내심을 함께 발휘합니다.", caution: "승리를 위한 선택이 차갑게 느껴질 수 있습니다. 플레이 후 감정 정리를 잘하면 더 좋은 경험이 됩니다.", games: ["황혼의 투쟁", "루트", "제국주의 2030"] },
  { code: "DHAM", title: "전략의 마에스트로", mbtiHint: "INTJ/ENTJ의 종합 전략", summary: "가장 어렵고 상호작용 강한 판에서 모든 에너지를 쏟습니다.", quote: "복잡한 판 전체가 하나의 악보처럼 보일 때가 있다.", profile: "DHAM은 난이도, 장고, 상호작용, 시스템 완성도가 모두 높은 게임에서 진가를 드러냅니다. 단기 전술과 장기 전략을 함께 지휘하며 끝까지 집중합니다.", strength: "고난도 전략 게임의 깊이를 온전히 즐기고, 강한 상대와의 대결에서 성장합니다.", caution: "모임 전체가 같은 강도의 게임을 원하지 않을 수 있습니다. 상대의 체력과 취향을 읽는 것도 전략입니다.", games: ["바라지", "테라 미스티카", "쓰루 디 에이지스"] },
];

const pairRows = [
  ["speed", "django"],
  ["light", "heavy"],
  ["peaceful", "aggressive"],
  ["thematic", "mechanic"],
] as const;

const answerLabels = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];
const questionsPerPage = 5;
const axisLabels = ["속도", "무게", "상호작용", "몰입 방식"];

function youtubeSearchUrl(game: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${game} 보드게임 리뷰 설명`)}`;
}

function characterStyle(index: number): CSSProperties {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return { backgroundPosition: `${column * 33.3333}% ${row * 33.3333}%` };
}

export function BgtiGuide() {
  const typesRef = useRef<HTMLElement | null>(null);
  const testRef = useRef<HTMLElement | null>(null);
  const profileRef = useRef<HTMLElement | null>(null);
  const [selectedType, setSelectedType] = useState(bgtiTypes[0]);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testPage, setTestPage] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(() => Array(bgtiTestQuestions.length).fill(null));
  const [testResult, setTestResult] = useState<string | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<BgtiVideoResult[]>([]);
  const [loadingRecommendedVideos, setLoadingRecommendedVideos] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingRecommendedVideos(true);
    fetch(`/api/youtube/bgti?games=${encodeURIComponent(selectedType.games.join(","))}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<BgtiVideoResult[]> : [])
      .then((videos) => { if (!controller.signal.aborted) setRecommendedVideos(videos); })
      .catch(() => { if (!controller.signal.aborted) setRecommendedVideos([]); })
      .finally(() => { if (!controller.signal.aborted) setLoadingRecommendedVideos(false); });
    return () => controller.abort();
  }, [selectedType]);

  function scrollToTypes() {
    typesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openTypeProfile(type: BgtiType) {
    setSelectedType(type);
    window.setTimeout(() => profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function startTest() {
    setTestPage(0);
    setTestAnswers(Array(bgtiTestQuestions.length).fill(null));
    setTestResult(null);
    setIsTestOpen(true);
    window.setTimeout(() => testRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function chooseTestAnswer(questionIndex: number, value: number) {
    setTestAnswers((answers) => answers.map((answer, index) => index === questionIndex ? value : answer));
  }

  function finishTest() {
    if (testAnswers.some((answer) => answer === null)) return;

    const scores = { S: 0, L: 0, P: 0, T: 0 };
    bgtiTestQuestions.forEach((question, index) => {
      const answer = testAnswers[index] ?? 3;
      scores[question.axis] += question.reverse ? 6 - answer : answer;
    });
    const code = `${scores.S >= 75 ? "S" : "D"}${scores.L >= 75 ? "L" : "H"}${scores.P >= 75 ? "P" : "A"}${scores.T >= 75 ? "T" : "M"}`;
    const resultType = bgtiTypes.find((type) => type.code === code);
    if (!resultType) return;

    setTestResult(code);
    setIsTestOpen(false);
    openTypeProfile(resultType);
  }

  const questionStart = testPage * questionsPerPage;
  const currentQuestions = bgtiTestQuestions.slice(questionStart, questionStart + questionsPerPage);
  const currentPageComplete = currentQuestions.every((_, index) => testAnswers[questionStart + index] !== null);
  const totalTestPages = Math.ceil(bgtiTestQuestions.length / questionsPerPage);
  const answeredCount = testAnswers.filter((answer) => answer !== null).length;
  const currentAxis = axisLabels[Math.floor(questionStart / 25)];
  const selectedIndex = bgtiTypes.findIndex((type) => type.code === selectedType.code);

  return <div className="bgti-guide-page">
    <section className="bgti-hero">
      <div className="bgti-hero-copy">
        <Typography.Title>BGTI</Typography.Title>
        <Typography.Title level={2}>보드게임 성향을 4개의 축으로 읽는 방법</Typography.Title>
        <Typography.Paragraph>Board Game Type Indicator는 보드게임 모임에서 자주 갈리는 취향을 빠르게 이해하기 위한 재미있는 프로파일입니다. 속도, 무게, 상호작용, 몰입 방식의 조합으로 16가지 게이머 타입을 살펴봅니다.</Typography.Paragraph>
        <div className="bgti-hero-actions"><Button type="primary" onClick={startTest}>테스트 하기</Button><Button onClick={scrollToTypes}>16가지 유형 보기</Button></div>
      </div>
      <figure className="bgti-hero-art"><img src="/bgti/characters.png" alt="BGTI 8가지 보드게임 성향을 표현한 오리지널 캐릭터 일러스트" /></figure>
    </section>

    {isTestOpen && <section ref={testRef} className="bgti-test-section" aria-label="BGTI 100문항 테스트">
      <div className="bgti-test-heading">
        <Typography.Title level={3}>나의 BGTI 100문항 테스트</Typography.Title>
        <Typography.Paragraph>원문의 4개 성향 축, 100문항, 반전 채점 규칙을 그대로 적용합니다. 한 화면에는 5문항만 보여 드리니, 첫 반응으로 편하게 골라 주세요.</Typography.Paragraph>
      </div>
      <div className="bgti-test-progress" aria-label={`${answeredCount} / ${bgtiTestQuestions.length} 문항`}>
        <div><span>{currentAxis} 편 · 묶음 {testPage % 5 + 1} / 5</span><strong>{answeredCount} / {bgtiTestQuestions.length}</strong></div>
        <span><i style={{ width: `${(answeredCount / bgtiTestQuestions.length) * 100}%` }} /></span>
      </div>
      <div className="bgti-question-list">
        {currentQuestions.map((question, index) => {
          const questionIndex = questionStart + index;
          return <article className="bgti-question-card" key={questionIndex}>
            <Typography.Text>질문 {questionIndex + 1}</Typography.Text>
            <Typography.Title level={4}>{question.text}</Typography.Title>
            <div className="bgti-answer-options">
              {answerLabels.map((label, answerIndex) => {
                const value = answerIndex + 1;
                return <button type="button" key={label} className={testAnswers[questionIndex] === value ? "selected" : ""} onClick={() => chooseTestAnswer(questionIndex, value)}>{label}</button>;
              })}
            </div>
          </article>;
        })}
      </div>
      <div className="bgti-test-actions">
        <Button disabled={testPage === 0} onClick={() => setTestPage((page) => page - 1)}>이전 5문항</Button>
        {testPage === totalTestPages - 1
          ? <Button type="primary" disabled={!currentPageComplete} onClick={finishTest}>결과 보기</Button>
          : <Button type="primary" disabled={!currentPageComplete} onClick={() => setTestPage((page) => page + 1)}>다음 5문항</Button>}
      </div>
    </section>}

    <section className="bgti-axis-section">
      <div className="bgti-section-heading">
        <Typography.Title level={3}>8가지 성향 축</Typography.Title>
        <Typography.Paragraph>각 게임은 이 8개 축에서 1점부터 5점까지의 성향을 가질 수 있고, 모임 추천은 참가자의 분위기와 이 점수를 조합합니다.</Typography.Paragraph>
      </div>
      <div className="bgti-axis-pairs">
        {pairRows.map(([first, second]) => <article className="bgti-axis-pair" key={first}>
          {[first, second].map((key) => {
            const axis = bgtiAxes.find((item) => item.key === key);
            const copy = axisCopy[key];
            if (!axis) return null;
            return <div className="bgti-axis-card" key={key} style={{ "--axis-color": axisPalettes[key] } as CSSProperties}>
              <span className="bgti-axis-code">{axis.code}</span>
              <div><Typography.Title level={4}>{copy.title}</Typography.Title><Typography.Text>{copy.role}</Typography.Text></div>
              <Typography.Paragraph className="bgti-axis-body">{copy.body}</Typography.Paragraph>
            </div>;
          })}
        </article>)}
      </div>
    </section>

    <section ref={typesRef} className="bgti-type-section">
      <div className="bgti-section-heading">
        <Typography.Title level={3}>16가지 게이머 프로필</Typography.Title>
        <Typography.Paragraph>네 글자는 차례대로 속도(S/D), 무게(L/H), 상호작용(P/A), 몰입 방식(T/M)을 뜻합니다. 유형을 누르면 16Personalities식 상세 프로필을 볼 수 있습니다.</Typography.Paragraph>
      </div>
      <div className="bgti-type-grid">
        {bgtiTypes.map((type) => <button type="button" className={`bgti-type-card ${selectedType.code === type.code ? "active" : ""}`} key={type.code} onClick={() => openTypeProfile(type)}>
          <div className="bgti-card-character" style={characterStyle(bgtiTypes.findIndex((item) => item.code === type.code))} aria-hidden="true" />
          <Tag color="processing">{type.code}</Tag>
          <Typography.Title level={4}>{type.title}</Typography.Title>
          <Typography.Paragraph>{type.summary}</Typography.Paragraph>
          <Typography.Text type="secondary">추천 예시: {type.games.join(" · ")}</Typography.Text>
        </button>)}
      </div>
    </section>

    <section ref={profileRef} className="bgti-profile-detail">
      {testResult === selectedType.code && <div className="bgti-result-banner"><div><Typography.Text>나의 BGTI 결과</Typography.Text><Typography.Title level={3}>{selectedType.code} · {selectedType.title}</Typography.Title></div><Button onClick={startTest}>다시 테스트하기</Button></div>}
      <div className="bgti-profile-hero">
        <figure className="bgti-profile-character"><div style={characterStyle(Math.max(0, selectedIndex))} aria-label={`${selectedType.code} ${selectedType.title} 캐릭터`} /></figure>
        <div className="bgti-profile-copy">
          <Tag color="blue">{selectedType.code}</Tag>
          <Typography.Title>{selectedType.title}</Typography.Title>
          <Typography.Text className="bgti-mbti-hint">{selectedType.mbtiHint}</Typography.Text>
          <blockquote>{selectedType.quote}</blockquote>
          <Typography.Paragraph>{selectedType.profile}</Typography.Paragraph>
        </div>
      </div>
      <div className="bgti-profile-columns">
        <article><Typography.Title level={4}>잘 맞는 플레이</Typography.Title><Typography.Paragraph>{selectedType.strength}</Typography.Paragraph></article>
        <article><Typography.Title level={4}>주의할 점</Typography.Title><Typography.Paragraph>{selectedType.caution}</Typography.Paragraph></article>
        <article className="bgti-video-panel"><Typography.Title level={4}>추천 영상</Typography.Title><div className="bgti-video-previews">{selectedType.games.map((game) => { const video = recommendedVideos.find((item) => item.game === game)?.video; return video ? <a href={video.url} target="_blank" rel="noreferrer" key={game} className="bgti-video-preview"><img src={video.thumbnail} alt="" /><span><strong>{video.title}</strong><small>{video.channelName ?? "YouTube"}</small></span></a> : <a href={youtubeSearchUrl(game)} target="_blank" rel="noreferrer" key={game} className="bgti-video-preview bgti-video-search"><span><strong>{game}</strong><small>{loadingRecommendedVideos ? "영상 미리보기를 불러오는 중…" : "YouTube에서 영상 찾기"}</small></span></a>; })}</div></article>
      </div>
    </section>
  </div>;
}
