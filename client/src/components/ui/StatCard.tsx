import React from 'react';
import { ChangeBadge } from './ChangeBadge';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  change?: number | null;
  changeSuffix?: string;
  className?: string;
}

export function StatCard({ label, value, sub, change, changeSuffix, className = '' }: StatCardProps) {
  return (
    <div className={`ui-stat-card ${className}`.trim()}>
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value">{value}</div>
      {change != null && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <ChangeBadge value={change} suffix={changeSuffix} />
        </div>
      )}
      {sub != null && <div className="ui-stat-sub">{sub}</div>}
    </div>
  );
}
