import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, RefreshCw, Loader2, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Brain, ChevronDown
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

const StockDetail: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const { token } = useAuthStore();
  const [quote, setQuote] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [predError, setPredError] = useState('');
  const [period, setPeriod] = useState('1y');
  const [loadingPred, setLoadingPred] = useState(false);
  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'options'>('chart');
  const [options, setOptions] = useState<any>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [optionsTab, setOptionsTab] = useState<'calls' | 'puts'>('calls');

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setPrediction(null);
    setPredError('');
    Promise.allSettled([
      api.get(`/stock/${ticker}/quote`).then(r => setQuote(r.data)),
      api.get(`/stock/${ticker}/history?period=${period}`).then(r => setHistory(r.data)),
    ]).finally(() => setLoading(false));
  }, [ticker, period]);

  const fetchOptions = async (expiry?: string) => {
    setOptionsLoading(true);
    setOptionsError('');
    try {
      const params: any = {};
      if (expiry) params.expiration = expiry;
      const res = await api.get(`/stock/${ticker}/options`, { params });
      setOptions(res.data);
      setSelectedExpiry(res.data.expiration);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'No options data available for this stock';
      setOptionsError(msg);
    } finally {
      setOptionsLoading(false);
    }
  };

  const fetchPrediction = async () => {
    if (!token) { toast.error('Please sign in to access predictions'); return; }
    setLoadingPred(true);
    setPredError('');
    try {
      const res = await api.get(`/stock/${ticker}/predict`);
      setPrediction(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Prediction failed. Try again shortly.';
      setPredError(msg);
      toast.error(msg);
    } finally {
      setLoadingPred(false);
    }
  };

  const executeTrade = async () => {
    setTradeLoading(true);
    try {
      await api.post('/trade/order', { ticker, action: tradeAction, quantity, orderType: 'MARKET' });
      toast.success(`${tradeAction} order filled — ${quantity} share${quantity > 1 ? 's' : ''} of ${ticker}`);
      setShowConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Trade failed');
      setShowConfirm(false);
    } finally {
      setTradeLoading(false);
    }
  };

  // Stitch last 30 days of history + forecast into one chart dataset
  const predChartData = useMemo(() => {
    if (!prediction || !history.length) return [];
    const last30 = history.slice(-30).map((h: any) => ({
      date: h.date,
      actual: h.close,
      forecast: null,
      upper: null,
      lower: null,
    }));
    const todayLabel = last30[last30.length - 1]?.date;
    const forecastPoints = prediction.ensemble_forecast.map((f: any) => ({
      date: f.date,
      actual: null,
      forecast: f.price,
      upper: f.upper,
      lower: f.lower,
    }));
    // Bridge: duplicate the last actual point as first forecast point so lines connect
    if (last30.length && forecastPoints.length) {
      const bridge = last30[last30.length - 1];
      forecastPoints[0] = {
        ...forecastPoints[0],
        actual: bridge.actual,
      };
    }
    return { points: [...last30, ...forecastPoints], todayLabel };
  }, [prediction, history]);

  const isUp = prediction ? prediction.price_change_pct >= 0 : true;
  const rec = prediction?.recommendation ?? '';

  const recStyles = {
    bg: rec.includes('BUY') ? 'bg-brand-green/10 border-brand-green/30'
      : rec.includes('SELL') ? 'bg-brand-red/10 border-brand-red/30'
      : 'bg-yellow-400/10 border-yellow-400/30',
    text: rec.includes('BUY') ? 'text-brand-green'
      : rec.includes('SELL') ? 'text-brand-red'
      : 'text-yellow-400',
    icon: rec.includes('BUY')
      ? <ArrowUpRight size={28} />
      : rec.includes('SELL')
      ? <ArrowDownRight size={28} />
      : <Minus size={28} />,
  };

  const rsiLabel = (rsi: number) => {
    if (rsi >= 70) return { label: 'Overbought', color: 'text-brand-red' };
    if (rsi <= 30) return { label: 'Oversold', color: 'text-brand-green' };
    return { label: 'Neutral', color: 'text-yellow-400' };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="animate-spin text-brand-green" size={40} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* ── Left Column ── */}
      <div className="space-y-6">

        {/* Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{ticker}</h1>
              <p className="text-gray-400 text-sm">{quote?.company_name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">${quote?.price?.toFixed(2)}</div>
              <div className={`flex items-center justify-end gap-1 ${(quote?.change_percent ?? 0) >= 0 ? 'price-up' : 'price-down'}`}>
                {(quote?.change_percent ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-mono">{(quote?.change_percent ?? 0) >= 0 ? '+' : ''}{quote?.change_percent?.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 glass rounded-2xl p-1 w-fit">
          {(['chart', 'options'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'options' && !options && !optionsLoading) fetchOptions();
              }}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-brand-green text-brand-dark' : 'text-gray-400 hover:text-white'}`}
            >
              {tab === 'chart' ? 'Price Chart' : 'Options Chain'}
            </button>
          ))}
        </div>

        {activeTab === 'chart' && (
          <>
            {/* Period Selector */}
            <div className="flex gap-2 flex-wrap">
              {['1d', '5d', '1mo', '3mo', '1y', '5y'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${period === p ? 'bg-brand-green text-brand-dark' : 'glass hover:bg-brand-border'}`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Price Chart */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Price History</h3>
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                  No chart data available for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2E33" />
                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#161A1E', border: '1px solid #2A2E33', borderRadius: 12 }}
                      labelStyle={{ color: '#888' }}
                      formatter={(val: number) => [`$${val.toFixed(2)}`, '']}
                    />
                    <Line type="monotone" dataKey="close" stroke="#00C896" strokeWidth={2} dot={false} />
                    <Bar dataKey="volume" fill="#2A2E33" opacity={0.4} yAxisId="right" />
                    <YAxis yAxisId="right" orientation="right" tick={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {/* Options Chain */}
        {activeTab === 'options' && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Options Chain</h3>
              {options?.expirations && (
                <div className="relative">
                  <select
                    value={selectedExpiry}
                    onChange={e => { setSelectedExpiry(e.target.value); fetchOptions(e.target.value); }}
                    className="py-2 pl-3 pr-8 rounded-xl text-sm bg-brand-dark border border-brand-border appearance-none"
                  >
                    {options.expirations.map((exp: string) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {optionsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-brand-green" size={32} />
              </div>
            ) : optionsError ? (
              <div className="flex items-center gap-2 text-gray-400 py-8 justify-center text-sm">
                <AlertTriangle size={16} /> {optionsError}
              </div>
            ) : options ? (
              <>
                <div className="flex gap-1 glass rounded-xl p-1 w-fit mb-4">
                  {(['calls', 'puts'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setOptionsTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${optionsTab === t ? (t === 'calls' ? 'bg-brand-green text-brand-dark' : 'bg-brand-red text-white') : 'text-gray-400 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-brand-border">
                        <th className="py-2 px-3 text-left">Strike</th>
                        <th className="py-2 px-3 text-right">Last</th>
                        <th className="py-2 px-3 text-right">Bid</th>
                        <th className="py-2 px-3 text-right">Ask</th>
                        <th className="py-2 px-3 text-right">Volume</th>
                        <th className="py-2 px-3 text-right">OI</th>
                        <th className="py-2 px-3 text-right">IV</th>
                        <th className="py-2 px-3 text-center">ITM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(options[optionsTab] || []).slice(0, 30).map((c: any, i: number) => (
                        <tr key={i} className={`border-b border-brand-border/30 hover:bg-brand-border/20 ${c.inTheMoney ? 'bg-brand-green/5' : ''}`}>
                          <td className={`py-2 px-3 font-mono font-bold ${c.inTheMoney ? 'text-brand-green' : ''}`}>${c.strike?.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">{c.lastPrice != null ? `$${c.lastPrice?.toFixed(2)}` : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-400">{c.bid != null ? `$${c.bid?.toFixed(2)}` : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-400">{c.ask != null ? `$${c.ask?.toFixed(2)}` : '—'}</td>
                          <td className="py-2 px-3 text-right font-mono">{c.volume?.toLocaleString() ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-mono">{c.openInterest?.toLocaleString() ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-mono">{c.impliedVolatility != null ? `${c.impliedVolatility?.toFixed(1)}%` : '—'}</td>
                          <td className="py-2 px-3 text-center">{c.inTheMoney ? <span className="text-brand-green">✓</span> : <span className="text-gray-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── AI Prediction Section ── */}
        <div className="glass rounded-2xl p-6 space-y-5">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-brand-green" />
              <h3 className="text-lg font-semibold">AI Prediction</h3>
            </div>
            <button
              onClick={fetchPrediction}
              disabled={loadingPred}
              className="primary px-4 py-2 rounded-full text-sm flex items-center gap-2"
            >
              {loadingPred ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {loadingPred ? 'Running Models...' : prediction ? 'Refresh' : 'Run Prediction'}
            </button>
          </div>

          {/* Loading state */}
          {loadingPred && !prediction && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Loader2 className="animate-spin text-brand-green" size={36} />
              <p className="text-sm">Training ARIMA + LSTM ensemble…</p>
              <p className="text-xs text-gray-600">This takes ~30 seconds on first run</p>
            </div>
          )}

          {/* Error state */}
          {!loadingPred && predError && (
            <div className="flex items-center gap-2 text-brand-red text-sm p-4 bg-brand-red/10 rounded-xl">
              <AlertTriangle size={16} /> {predError}
            </div>
          )}

          {/* Empty state */}
          {!loadingPred && !prediction && !predError && (
            <div className="text-center py-10 text-gray-500 text-sm">
              Click "Run Prediction" to generate a 30-day ARIMA + LSTM forecast.
            </div>
          )}

          {/* ── Results ── */}
          {prediction && (
            <div className="space-y-5">

              {/* A — Direction Hero */}
              <div className={`rounded-2xl border p-5 flex items-center justify-between ${recStyles.bg}`}>
                <div className="flex items-center gap-4">
                  <div className={`${recStyles.text}`}>
                    {recStyles.icon}
                  </div>
                  <div>
                    <div className={`text-2xl font-black tracking-tight ${recStyles.text}`}>
                      {rec}
                    </div>
                    <div className="text-gray-400 text-sm mt-0.5">30-day ensemble signal</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-black font-mono ${isUp ? 'price-up' : 'price-down'}`}>
                    {isUp ? '+' : ''}{prediction.price_change_pct.toFixed(2)}%
                  </div>
                  <div className="text-gray-400 text-xs mt-1">projected change</div>
                </div>
              </div>

              {/* B — Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Current</div>
                  <div className="font-mono font-bold">${prediction.current_price.toFixed(2)}</div>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">30d Target</div>
                  <div className={`font-mono font-bold ${isUp ? 'price-up' : 'price-down'}`}>
                    ${prediction.price_target.toFixed(2)}
                  </div>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Confidence</div>
                  <div className="font-bold">{(prediction.confidence * 100).toFixed(0)}%</div>
                  <div className="mt-2 h-1.5 rounded-full bg-brand-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-green"
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">RSI (14)</div>
                  <div className={`font-bold ${rsiLabel(prediction.rsi_value).color}`}>
                    {prediction.rsi_value.toFixed(1)}
                  </div>
                  <div className={`text-xs mt-1 ${rsiLabel(prediction.rsi_value).color}`}>
                    {rsiLabel(prediction.rsi_value).label}
                  </div>
                </div>
              </div>

              {/* C — Stitched Chart: last 30 days + forecast */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-400">Last 30 Days + 30-Day Forecast</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-gray-500 inline-block" /> Actual</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-6 h-0.5 inline-block ${isUp ? 'bg-brand-green' : 'bg-brand-red'}`} />
                      Forecast
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={(predChartData as any).points}>
                    <defs>
                      <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? '#00C896' : '#EF4444'} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={isUp ? '#00C896' : '#EF4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2E33" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#888', fontSize: 10 }}
                      tickFormatter={(d: string) => d.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#161A1E', border: '1px solid #2A2E33', borderRadius: 12 }}
                      labelStyle={{ color: '#888' }}
                      formatter={(val: any, name: string) => {
                        if (val === null) return [null, null];
                        const labels: Record<string, string> = {
                          actual: 'Price',
                          forecast: 'Forecast',
                          upper: 'Upper bound',
                          lower: 'Lower bound',
                        };
                        return [`$${Number(val).toFixed(2)}`, labels[name] ?? name];
                      }}
                    />
                    {/* Today reference line */}
                    <ReferenceLine
                      x={(predChartData as any).todayLabel}
                      stroke="#555"
                      strokeDasharray="4 4"
                      label={{ value: 'Today', fill: '#666', fontSize: 11, position: 'insideTopRight' }}
                    />
                    {/* Confidence band */}
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="url(#bandGrad)"
                      connectNulls={false}
                      dot={false}
                      legendType="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="white"
                      fillOpacity={0}
                      connectNulls={false}
                      dot={false}
                      legendType="none"
                    />
                    {/* Historical line */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#6B7280"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    {/* Forecast line */}
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke={isUp ? '#00C896' : '#EF4444'}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* D — Model Breakdown */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Model Targets (30d)</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'ARIMA', value: prediction.arima_target },
                    { label: 'LSTM', value: prediction.lstm_target },
                    { label: 'Ensemble', value: prediction.price_target, highlight: true },
                  ].map(({ label, value, highlight }) => {
                    const up = value >= prediction.current_price;
                    return (
                      <div
                        key={label}
                        className={`rounded-xl p-3 text-center border ${highlight ? 'border-brand-green/30 bg-brand-green/5' : 'glass'}`}
                      >
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className={`font-mono font-bold text-sm ${up ? 'price-up' : 'price-down'}`}>
                          ${value.toFixed(2)}
                        </div>
                        <div className={`text-xs mt-0.5 ${up ? 'price-up' : 'price-down'}`}>
                          {up ? '+' : ''}{(((value - prediction.current_price) / prediction.current_price) * 100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* E — Reasoning */}
              <div className="glass rounded-xl p-4 text-sm text-gray-300 space-y-1">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Brain size={14} className="text-brand-green" /> Analysis
                </p>
                <p className="leading-relaxed">{prediction.reasoning}</p>
              </div>

              <div className="text-xs text-gray-600 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Not financial advice — for educational use only.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column ── */}
      <div className="space-y-6">
        {/* Key Stats */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Key Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Open', quote?.open],
              ['High', quote?.high],
              ['Low', quote?.low],
              ['Volume', quote?.volume?.toLocaleString()],
              ['Mkt Cap', quote?.market_cap ? `$${(quote.market_cap / 1e9).toFixed(1)}B` : 'N/A'],
              ['P/E', quote?.pe_ratio?.toFixed(2) ?? 'N/A'],
              ['Div Yield', quote?.dividend_yield ? `${(quote.dividend_yield * 100).toFixed(2)}%` : 'N/A'],
              ['Sector', quote?.sector ?? 'N/A'],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-gray-400">{label}</span>
                <span className="font-mono font-medium">{typeof val === 'number' ? `$${val.toFixed(2)}` : val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Panel */}
        {token && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Paper Trade</h3>

            <div className="flex rounded-xl overflow-hidden mb-4 border border-brand-border">
              <button
                onClick={() => setTradeAction('BUY')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${tradeAction === 'BUY' ? 'bg-brand-green text-brand-dark' : 'text-gray-400 hover:text-white'}`}
              >
                BUY
              </button>
              <button
                onClick={() => setTradeAction('SELL')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${tradeAction === 'SELL' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'}`}
              >
                SELL
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Quantity</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full py-3 rounded-xl font-mono"
                />
              </div>

              <div className="glass rounded-xl p-4 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Price</span>
                  <span className="font-mono">${quote?.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Estimated Total</span>
                  <span className="font-mono text-brand-green">${(quantity * (quote?.price || 0)).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${tradeAction === 'BUY' ? 'bg-brand-green text-brand-dark hover:bg-opacity-90' : 'bg-brand-red text-white hover:bg-opacity-90'}`}
              >
                Review {tradeAction} Order
              </button>
            </div>
          </div>
        )}

        {/* Company Info */}
        {quote?.description && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">About</h3>
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-6">{quote.description}</p>
            <div className="mt-3 text-xs text-gray-500">
              {quote.sector} · {quote.industry}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => !tradeLoading && setShowConfirm(false)}>
          <div className="glass rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6">Confirm {tradeAction} Order</h3>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-gray-400">Ticker</span>
                <span className="font-bold text-brand-green">{ticker}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-gray-400">Action</span>
                <span className={`font-bold ${tradeAction === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>{tradeAction}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-gray-400">Quantity</span>
                <span className="font-mono">{quantity}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-brand-border">
                <span className="text-gray-400">Price</span>
                <span className="font-mono">${quote?.price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total</span>
                <span className="font-mono text-brand-green">${(quantity * (quote?.price || 0)).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={tradeLoading}
                className="flex-1 secondary py-3 rounded-xl text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeTrade}
                disabled={tradeLoading}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 ${tradeAction === 'BUY' ? 'bg-brand-green text-brand-dark' : 'bg-brand-red text-white'}`}
              >
                {tradeLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                {tradeLoading ? 'Processing...' : `Confirm ${tradeAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetail;
