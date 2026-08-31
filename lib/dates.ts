/**
 * 通用日期工具（非 server action，可在 client 使用）
 */

/** 距离过期天数（负数 = 已过期 N 天） */
export function daysUntilExpiry(iso: string): number {
  const now = Date.now();
  const exp = new Date(iso).getTime();
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
}
