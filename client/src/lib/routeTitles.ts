const STATIC_TITLES: Record<string, string> = {
  '/dashboard': 'Market',
  '/watchlist': 'Watchlist',
  '/portfolio': 'Portfolio',
  '/history': 'Trade history',
  '/intel': 'Intel',
  '/sectors': 'Sectors',
  '/alerts': 'Alerts',
  '/backtest': 'Lab',
};

export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith('/stock/')) {
    const ticker = pathname.split('/')[2];
    return ticker ? ticker.toUpperCase() : 'Stock';
  }
  return STATIC_TITLES[pathname] ?? 'StockSage';
}
