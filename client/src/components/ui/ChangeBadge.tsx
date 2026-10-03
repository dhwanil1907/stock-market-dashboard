import { formatChange, isPositiveChange } from '../../lib/format';

export interface ChangeBadgeProps {
  value: number | null | undefined;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function ChangeBadge({ value, suffix, decimals, className = '' }: ChangeBadgeProps) {
  const flat = value == null || Number.isNaN(value) || value === 0;
  const gain = !flat && isPositiveChange(value);
  const tone = flat ? 'flat' : gain ? 'gain' : 'loss';
  const arrow = flat ? '•' : gain ? '▲' : '▼';

  return (
    <span className={`ui-change ui-change--${tone} ${className}`.trim()} aria-label={`Change ${formatChange(value, { suffix, decimals })}`}>
      <span aria-hidden>{arrow}</span>
      {formatChange(value, { suffix, decimals })}
    </span>
  );
}
