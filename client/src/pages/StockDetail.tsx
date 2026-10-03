import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  RefreshCw, Loader2, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Brain, ChevronDown,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, ReferenceLine,
} from 'recharts';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { formatPrice } from '../lib/format';
import { ChangeBadge } from '../components/ui/ChangeBadge';
import { chartTooltipOptional, chartTooltipUsd, useChartTheme } from '../lib/chartTheme';

const PERIODS = ['1d', '5d', '1mo', '3mo', '1y', '5y'];

const StockDetail: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const { token } = useAuthStore();
  const chart = useChartTheme();
  const [quote, setQuote]               = useState<any>(null);
  const [history, setHistory]           = useState<any[]>([]);
  const [prediction, setPrediction]     = useState<any>(null);
  const [predError, setPredError]       = useState('');
  const [period, setPeriod]             = useState('1y');
  const [loadingPred, setLoadingPred]   = useState(false);
  const [tradeAction, setTradeAction]   = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity]         = useState(1);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<'chart' | 'options'>('chart');
  const [options, setOptions]           = useState<any>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [optionsTab, setOptionsTab]     = useState<'calls' | 'puts'>('calls');

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
      setOptionsError(err.response?.data?.error || 'No options data available');
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
      toast.success(`${tradeAction} filled — ${quantity} share${quantity > 1 ? 's' : ''} of ${ticker}`);
      setShowConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Trade failed');
      setShowConfirm(false);
    } finally {
      setTradeLoading(false);
    }
  };

  const predChartData = useMemo(() => {
    if (!prediction || !history.length) return null;
    const last30 = history.slice(-30).map((h: any) => ({
      date: h.date, actual: h.close, forecast: null, upper: null, lower: null,
    }));
    const forecastPoints = prediction.ensemble_forecast.map((f: any) => ({
      date: f.date, actual: null, forecast: f.price, upper: f.upper, lower: f.lower,
    }));
    if (last30.length && forecastPoints.length) {
      forecastPoints[0] = { ...forecastPoints[0], actual: last30[last30.length - 1].actual };
    }
    return { points: [...last30, ...forecastPoints], todayLabel: last30[last30.length - 1]?.date };
  }, [prediction, history]);

  /** Header % = move from first bar in selected range to current (live quote when available). */
  const headerChangePct = useMemo(() => {
    const live = quote?.price;
    const dayPct = quote?.change_percent ?? 0;
    if (!history.length) return dayPct;
    const first = history[0]?.close;
    const lastBar = history[history.length - 1]?.close;
    const end = typeof live === 'number' && Number.isFinite(live) ? live : lastBar;
    if (
      first == null ||
      end == null ||
      !Number.isFinite(first) ||
      !Number.isFinite(end) ||
      first === 0
    ) {
      return dayPct;
    }
    if (history.length < 2 && period === '1d') return dayPct;
    const pct = ((end - first) / first) * 100;
    return Number.isFinite(pct) ? pct : dayPct;
  }, [history, quote, period]);

  const isUp  = prediction ? prediction.price_change_pct >= 0 : true;
  const rec   = prediction?.recommendation ?? '';

  const recColor = rec.includes('BUY') ? 't-green' : rec.includes('SELL') ? 't-red' : 't-yellow';
  const recIcon  = rec.includes('BUY') ? <ArrowUpRight size={24} /> : rec.includes('SELL') ? <ArrowDownRight size={24} /> : <Minus size={24} />;

  const rsiLabel = (rsi: number) => {
    if (rsi >= 70) return { label: 'Overbought', color: 't-red' };
    if (rsi <= 30) return { label: 'Oversold',   color: 't-green' };
    return { label: 'Neutral', color: 't-yellow' };
  };

  if (loading) return (
    <div className="t-card pf-empty"><Loader2 size={24} className="t-spin t-green" /></div>
  );

  return (
    <div className="sd-layout">
      {/* Left column */}
      <div className="sd-left">

        {/* Header card */}
        <div className="t-card sd-header">
          <div>
            <div className="sd-ticker">{ticker}</div>
            <div className="t-muted2 sd-company">{quote?.company_name}</div>
          </div>
          <div className="sd-price-block">
            <div className="sd-price">{quote?.price != null ? formatPrice(quote.price) : '—'}</div>
            <ChangeBadge value={headerChangePct} decimals={2} />
          </div>
        </div>

        {/* Tab bar */}
        <div className="sd-tabs">
          {(['chart', 'options'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'options' && !options && !optionsLoading) fetchOptions();
              }}
              className={`sd-tab ${activeTab === tab ? 'sd-tab--active' : ''}`}
            >
              {tab === 'chart' ? 'Price chart' : 'Options chain'}
            </button>
          ))}
        </div>

        {/* Chart tab */}
        {activeTab === 'chart' && (
          <>
            <div className="sd-period-bar">
              {PERIODS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`sd-period-btn ${period === p ? 'sd-period-btn--active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="t-card-bare">
              <div className="pf-chart-wrap">
                <h2 className="ui-section-label">Price history</h2>
                {history.length === 0 ? (
                  <div className="pf-empty t-muted2">No chart data for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }} tickFormatter={d => d.slice(5)} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }} width={56} />
                      <Tooltip
                        contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, fontFamily: chart.fontMono, fontSize: 12, borderRadius: 8 }}
                        formatter={chartTooltipUsd}
                      />
                      <Line type="monotone" dataKey="close" stroke={chart.gain} strokeWidth={2} dot={false} />
                      <Bar dataKey="volume" fill={chart.volume} opacity={0.35} yAxisId="vol" />
                      <YAxis yAxisId="vol" orientation="right" tick={false} width={0} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* Options tab */}
        {activeTab === 'options' && (
          <div className="t-card-bare">
            <div className="mo-table-header sd-options-header">
              <h2 className="ui-section-label t-mb-0">Options chain</h2>
              {options?.expirations && (
                <div className="sd-expiry-wrap">
                  <select
                    className="t-select"
                    value={selectedExpiry}
                    onChange={e => { setSelectedExpiry(e.target.value); fetchOptions(e.target.value); }}
                  >
                    {options.expirations.map((exp: string) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="sd-expiry-chevron t-muted2" />
                </div>
              )}
            </div>

            {optionsLoading ? (
              <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
            ) : optionsError ? (
              <div className="pf-empty t-muted2"><AlertTriangle size={14} /> {optionsError}</div>
            ) : options ? (
              <>
                <div className="sd-opt-tabs">
                  {(['calls', 'puts'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOptionsTab(t)}
                      className={`sd-opt-tab ${optionsTab === t ? (t === 'calls' ? 'sd-opt-tab--calls' : 'sd-opt-tab--puts') : ''}`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="mo-table-wrap">
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Strike</th>
                        <th>Last</th>
                        <th>Bid</th>
                        <th>Ask</th>
                        <th>Volume</th>
                        <th>Open int.</th>
                        <th>IV %</th>
                        <th>ITM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(options[optionsTab] || []).slice(0, 30).map((c: any, i: number) => (
                        <tr key={i} className={c.inTheMoney ? 'sd-itm-row' : ''}>
                          <td className={c.inTheMoney ? 't-green t-fw7' : ''}>{c.strike != null ? formatPrice(c.strike) : '—'}</td>
                          <td>{c.lastPrice != null ? formatPrice(c.lastPrice) : '—'}</td>
                          <td className="t-muted2">{c.bid != null ? formatPrice(c.bid) : '—'}</td>
                          <td className="t-muted2">{c.ask != null ? formatPrice(c.ask) : '—'}</td>
                          <td>{c.volume?.toLocaleString() ?? '—'}</td>
                          <td>{c.openInterest?.toLocaleString() ?? '—'}</td>
                          <td>{c.impliedVolatility != null ? `${c.impliedVolatility.toFixed(1)}%` : '—'}</td>
                          <td>{c.inTheMoney ? <span className="t-green">✓</span> : <span className="t-muted2">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* AI Prediction */}
        <div className="t-card-bare">
          <div className="mo-table-header sd-pred-header">
            <h2 className="ui-section-label t-mb-0"><Brain size={12} className="t-green" /> AI prediction</h2>
            <button
              type="button"
              className="t-btn t-btn-outline"
              onClick={fetchPrediction}
              disabled={loadingPred}
            >
              {loadingPred ? <><Loader2 size={10} className="t-spin" /> Running…</> : <><RefreshCw size={10} /> {prediction ? 'Refresh' : 'Run prediction'}</>}
            </button>
          </div>

          {loadingPred && !prediction && (
            <div className="pf-empty">
              <Loader2 size={20} className="t-spin t-green" />
              <div className="t-muted2 sd-pred-loading">Training ARIMA + LSTM ensemble…</div>
            </div>
          )}

          {!loadingPred && predError && (
            <div className="pf-empty t-red"><AlertTriangle size={14} /> {predError}</div>
          )}

          {!loadingPred && !prediction && !predError && (
            <div className="pf-empty t-muted2">Run prediction to generate a 30-day forecast.</div>
          )}

          {prediction && (
            <div className="sd-pred-body">
              {/* Recommendation banner */}
              <div className={`sd-rec-banner sd-rec-banner--${rec.includes('BUY') ? 'buy' : rec.includes('SELL') ? 'sell' : 'hold'}`}>
                <div className={`sd-rec-icon ${recColor}`}>{recIcon}</div>
                <div>
                  <div className={`sd-rec-label ${recColor}`}>{rec}</div>
                  <div className="t-muted2 sd-rec-sub">30-day ensemble signal</div>
                </div>
                <div className="sd-rec-pct">
                  <div className={`sd-rec-pct-val ${isUp ? 't-green' : 't-red'}`}>
                    {isUp ? '+' : ''}{prediction.price_change_pct.toFixed(2)}%
                  </div>
                  <div className="t-muted2 sd-rec-sub">Projected</div>
                </div>
              </div>

              {/* Stats row */}
              <div className="sd-pred-stats">
                {[
                  { label: 'Current', render: () => formatPrice(prediction.current_price), color: '' },
                  { label: '30d target', render: () => formatPrice(prediction.price_target), color: isUp ? 't-green' : 't-red' },
                  { label: 'RSI (14)', render: () => prediction.rsi_value.toFixed(1), color: rsiLabel(prediction.rsi_value).color },
                  { label: 'Confidence', render: () => `${(prediction.confidence * 100).toFixed(0)}%`, color: '' },
                ].map(({ label, render, color }) => (
                  <div key={label} className="t-card sd-pred-stat">
                    <div className="t-card-label">{label}</div>
                    <div className={`t-card-value ${color}`}>{render()}</div>
                  </div>
                ))}
              </div>

              {/* Forecast chart */}
              {predChartData && (
                <div className="pf-chart-wrap">
                  <h2 className="ui-section-label">Last 30 days + forecast</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={predChartData.points}>
                      <defs>
                        <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={isUp ? chart.gain : chart.loss} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={isUp ? chart.gain : chart.loss} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="date" tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }} tickFormatter={(d: string) => d.slice(5)} interval="preserveStartEnd" />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }} width={56} />
                      <Tooltip
                        contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, fontFamily: chart.fontMono, fontSize: 12, borderRadius: 8 }}
                        formatter={chartTooltipOptional}
                      />
                      <ReferenceLine x={predChartData.todayLabel} stroke={chart.grid} strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)" connectNulls={false} dot={false} legendType="none" />
                      <Area type="monotone" dataKey="lower" stroke="none" fill="white" fillOpacity={0} connectNulls={false} dot={false} legendType="none" />
                      <Line type="monotone" dataKey="actual"   stroke={chart.tickFill}                        strokeWidth={2} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" stroke={isUp ? chart.gain : chart.loss} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Model breakdown */}
              <div className="pf-chart-wrap">
                <h2 className="ui-section-label">Model targets (30d)</h2>
                <div className="sd-model-grid">
                  {[
                    { label: 'ARIMA',    value: prediction.arima_target },
                    { label: 'LSTM',     value: prediction.lstm_target },
                    { label: 'Ensemble', value: prediction.price_target, highlight: true },
                  ].map(({ label, value, highlight }) => {
                    const up = value >= prediction.current_price;
                    return (
                      <div key={label} className={`t-card sd-model-card ${highlight ? 'sd-model-card--highlight' : ''}`}>
                        <div className="t-card-label">{label}</div>
                        <div className={`t-card-value ${up ? 't-green' : 't-red'}`}>{formatPrice(value)}</div>
                        <div className={`t-card-sub ${up ? 't-green' : 't-red'}`}>
                          {up ? '+' : ''}{(((value - prediction.current_price) / prediction.current_price) * 100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reasoning */}
              <div className="pf-chart-wrap sd-reasoning">
                <h2 className="ui-section-label">Analysis</h2>
                <div className="sd-reasoning-text">{prediction.reasoning}</div>
              </div>

              <div className="sd-disclaimer t-muted2">
                <AlertTriangle size={10} /> Not financial advice — for educational use only
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="sd-right">
        {/* Key stats */}
        <div className="t-card-bare">
          <div className="mo-table-header">
            <h2 className="ui-section-label t-mb-0">Key statistics</h2>
          </div>
          <table className="t-table">
            <tbody>
              {[
                ['Open',     quote?.open != null ? formatPrice(quote.open) : '—'],
                ['High',     quote?.high != null ? formatPrice(quote.high) : '—'],
                ['Low',      quote?.low  != null ? formatPrice(quote.low)  : '—'],
                ['Day volume', quote?.volume?.toLocaleString() ?? '—'],
                ['Market cap',  quote?.market_cap ? `$${(quote.market_cap / 1e9).toFixed(1)}B` : '—'],
                ['P/E',      quote?.pe_ratio?.toFixed(2) ?? '—'],
                ['Div. yield',quote?.dividend_yield ? `${(quote.dividend_yield * 100).toFixed(2)}%` : '—'],
                ['Sector',   quote?.sector ?? '—'],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td className="t-muted2">{label}</td>
                  <td>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trade panel */}
        {token && (
          <div className="t-card-bare">
            <div className="mo-table-header">
              <h2 className="ui-section-label t-mb-0">Paper trade</h2>
            </div>
            <div className="sd-trade-body">
              <div className="sd-trade-tabs">
                <button
                  type="button"
                  onClick={() => setTradeAction('BUY')}
                  className={`sd-trade-tab ${tradeAction === 'BUY' ? 'sd-trade-tab--buy' : ''}`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setTradeAction('SELL')}
                  className={`sd-trade-tab ${tradeAction === 'SELL' ? 'sd-trade-tab--sell' : ''}`}
                >
                  SELL
                </button>
              </div>

              <div className="al-form-row">
                <label className="t-label">Quantity</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="t-input"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="sd-order-summary">
                <div className="sd-order-row">
                  <span className="t-muted2">Price</span>
                  <span>{quote?.price != null ? formatPrice(quote.price) : '—'}</span>
                </div>
                <div className="sd-order-row sd-order-total">
                  <span>Est. total</span>
                  <span className="t-green">{formatPrice(quantity * (quote?.price || 0))}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className={`t-btn al-submit ${tradeAction === 'BUY' ? 't-btn-accent' : 't-btn-danger'}`}
              >
                {`Review ${tradeAction.toLowerCase()} order`}
              </button>
            </div>
          </div>
        )}

        {/* About */}
        {quote?.description && (
          <div className="t-card-bare">
            <div className="mo-table-header">
              <h2 className="ui-section-label t-mb-0">About</h2>
            </div>
            <div className="sd-about">
              <div className="sd-about-text">{quote.description}</div>
              <div className="t-muted2 sd-about-meta">{quote.sector} · {quote.industry}</div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="sd-modal-backdrop" onClick={() => !tradeLoading && setShowConfirm(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-title">Confirm {tradeAction.toLowerCase()} order</div>
            <table className="t-table sd-modal-table">
              <tbody>
                {[
                  ['Ticker',   <span className="t-green t-fw7">{ticker}</span>],
                  ['Action',   <span className={tradeAction === 'BUY' ? 't-green t-fw7' : 't-red t-fw7'}>{tradeAction}</span>],
                  ['Quantity', quantity],
                  ['Price',    quote?.price != null ? formatPrice(quote.price) : '—'],
                  ['Total',    <span className="t-green t-fw7">{formatPrice(quantity * (quote?.price || 0))}</span>],
                ].map(([label, val]) => (
                  <tr key={String(label)}>
                    <td className="t-muted2">{label}</td>
                    <td>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sd-modal-actions">
              <button type="button" className="t-btn t-btn-ghost" onClick={() => setShowConfirm(false)} disabled={tradeLoading}>
                Cancel
              </button>
              <button
                type="button"
                onClick={executeTrade}
                disabled={tradeLoading}
                className={`t-btn ${tradeAction === 'BUY' ? 't-btn-accent' : 't-btn-danger'}`}
              >
                {tradeLoading ? <><Loader2 size={11} className="t-spin" /> Processing…</> : `'Confirm order'`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetail;
