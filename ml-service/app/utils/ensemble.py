import numpy as np
import pandas as pd
from typing import List, Tuple, Dict
from app.models.schemas import ForecastPoint, PredictResponse
from app.utils.arima_model import fit_arima
from app.utils.lstm_model import train_and_predict_lstm

def _calc_confidence(
    current_price: float,
    arima_f: List[ForecastPoint],
    lstm_f: List[ForecastPoint],
    ensemble_f: List[ForecastPoint],
    pct_change: float,
    rsi: float,
) -> float:
    """
    Real confidence score based on:
    - Model agreement (ARIMA and LSTM pointing same direction)
    - Prediction interval width (narrower = more confident)
    - RSI confirmation of predicted direction
    """
    arima_direction = 1 if arima_f[-1].price > current_price else -1
    lstm_direction = 1 if lstm_f[-1].price > current_price else -1
    model_agreement = arima_direction == lstm_direction

    # Average band width as fraction of current price; narrower = more confident
    band_widths = [f.upper - f.lower for f in ensemble_f if f.upper and f.lower]
    if band_widths:
        avg_band_pct = np.mean(band_widths) / current_price
        # Normalize: 0% width → 1.0, 30%+ width → 0.0
        band_confidence = max(0.0, 1.0 - (avg_band_pct / 0.30))
    else:
        band_confidence = 0.5

    # RSI confirmation: RSI < 60 supports bullish, RSI > 40 supports bearish
    rsi_confirms = (pct_change > 0 and rsi < 65) or (pct_change < 0 and rsi > 35)

    confidence = 0.35  # base
    if model_agreement:
        confidence += 0.25
    if rsi_confirms:
        confidence += 0.15
    confidence += band_confidence * 0.25

    return round(min(0.93, max(0.30, confidence)), 2)


def _calc_volatility_mape(history_df: pd.DataFrame) -> float:
    """Estimate MAPE from recent price volatility."""
    returns = history_df['Close'].pct_change().dropna()
    daily_vol = returns.std() * 100
    # Scale to ~30-day horizon
    return round(min(20.0, max(1.0, daily_vol * 4.0)), 1)


def get_ensemble_prediction(ticker: str, history_df: pd.DataFrame, horizon: int = 30) -> PredictResponse:
    # Get individual forecasts
    arima_f = fit_arima(history_df, horizon)
    lstm_f = train_and_predict_lstm(history_df, horizon)

    ensemble_f = []
    for i in range(horizon):
        p_arima = arima_f[i].price
        p_lstm = lstm_f[i].price
        p_ens = round((p_arima * 0.4) + (p_lstm * 0.6), 2)

        lower = round(p_ens - (p_arima - arima_f[i].lower), 2)
        upper = round(p_ens + (arima_f[i].upper - p_arima), 2)

        ensemble_f.append(ForecastPoint(
            date=arima_f[i].date,
            price=p_ens,
            lower=lower,
            upper=upper
        ))

    # Recommendation logic
    current_price = history_df['Close'].iloc[-1]
    last_pred = ensemble_f[-1].price
    pct_change = (last_pred - current_price) / current_price * 100

    # RSI
    delta = history_df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi_series = 100 - (100 / (1 + rs))
    rsi = rsi_series.iloc[-1]
    if np.isnan(rsi) or np.isinf(rsi):
        rsi = 50

    recommendation = "HOLD"
    confidence = _calc_confidence(current_price, arima_f, lstm_f, ensemble_f, pct_change, rsi)
    mape_estimate = _calc_volatility_mape(history_df)

    reasoning = f"Price is projected to change by {pct_change:.1f}% over the next {horizon} days. "

    if pct_change > 5:
        if rsi < 70:
            recommendation = "BUY" if pct_change < 10 else "STRONG BUY"
            reasoning += f"Momentum is bullish and RSI ({rsi:.1f}) suggests it is not yet overbought."
        else:
            recommendation = "HOLD"
            reasoning += f"Despite upside potential, RSI ({rsi:.1f}) indicates overbought conditions."
    elif pct_change < -5:
        recommendation = "SELL" if pct_change > -10 else "STRONG SELL"
        reasoning += f"Forecast indicates significant downward pressure. RSI at {rsi:.1f}."
    else:
        recommendation = "HOLD"
        reasoning += "Price is expected to remain range-bound."

    return PredictResponse(
        ticker=ticker,
        arima_forecast=arima_f,
        lstm_forecast=lstm_f,
        ensemble_forecast=ensemble_f,
        recommendation=recommendation,
        confidence=confidence,
        reasoning=reasoning,
        metrics={"mape_estimate": mape_estimate},
        price_target=round(float(last_pred), 2),
        price_change_pct=round(float(pct_change), 2),
        rsi_value=round(float(rsi), 1),
        current_price=round(float(current_price), 2),
        arima_target=round(float(arima_f[-1].price), 2),
        lstm_target=round(float(lstm_f[-1].price), 2),
    )
