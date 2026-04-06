/**
 * Format money value (in millions) for display.
 * R40M, R1.2B, R0
 */
export function formatMoney(millions: number): string {
  if (millions === 0) return 'R0';
  if (millions >= 1000) return `R${(millions / 1000).toFixed(1)}B`;
  return `R${millions}M`;
}

/**
 * Format money with sign prefix.
 * +R180M, -R500M
 */
export function formatMoneyDelta(millions: number): string {
  const sign = millions >= 0 ? '+' : '';
  return `${sign}${formatMoney(millions)}`;
}

/**
 * Format MW value for display.
 * 4,200 MW
 */
export function formatMW(mw: number): string {
  return `${mw.toLocaleString()} MW`;
}
