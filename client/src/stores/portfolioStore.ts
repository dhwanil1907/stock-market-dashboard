import { create } from 'zustand';
import api from '../lib/api';

interface PortfolioState {
  cashBalance: number;
  holdings: any[];
  fetchPortfolio: (token: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  cashBalance: 0,
  holdings: [],
  fetchPortfolio: async (_token) => {
    try {
      const res = await api.get('/portfolio');
      set({ cashBalance: res.data.cash_balance, holdings: res.data.holdings });
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    }
  },
}));
