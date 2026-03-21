import { create } from 'zustand';
import api from '../lib/api';
import { useAuthStore } from './authStore';

interface WatchlistState {
    tickers: string[];
    initialized: boolean;
    init: () => Promise<void>;
    addTicker: (ticker: string) => Promise<void>;
    removeTicker: (ticker: string) => Promise<void>;
    setTickers: (tickers: string[]) => void;
}

function loadLocal(): string[] {
    try {
        return JSON.parse(localStorage.getItem('watchlist') || '[]');
    } catch {
        return [];
    }
}

function saveLocal(tickers: string[]) {
    localStorage.setItem('watchlist', JSON.stringify(tickers));
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
    tickers: loadLocal(),
    initialized: false,

    setTickers: (tickers) => {
        saveLocal(tickers);
        set({ tickers });
    },

    init: async () => {
        if (get().initialized) return;
        const token = useAuthStore.getState().token;
        if (!token) {
            set({ initialized: true });
            return;
        }
        try {
            const res = await api.get('/watchlist');
            const serverTickers: string[] = res.data;
            saveLocal(serverTickers);
            set({ tickers: serverTickers, initialized: true });
        } catch {
            // Fall back to local
            set({ initialized: true });
        }
    },

    addTicker: async (ticker) => {
        const t = ticker.toUpperCase();
        set((state) => {
            if (state.tickers.includes(t)) return state;
            const next = [...state.tickers, t];
            saveLocal(next);
            return { tickers: next };
        });

        const token = useAuthStore.getState().token;
        if (token) {
            try {
                await api.post(`/watchlist/${t}`);
            } catch {}
        }
    },

    removeTicker: async (ticker) => {
        const t = ticker.toUpperCase();
        set((state) => {
            const next = state.tickers.filter(x => x !== t);
            saveLocal(next);
            return { tickers: next };
        });

        const token = useAuthStore.getState().token;
        if (token) {
            try {
                await api.delete(`/watchlist/${t}`);
            } catch {}
        }
    },
}));
