const INVALID_DESCRIPTION_PATTERN = /\[설명글\]|\[평가\b|boardlife\.co\.kr\/game\/\d+\/rate/i;

export function hasUsableGameDescription(description?: string | null) {
  const normalizedDescription = description?.trim();
  return Boolean(normalizedDescription) && !INVALID_DESCRIPTION_PATTERN.test(normalizedDescription ?? "");
}
