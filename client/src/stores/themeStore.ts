import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

function getSavedTheme(): Theme {
  const saved = (localStorage.getItem('stocksage-theme') as Theme) ?? 'dark';
  document.documentElement.className = saved;
  return saved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getSavedTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('stocksage-theme', next);
    set({ theme: next });
  },
}));
