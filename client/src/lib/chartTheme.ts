import { useEffect, useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { formatPrice } from './format';

export type ChartTheme = {
  grid: string;
  tickFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  fontMono: string;
  gain: string;
  loss: string;
  accent: string;
  volume: string;
  pieColors: string[];
};

function readChartTheme(): ChartTheme {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    grid: v('--color-border', '#243041'),
    tickFill: v('--color-text-secondary', '#94a3b8'),
    tooltipBg: v('--color-surface', '#141a22'),
    tooltipBorder: v('--color-border', '#243041'),
    fontMono: v('--font-mono', 'IBM Plex Mono, monospace'),
    gain: v('--color-gain', '#34d399'),
    loss: v('--color-loss', '#f87171'),
    accent: v('--color-accent', '#9eb4ce'),
    volume: v('--color-border-strong', '#2f3d52'),
    pieColors: [
      v('--color-accent', '#9eb4ce'),
      v('--color-gain', '#34d399'),
      '#8b5cf6',
      v('--color-warning', '#fbbf24'),
      v('--color-loss', '#f87171'),
      '#14b8a6',
      '#6366f1',
      '#f97316',
    ],
  };
}

export function useChartTheme(): ChartTheme {
  const theme = useThemeStore(state => state.theme);
  const [chartTheme, setChartTheme] = useState(readChartTheme);
  useEffect(() => {
    setChartTheme(readChartTheme());
  }, [theme]);
  return chartTheme;
}

export function chartTooltipUsd(value: unknown, name?: unknown): [string, string] {
  const n = typeof value === 'number' ? value : Number(value);
  const label = typeof name === 'string' && name ? name : 'Value';
  if (!Number.isFinite(n)) return ['—', label];
  return [formatPrice(n), label];
}

export function chartTooltipOptional(value: unknown, name?: unknown): [string, string] {
  if (value == null || value === '') return ['', ''];
  const labels: Record<string, string> = {
    actual: 'Price',
    forecast: 'Forecast',
    upper: 'Upper band',
    lower: 'Lower band',
    close: 'Close',
    value: 'Value',
  };
  const key = typeof name === 'string' ? name : String(name ?? '');
  return chartTooltipUsd(value, labels[key] ?? key);
}
