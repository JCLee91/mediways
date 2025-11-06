/**
 * KST(한국 표준시) 관련 유틸리티 함수들
 * UTC+9 시간대 기준으로 날짜 계산을 처리합니다.
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9시간을 밀리초로

/**
 * UTC 기준 날짜를 KST 기준 해당 날의 시작(00:00:00)으로 변환하여 UTC로 반환
 * @param dateUtc UTC 기준 날짜
 * @returns KST 기준 해당 날 00:00:00의 UTC 시간
 */
export function getKstDayStartUtc(dateUtc: Date): Date {
  const kstShifted = new Date(dateUtc.getTime() + KST_OFFSET_MS);
  const year = kstShifted.getUTCFullYear();
  const month = kstShifted.getUTCMonth();
  const day = kstShifted.getUTCDate();
  const utcMsForKstMidnight = Date.UTC(year, month, day) - KST_OFFSET_MS;
  return new Date(utcMsForKstMidnight);
}

/**
 * 날짜에 지정된 일수를 더합니다
 * @param date 기준 날짜
 * @param days 더할 일수 (음수 가능)
 * @returns 계산된 새 날짜
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * UTC 날짜를 KST 기준 YYYY-MM-DD 문자열로 변환
 * @param dateUtc UTC 기준 날짜
 * @returns KST 기준 날짜 문자열 (YYYY-MM-DD)
 */
export function toKstDateString(dateUtc: Date): string {
  const kst = new Date(dateUtc.getTime() + KST_OFFSET_MS);
  return kst.toISOString().split('T')[0];
}
