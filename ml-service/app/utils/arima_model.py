import numpy as np
import pandas as pd
from pmdarima import auto_arima
from datetime import datetime, timedelta
from typing import List, Tuple
from app.models.schemas import ForecastPoint

def fit_arima(history_df: pd.DataFrame, horizon: int = 30) -> List[ForecastPoint]:
    """
    Fits an ARIMA model to the closing prices and returns a forecast.
    """
    closes = history_df['Close'].values
    
    # auto_arima to find best p, d, q
    model = auto_arima(closes, 
                      seasonal=False, 
                      error_action='ignore', 
                      suppress_warnings=True, 
                      stepwise=True)
    
    forecast, conf_int = model.predict(n_periods=horizon, return_conf_int=True)
    
    last_date = history_df.index[-1]
    forecast_points = []
    
    for i in range(len(forecast)):
        next_date = last_date + timedelta(days=i+1)
        forecast_points.append(ForecastPoint(
            date=next_date.strftime('%Y-%m-%d'),
            price=round(float(forecast[i]), 2),
            lower=round(float(conf_int[i][0]), 2),
            upper=round(float(conf_int[i][1]), 2)
        ))
        
    return forecast_points

def calculate_mape(actual, forecast):
    actual, forecast = np.array(actual), np.array(forecast)
    return np.mean(np.abs((actual - forecast) / actual)) * 100
