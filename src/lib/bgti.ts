import type { CollectionGame } from "@/lib/types";

export type BgtiAxis = "speed" | "django" | "light" | "heavy" | "peaceful" | "aggressive" | "thematic" | "mechanic";
export type BgtiWeights = Record<BgtiAxis, number>;

export const bgtiAxes: Array<{ key: BgtiAxis; code: string; label: string; description: string }> = [
  { key: "speed", code: "S", label: "Speed", description: "빠른 턴 진행" },
  { key: "django", code: "D", label: "Django", description: "깊은 수 읽기와 고민" },
  { key: "light", code: "L", label: "Light", description: "쉽고 파티파티한 게임" },
  { key: "heavy", code: "H", label: "Heavy", description: "복잡하고 긴 플레이 타임" },
  { key: "peaceful", code: "P", label: "Peaceful", description: "협력, 자기 빌딩, 벽겜" },
  { key: "aggressive", code: "A", label: "Aggressive", description: "견제, 인터랙션, 블러핑" },
  { key: "thematic", code: "T", label: "Thematic", description: "스토리, 세계관, 뽕맛" },
  { key: "mechanic", code: "M", label: "Mechanic", description: "규칙의 정교함, 밸런스" },
];

const neutralBgtiWeights: BgtiWeights = {
  speed: 3,
  django: 3,
  light: 3,
  heavy: 3,
  peaceful: 3,
  aggressive: 3,
  thematic: 3,
  mechanic: 3,
};

const tagScores: Record<string, Partial<BgtiWeights>> = {
  "가족게임": { speed: 0.5, light: 1.1, peaceful: 0.6, mechanic: -0.2 },
  "가족 게임": { speed: 0.5, light: 1.1, peaceful: 0.6, mechanic: -0.2 },
  "어린이게임": { speed: 0.7, light: 1.2, peaceful: 0.4, django: -0.7, heavy: -1.1 },
  "어린이 게임": { speed: 0.7, light: 1.2, peaceful: 0.4, django: -0.7, heavy: -1.1 },
  "파티게임": { speed: 0.9, light: 1.2, thematic: 0.5, django: -0.8, heavy: -1 },
  "파티 게임": { speed: 0.9, light: 1.2, thematic: 0.5, django: -0.8, heavy: -1 },
  "전략게임": { django: 0.8, heavy: 0.6, mechanic: 0.8, light: -0.5 },
  "추상전략": { django: 0.8, aggressive: 0.4, mechanic: 1, thematic: -0.7 },
  "워게임": { django: 0.8, heavy: 0.8, aggressive: 1.1, thematic: 0.4 },
  "협력 게임": { peaceful: 1.4, thematic: 0.4, aggressive: -0.9 },
  "블러핑": { aggressive: 1.3, speed: 0.3, thematic: 0.3, peaceful: -0.7 },
  "협상": { aggressive: 1, thematic: 0.4, mechanic: 0.2 },
  "배신": { aggressive: 1.2, thematic: 0.6, peaceful: -0.9 },
  "마피아": { aggressive: 1.1, thematic: 0.7, speed: 0.4 },
  "주사위 굴림": { speed: 0.5, light: 0.5, thematic: 0.5, mechanic: -0.1 },
  "운걸기": { speed: 0.6, light: 0.7, aggressive: 0.4, django: -0.3 },
  "카드 게임": { speed: 0.3, light: 0.3, mechanic: 0.3 },
  "핸드 관리": { django: 0.4, mechanic: 0.7 },
  "일꾼 놓기": { django: 0.7, heavy: 0.7, peaceful: 0.3, mechanic: 1 },
  "엔진 빌딩": { django: 0.6, heavy: 0.6, peaceful: 0.6, mechanic: 0.9 },
  "자원 승점": { django: 0.6, heavy: 0.5, peaceful: 0.3, mechanic: 0.8 },
  "덱,백,풀 빌딩": { django: 0.5, heavy: 0.3, mechanic: 0.8 },
  "오픈 드래프팅": { django: 0.4, aggressive: 0.3, mechanic: 0.7 },
  "드래프팅": { django: 0.4, aggressive: 0.3, mechanic: 0.7 },
  "타일 놓기": { light: 0.3, peaceful: 0.5, mechanic: 0.5 },
  "영역 건설": { heavy: 0.3, peaceful: 0.4, mechanic: 0.5 },
  "셋 컬렉션": { light: 0.3, mechanic: 0.5 },
  "스토리텔링": { thematic: 1.3, peaceful: 0.3, mechanic: -0.3 },
  "테마게임": { thematic: 1.2, mechanic: -0.2 },
  "테마 게임": { thematic: 1.2, mechanic: -0.2 },
  "모험": { thematic: 0.9, aggressive: 0.2 },
  "캠페인": { thematic: 1, heavy: 0.7, django: 0.4 },
  "퍼즐": { django: 0.7, peaceful: 0.4, mechanic: 0.7 },
};

function clampScore(value: number) {
  return Math.min(5, Math.max(1, Number(value.toFixed(1))));
}

function estimatePlayTimeMinutes(playTime?: string) {
  const values = playTime?.match(/\d+/g)?.map(Number).filter((value) => Number.isFinite(value) && value > 0) ?? [];
  return values.length >= 2 ? Math.round((values[0] + values[1]) / 2) : values[0] ?? undefined;
}

export function normalizeBgtiWeights(value?: Partial<BgtiWeights>): BgtiWeights {
  return bgtiAxes.reduce((weights, axis) => ({ ...weights, [axis.key]: clampScore(value?.[axis.key] ?? neutralBgtiWeights[axis.key]) }), {} as BgtiWeights);
}

export function estimateBgtiWeights(input: Pick<CollectionGame, "tags" | "complexity" | "playTime">): BgtiWeights {
  const score = { ...neutralBgtiWeights };
  const complexity = input.complexity ?? 3;
  const complexityDelta = Math.max(-2, Math.min(2, complexity - 3));
  score.light -= complexityDelta * 0.7;
  score.heavy += complexityDelta * 0.9;
  score.speed -= complexityDelta * 0.3;
  score.django += complexityDelta * 0.45;
  score.mechanic += complexityDelta * 0.35;

  const playTime = estimatePlayTimeMinutes(input.playTime);
  if (playTime !== undefined) {
    if (playTime <= 30) {
      score.speed += 0.6;
      score.light += 0.6;
      score.heavy -= 0.5;
    } else if (playTime >= 120) {
      score.django += 0.4;
      score.heavy += 0.7;
      score.light -= 0.6;
    }
  }

  for (const tag of input.tags ?? []) {
    const weights = tagScores[tag];
    if (!weights) continue;
    for (const axis of bgtiAxes) score[axis.key] += weights[axis.key] ?? 0;
  }

  return normalizeBgtiWeights(score);
}

export function bgtiSummary(weights?: Partial<BgtiWeights>) {
  const normalized = normalizeBgtiWeights(weights);
  return bgtiAxes.map((axis) => `${axis.code} ${normalized[axis.key].toFixed(1)}`).join(" · ");
}
