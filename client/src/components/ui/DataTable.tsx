import React from 'react';

export interface DataTableProps {
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}

export function DataTable({ children, className = '', bare = false }: DataTableProps) {
  if (bare) {
    return <div className={`ui-data-table-wrap ${className}`.trim()}>{children}</div>;
  }
  return (
    <div className={`ui-data-table-wrap ${className}`.trim()}>
      <table className="t-table">{children}</table>
    </div>
  );
}
