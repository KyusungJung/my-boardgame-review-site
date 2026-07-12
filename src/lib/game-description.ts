const INVALID_DESCRIPTION_PATTERN = /\[설명글\]|\[평가\b|boardlife\.co\.kr\/game\/\d+\/rate/i;
const GENERATED_DESCRIPTION_PATTERN = /Boardlife 등록 정보 기준|은\(는\).+즐길 수 있는 보드게임입니다\.(?: 난이도는 \d+(?:\.\d+)?점입니다\.)?$/;

export function hasUsableGameDescription(description?: string | null) {
  const normalizedDescription = description?.trim();
  return Boolean(normalizedDescription) && !INVALID_DESCRIPTION_PATTERN.test(normalizedDescription ?? "") && !GENERATED_DESCRIPTION_PATTERN.test(normalizedDescription ?? "");
}
