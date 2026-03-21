import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, market, backtest
from seed import seed_data
import asyncio

app = FastAPI(title="StockSage ML Service")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(market.router, prefix="/market", tags=["market"])
app.include_router(predict.router, prefix="/predict", tags=["predict"])
app.include_router(backtest.router, prefix="/backtest", tags=["backtest"])

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(seed_data())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
