"""
Mock data for Zerodha and Angel One holdings to enable offline demonstration and testing.
"""

ZERODHA_MOCK_HOLDINGS = [
    {
        "tradingsymbol": "HDFCBANK",
        "isin": "INE040A01034",
        "exchange": "NSE",
        "quantity": 100,
        "average_price": 1580.50,
        "last_price": 1745.20,
        "pnl": 16470.0,
        "day_change": 14.80,
        "day_change_percent": 0.86,
        "sector": "Financial Services"
    },
    {
        "tradingsymbol": "RELIANCE",
        "isin": "INE002A01018",
        "exchange": "NSE",
        "quantity": 60,
        "average_price": 2720.00,
        "last_price": 2985.40,
        "pnl": 15924.0,
        "day_change": -12.30,
        "day_change_percent": -0.41,
        "sector": "Energy & Power"
    },
    {
        "tradingsymbol": "TCS",
        "isin": "INE467B01029",
        "exchange": "NSE",
        "quantity": 40,
        "average_price": 3850.00,
        "last_price": 4215.00,
        "pnl": 14600.0,
        "day_change": 45.10,
        "day_change_percent": 1.08,
        "sector": "Information Technology"
    },
    {
        "tradingsymbol": "PIDILITIND",
        "isin": "INE318A01026",
        "exchange": "NSE",
        "quantity": 50,
        "average_price": 2890.00,
        "last_price": 3145.80,
        "pnl": 12790.0,
        "day_change": 22.40,
        "day_change_percent": 0.72,
        "sector": "Chemicals"
    },
    {
        "tradingsymbol": "TITAN",
        "isin": "INE280A01028",
        "exchange": "NSE",
        "quantity": 30,
        "average_price": 3200.00,
        "last_price": 3610.50,
        "pnl": 12315.0,
        "day_change": -8.50,
        "day_change_percent": -0.23,
        "sector": "Consumer Durables & Retail"
    },
    {
        "tradingsymbol": "SUNPHARMA",
        "isin": "INE044A01036",
        "exchange": "NSE",
        "quantity": 70,
        "average_price": 1450.00,
        "last_price": 1780.25,
        "pnl": 23117.50,
        "day_change": 18.20,
        "day_change_percent": 1.03,
        "sector": "Healthcare & Pharma"
    },
    {
        "tradingsymbol": "BEL",
        "isin": "INE115A01026",
        "exchange": "NSE",
        "quantity": 350,
        "average_price": 220.00,
        "last_price": 298.60,
        "pnl": 27510.0,
        "day_change": 5.40,
        "day_change_percent": 1.84,
        "sector": "Capital Goods & Infra"
    },
    {
        "tradingsymbol": "ITC",
        "isin": "INE154A01025",
        "exchange": "NSE",
        "quantity": 250,
        "average_price": 415.00,
        "last_price": 475.90,
        "pnl": 15225.0,
        "day_change": 2.10,
        "day_change_percent": 0.44,
        "sector": "FMCG"
    }
]

ANGELONE_MOCK_HOLDINGS = [
    # Overlapping HDFCBANK held in both brokers to test ISIN aggregation!
    {
        "tradingsymbol": "HDFCBANK",
        "isin": "INE040A01034",
        "exchange": "NSE",
        "quantity": 50,
        "average_price": 1610.00,
        "last_price": 1745.20,
        "pnl": 6760.0,
        "day_change": 14.80,
        "day_change_percent": 0.86,
        "sector": "Financial Services"
    },
    {
        "tradingsymbol": "INFY",
        "isin": "INE009A01021",
        "exchange": "NSE",
        "quantity": 80,
        "average_price": 1640.00,
        "last_price": 1890.50,
        "pnl": 20040.0,
        "day_change": 24.30,
        "day_change_percent": 1.30,
        "sector": "Information Technology"
    },
    {
        "tradingsymbol": "TATAMOTORS",
        "isin": "INE155A01022",
        "exchange": "NSE",
        "quantity": 120,
        "average_price": 780.00,
        "last_price": 925.40,
        "pnl": 17448.0,
        "day_change": -6.80,
        "day_change_percent": -0.73,
        "sector": "Automobile"
    },
    {
        "tradingsymbol": "LT",
        "isin": "INE018A01030",
        "exchange": "NSE",
        "quantity": 35,
        "average_price": 3320.00,
        "last_price": 3720.00,
        "pnl": 14000.0,
        "day_change": 38.60,
        "day_change_percent": 1.05,
        "sector": "Capital Goods & Infra"
    },
    {
        "tradingsymbol": "ICICIBANK",
        "isin": "INE090A01021",
        "exchange": "NSE",
        "quantity": 110,
        "average_price": 1080.00,
        "last_price": 1265.70,
        "pnl": 20427.0,
        "day_change": 9.80,
        "day_change_percent": 0.78,
        "sector": "Financial Services"
    },
    {
        "tradingsymbol": "TATASTEEL",
        "isin": "INE081A01020",
        "exchange": "NSE",
        "quantity": 400,
        "average_price": 138.00,
        "last_price": 154.20,
        "pnl": 6480.0,
        "day_change": -1.20,
        "day_change_percent": -0.77,
        "sector": "Metals & Mining"
    },
    {
        "tradingsymbol": "BHARTIARTL",
        "isin": "INE397D01024",
        "exchange": "NSE",
        "quantity": 90,
        "average_price": 1280.00,
        "last_price": 1590.30,
        "pnl": 27927.0,
        "day_change": 16.50,
        "day_change_percent": 1.05,
        "sector": "Telecommunication"
    }
]

