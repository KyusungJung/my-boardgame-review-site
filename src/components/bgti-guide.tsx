"use client";

import { Button, Tag, Typography } from "antd";
import type { CSSProperties } from "react";
import { bgtiAxes } from "@/lib/bgti";

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

const bgtiTypes = [
  { code: "SLPT", title: "분위기 메이커", summary: "빠르고 가볍게, 이야기와 웃음을 먼저 여는 타입입니다.", games: "딕싯 · 텔레스트레이션 · 저스트 원" },
  { code: "SLPM", title: "힐링 가드너", summary: "쉬운 규칙 안에서 예쁜 빌드와 깔끔한 퍼즐을 즐깁니다.", games: "캐스캐디아 · 윙스팬 · 아줄" },
  { code: "SLAT", title: "유쾌한 트롤러", summary: "가벼운 게임의 반응과 견제, 장난스러운 상호작용을 좋아합니다.", games: "바퀴벌레 포커 · 뱅! · 러브 레터" },
  { code: "SLAM", title: "전술적 실력파", summary: "짧고 단순한 규칙 안에서도 빠르게 최선의 수를 찾습니다.", games: "스플렌더 · 쇼텐토텐 · 하이브" },
  { code: "SHPT", title: "테마 탐험가", summary: "무거운 게임도 세계관의 맛을 위해 거침없이 뛰어듭니다.", games: "네메시스 · 좀비사이드 · 엘드리치 호러" },
  { code: "SHPM", title: "효율의 마스터", summary: "복잡한 엔진을 빠른 판단으로 매끄럽게 굴리는 타입입니다.", games: "테라포밍 마스 · 아크 노바 · 비티컬처" },
  { code: "SHAT", title: "본능적 사령관", summary: "묵직한 상호작용 속에서도 속도를 잃지 않고 판을 흔듭니다.", games: "듄: 임페리움 · 사이쓰 · 코스믹 인카운터" },
  { code: "SHAM", title: "하드코어 타짜", summary: "치열한 수 싸움과 헤비 게임을 빠르게 끝까지 밀어붙입니다.", games: "브라스: 버밍엄 · 한자 테우토니카 · 푸드 체인 거물" },
  { code: "DLPT", title: "감성 스토리텔러", summary: "쉬운 게임도 장면과 아트워크를 천천히 음미합니다.", games: "에버델 · 캔버스 · 팍스 파미르" },
  { code: "DLPM", title: "완벽주의 퍼즐러", summary: "가벼운 퍼즐에서도 한 점의 오차까지 신중하게 다룹니다.", games: "캘리코 · 패치워크 · 사그라다" },
  { code: "DLAT", title: "신중한 심리학자", summary: "블러핑과 심리를 오래 읽고 완벽한 타이밍을 노립니다.", games: "스컬 · 레지스탕스 아발론 · 더 게임" },
  { code: "DLAM", title: "수 싸움의 정석", summary: "단순한 규칙 속 추상 전략에서 장고의 힘을 발휘합니다.", games: "산토리니 · 쿼리도 · 체스" },
  { code: "DHPT", title: "대서사시의 주인공", summary: "방대한 세계관과 긴 여정에 깊게 몰입합니다.", games: "글룸헤이븐 · 테인티드 그레일 · 7대륙" },
  { code: "DHPM", title: "유로게임의 화신", summary: "모든 변수를 계산하며 최적의 경로를 찾는 타입입니다.", games: "가이아 프로젝트 · 온 마스 · 라세르다 시리즈" },
  { code: "DHAT", title: "냉혹한 정치가", summary: "협상, 배신, 정치질이 얽힌 판에서 한 수를 고릅니다.", games: "황혼의 투쟁 · 루트 · 제국주의 2030" },
  { code: "DHAM", title: "전략의 마에스트로", summary: "가장 어렵고 상호작용 강한 판에서 모든 에너지를 쏟습니다.", games: "바라지 · 테라 미스티카 · 쓰루 디 에이지스" },
];

const pairRows = [
  ["speed", "django"],
  ["light", "heavy"],
  ["peaceful", "aggressive"],
  ["thematic", "mechanic"],
] as const;

export function BgtiGuide() {
  return <div className="bgti-guide-page">
    <section className="bgti-hero">
      <div className="bgti-hero-copy">
        <Typography.Title>BGTI</Typography.Title>
        <Typography.Title level={2}>보드게임 성향을 4개의 축으로 읽는 방법</Typography.Title>
        <Typography.Paragraph>Board Game Type Indicator는 보드게임 모임에서 자주 갈리는 취향을 빠르게 이해하기 위한 재미있는 프로파일입니다. 속도, 무게, 상호작용, 몰입 방식의 조합으로 16가지 게이머 타입을 살펴봅니다.</Typography.Paragraph>
        <div className="bgti-hero-actions"><Button type="primary" href="#bgti-types">16가지 유형 보기</Button><Button href="https://boardlife.co.kr/bbs_detail.php?tb=board_community&bbs_num=74126" target="_blank">원문 참고</Button></div>
      </div>
      <figure className="bgti-hero-art"><img src="/bgti/characters.png" alt="BGTI 8가지 보드게임 성향을 표현한 오리지널 캐릭터 일러스트" /></figure>
    </section>

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

    <section id="bgti-types" className="bgti-type-section">
      <div className="bgti-section-heading">
        <Typography.Title level={3}>16가지 게이머 프로필</Typography.Title>
        <Typography.Paragraph>네 글자는 차례대로 속도(S/D), 무게(L/H), 상호작용(P/A), 몰입 방식(T/M)을 뜻합니다.</Typography.Paragraph>
      </div>
      <div className="bgti-type-grid">
        {bgtiTypes.map((type) => <article className="bgti-type-card" key={type.code}>
          <Tag color="processing">{type.code}</Tag>
          <Typography.Title level={4}>{type.title}</Typography.Title>
          <Typography.Paragraph>{type.summary}</Typography.Paragraph>
          <Typography.Text type="secondary">추천 예시: {type.games}</Typography.Text>
        </article>)}
      </div>
    </section>
  </div>;
}
