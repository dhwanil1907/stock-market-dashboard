const usd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${usd.format(value)}`;
}

export function formatChange(
  value: number | null | undefined,
  opts?: { suffix?: string; decimals?: number },
): string {
  if (value == null || Number.isNaN(value)) return '—';
  const decimals = opts?.decimals ?? 2;
  const suffix = opts?.suffix ?? '%';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value).toFixed(decimals);
  return `${sign}${abs}${suffix}`;
}

export function formatCash(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatPrice(value);
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

export function isPositiveChange(value: number | null | undefined): boolean {
  return value != null && !Number.isNaN(value) && value >= 0;
}
