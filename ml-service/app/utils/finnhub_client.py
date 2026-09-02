import os
import finnhub
from dotenv import load_dotenv

load_dotenv()

_client: finnhub.Client | None = None

def get_client() -> finnhub.Client:
    global _client
    if _client is None:
        api_key = os.getenv("FINNHUB_API_KEY")
        if not api_key:
            raise RuntimeError("FINNHUB_API_KEY not set in environment")
        _client = finnhub.Client(api_key=api_key)
    return _client
