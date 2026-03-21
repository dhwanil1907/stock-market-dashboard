from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.utils.market_data import get_stock_quote, get_stock_history, search_tickers
from app.utils.options_data import get_options_chain
from app.utils.sector_data import get_sector_performance
from app.models.schemas import QuoteResponse, HistoryPoint, SearchResult, OptionsChainResponse, SectorPerformance

router = APIRouter()

@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def quote(ticker: str):
    try:
        return get_stock_quote(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/history/{ticker}", response_model=List[HistoryPoint])
async def history(ticker: str, period: str = "1y"):
    return get_stock_history(ticker, period)

@router.get("/search", response_model=List[SearchResult])
async def search(q: str):
    return search_tickers(q)

@router.get("/options/{ticker}", response_model=OptionsChainResponse)
async def options(ticker: str, expiration: Optional[str] = None):
    try:
        return get_options_chain(ticker.upper(), expiration)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sectors", response_model=List[SectorPerformance])
async def sectors():
    try:
        return get_sector_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
