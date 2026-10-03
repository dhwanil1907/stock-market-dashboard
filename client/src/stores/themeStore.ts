import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
}

function getSavedTheme(): Theme {
  const raw = localStorage.getItem('stocksage-theme');
  const saved: Theme = raw === 'light' ? 'light' : 'dark';
  applyTheme(saved);
  return saved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getSavedTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('stocksage-theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));
