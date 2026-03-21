"""
Neural network forecasting using scikit-learn MLPRegressor.
Replaces TensorFlow/Keras LSTM — same interface, no platform restrictions.
"""
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import MinMaxScaler
from datetime import timedelta
from typing import List
from app.models.schemas import ForecastPoint


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df = df.dropna()
    return df


def train_and_predict_lstm(history_df: pd.DataFrame, horizon: int = 30) -> List[ForecastPoint]:
    """
    Trains an MLP on sliding windows of historical data and predicts future prices.
    Interface is identical to the original LSTM version.
    """
    lookback = 30  # shorter than LSTM lookback for MLP efficiency
    df = _build_features(history_df)

    features = ['Close', 'Volume', 'SMA_20', 'SMA_50', 'RSI']
    data = df[features].values

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(data)

    # Build supervised dataset: each sample = flattened lookback window → next Close
    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i - lookback:i].flatten())
        y.append(scaled[i, 0])  # Close is index 0

    X, y = np.array(X), np.array(y)

    model = MLPRegressor(
        hidden_layer_sizes=(128, 64),
        activation='relu',
        max_iter=200,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=10,
    )
    model.fit(X, y)

    # Recursive forecast using rolling window
    current_window = scaled[-lookback:].copy()  # shape (lookback, n_features)
    forecast_values = []

    for _ in range(horizon):
        x_pred = current_window.flatten().reshape(1, -1)
        pred_scaled = float(model.predict(x_pred)[0])
        forecast_values.append(pred_scaled)

        # Shift window: drop oldest row, append new row with predicted Close
        new_row = current_window[-1].copy()
        new_row[0] = pred_scaled  # update Close
        current_window = np.vstack([current_window[1:], new_row])

    # Inverse-transform predictions (only Close column matters)
    dummy = np.zeros((len(forecast_values), len(features)))
    dummy[:, 0] = forecast_values
    inv_pred = scaler.inverse_transform(dummy)[:, 0]

    last_date = history_df.index[-1]
    forecast_points = []
    for i, price in enumerate(inv_pred):
        next_date = last_date + timedelta(days=i + 1)
        forecast_points.append(ForecastPoint(
            date=next_date.strftime('%Y-%m-%d'),
            price=round(float(price), 2)
        ))

    return forecast_points
