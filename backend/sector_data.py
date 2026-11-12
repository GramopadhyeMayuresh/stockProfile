"""
Pre-seeded mapping of Indian NSE/BSE ISINs and symbols to standardized market sectors.
"""

KNOWN_INDIAN_STOCKS = {
    # Financial Services
    "INE040A01034": {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd.", "sector": "Financial Services"},
    "INE090A01021": {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd.", "sector": "Financial Services"},
    "INE062A01020": {"symbol": "SBIN", "name": "State Bank of India", "sector": "Financial Services"},
    "INE238A01034": {"symbol": "AXISBANK", "name": "Axis Bank Ltd.", "sector": "Financial Services"},
    "INE216A01030": {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd.", "sector": "Financial Services"},
    "INE917I01012": {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd.", "sector": "Financial Services"},
    "INE237A01028": {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd.", "sector": "Financial Services"},
    "INE028A01039": {"symbol": "BANKBARODA", "name": "Bank of Baroda", "sector": "Financial Services"},
    "INE160A01022": {"symbol": "PUNJABNAT", "name": "Punjab National Bank", "sector": "Financial Services"},
    "INE721A01013": {"symbol": "SHRIRAMFIN", "name": "Shriram Finance Ltd.", "sector": "Financial Services"},
    "INE121A01024": {"symbol": "CHOLAFIN", "name": "Cholamandalam Investment & Finance", "sector": "Financial Services"},
    "INE528G01035": {"symbol": "YESBANK", "name": "Yes Bank Ltd.", "sector": "Financial Services"},
    "INE881D01027": {"symbol": "MUTHOOTFIN", "name": "Muthoot Finance Ltd.", "sector": "Financial Services"},
    "INE669E01016": {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance Co.", "sector": "Financial Services"},
    "INE795G01014": {"symbol": "SBILIFE", "name": "SBI Life Insurance Co.", "sector": "Financial Services"},

    # Information Technology
    "INE467B01029": {"symbol": "TCS", "name": "Tata Consultancy Services Ltd.", "sector": "Information Technology"},
    "INE009A01021": {"symbol": "INFY", "name": "Infosys Ltd.", "sector": "Information Technology"},
    "INE860A01027": {"symbol": "HCLTECH", "name": "HCL Technologies Ltd.", "sector": "Information Technology"},
    "INE075A01022": {"symbol": "WIPRO", "name": "Wipro Ltd.", "sector": "Information Technology"},
    "INE669C01036": {"symbol": "TECHM", "name": "Tech Mahindra Ltd.", "sector": "Information Technology"},
    "INE214T01019": {"symbol": "LTIM", "name": "LTIMindtree Ltd.", "sector": "Information Technology"},
    "INE445H01015": {"symbol": "PERSISTENT", "name": "Persistent Systems Ltd.", "sector": "Information Technology"},
    "INE00CE01017": {"symbol": "COFORGE", "name": "Coforge Ltd.", "sector": "Information Technology"},
    "INE670K01029": {"symbol": "MPHASIS", "name": "MphasiS Ltd.", "sector": "Information Technology"},

    # Energy & Power
    "INE002A01018": {"symbol": "RELIANCE", "name": "Reliance Industries Ltd.", "sector": "Energy & Power"},
    "INE733E01010": {"symbol": "NTPC", "name": "NTPC Ltd.", "sector": "Energy & Power"},
    "INE752E01010": {"symbol": "POWERGRID", "name": "Power Grid Corporation of India Ltd.", "sector": "Energy & Power"},
    "INE213A01029": {"symbol": "ONGC", "name": "Oil & Natural Gas Corp Ltd.", "sector": "Energy & Power"},
    "INE029A01011": {"symbol": "BPCL", "name": "Bharat Petroleum Corp Ltd.", "sector": "Energy & Power"},
    "INE094A01015": {"symbol": "IOC", "name": "Indian Oil Corporation Ltd.", "sector": "Energy & Power"},
    "INE129A01019": {"symbol": "GAIL", "name": "GAIL (India) Ltd.", "sector": "Energy & Power"},
    "INE245H01013": {"symbol": "TATAPOWER", "name": "Tata Power Company Ltd.", "sector": "Energy & Power"},
    "INE364U01010": {"symbol": "ADANIGREEN", "name": "Adani Green Energy Ltd.", "sector": "Energy & Power"},

    # FMCG
    "INE030A01027": {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd.", "sector": "FMCG"},
    "INE154A01025": {"symbol": "ITC", "name": "ITC Ltd.", "sector": "FMCG"},
    "INE239A01016": {"symbol": "NESTLEIND", "name": "Nestle India Ltd.", "sector": "FMCG"},
    "INE216A01012": {"symbol": "BRITANNIA", "name": "Britannia Industries Ltd.", "sector": "FMCG"},
    "INE196A01026": {"symbol": "MARICO", "name": "Marico Ltd.", "sector": "FMCG"},
    "INE016A01026": {"symbol": "DABUR", "name": "Dabur India Ltd.", "sector": "FMCG"},
    "INE102D01028": {"symbol": "GODREJCP", "name": "Godrej Consumer Products Ltd.", "sector": "FMCG"},
    "INE584A01023": {"symbol": "COLPAL", "name": "Colgate-Palmolive (India) Ltd.", "sector": "FMCG"},
    "INE758T01015": {"symbol": "VBL", "name": "Varun Beverages Ltd.", "sector": "FMCG"},

    # Automobile & Auto Components
    "INE155A01022": {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd.", "sector": "Automobile"},
    "INE585B01010": {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd.", "sector": "Automobile"},
    "INE101A01026": {"symbol": "M&M", "name": "Mahindra & Mahindra Ltd.", "sector": "Automobile"},
    "INE296A01024": {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto Ltd.", "sector": "Automobile"},
    "INE158A01026": {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp Ltd.", "sector": "Automobile"},
    "INE066A01021": {"symbol": "EICHERMOT", "name": "Eicher Motors Ltd.", "sector": "Automobile"},
    "INE256A01028": {"symbol": "BHARATFORG", "name": "Bharat Forge Ltd.", "sector": "Automobile"},
    "INE475B01022": {"symbol": "SAMVARDHANA", "name": "Samvardhana Motherson International", "sector": "Automobile"},
    "INE438A01022": {"symbol": "APOLLOTYRE", "name": "Apollo Tyres Ltd.", "sector": "Automobile"},

    # Healthcare & Pharmaceuticals
    "INE044A01036": {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd.", "sector": "Healthcare & Pharma"},
    "INE059A01026": {"symbol": "CIPLA", "name": "Cipla Ltd.", "sector": "Healthcare & Pharma"},
    "INE079A01024": {"symbol": "DRREDDY", "name": "Dr. Reddy's Laboratories Ltd.", "sector": "Healthcare & Pharma"},
    "INE118H01025": {"symbol": "DIVISLAB", "name": "Divi's Laboratories Ltd.", "sector": "Healthcare & Pharma"},
    "INE437A01024": {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals Enterprise Ltd.", "sector": "Healthcare & Pharma"},
    "INE575P01011": {"symbol": "MANKIND", "name": "Mankind Pharma Ltd.", "sector": "Healthcare & Pharma"},
    "INE326A01037": {"symbol": "LUPIN", "name": "Lupin Ltd.", "sector": "Healthcare & Pharma"},
    "INE649A01018": {"symbol": "TORNTPHARM", "name": "Torrent Pharmaceuticals Ltd.", "sector": "Healthcare & Pharma"},

    # Capital Goods, Defense & Infrastructure
    "INE018A01030": {"symbol": "LT", "name": "Larsen & Toubro Ltd.", "sector": "Capital Goods & Infra"},
    "INE115A01026": {"symbol": "BEL", "name": "Bharat Electronics Ltd.", "sector": "Capital Goods & Infra"},
    "INE263A01024": {"symbol": "HAL", "name": "Hindustan Aeronautics Ltd.", "sector": "Capital Goods & Infra"},
    "INE257A01026": {"symbol": "BHEL", "name": "Bharat Heavy Electricals Ltd.", "sector": "Capital Goods & Infra"},
    "INE013A01015": {"symbol": "SIEMENS", "name": "Siemens Ltd.", "sector": "Capital Goods & Infra"},
    "INE117A01022": {"symbol": "ABB", "name": "ABB India Ltd.", "sector": "Capital Goods & Infra"},
    "INE647O01011": {"symbol": "POLYCAB", "name": "Polycab India Ltd.", "sector": "Capital Goods & Infra"},
    "INE423A01024": {"symbol": "ADANIPORTS", "name": "Adani Ports & SEZ Ltd.", "sector": "Capital Goods & Infra"},

    # Chemicals
    "INE318A01026": {"symbol": "PIDILITIND", "name": "Pidilite Industries Ltd.", "sector": "Chemicals"},
    "INE647A01010": {"symbol": "SRF", "name": "SRF Ltd.", "sector": "Chemicals"},
    "INE406A01037": {"symbol": "AARTIIND", "name": "Aarti Industries Ltd.", "sector": "Chemicals"},
    "INE540A01017": {"symbol": "DEEPAKNTR", "name": "Deepak Nitrite Ltd.", "sector": "Chemicals"},
    "INE328A01027": {"symbol": "TATACHEM", "name": "Tata Chemicals Ltd.", "sector": "Chemicals"},

    # Consumer Durables & Retail
    "INE280A01028": {"symbol": "TITAN", "name": "Titan Company Ltd.", "sector": "Consumer Durables & Retail"},
    "INE021A01026": {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd.", "sector": "Consumer Durables & Retail"},
    "INE347G01014": {"symbol": "BERGEPAINT", "name": "Berger Paints India Ltd.", "sector": "Consumer Durables & Retail"},
    "INE176B01034": {"symbol": "HAVELLS", "name": "Havells India Ltd.", "sector": "Consumer Durables & Retail"},
    "INE092T01019": {"symbol": "TRENT", "name": "Trent Ltd.", "sector": "Consumer Durables & Retail"},
    "INE192R01011": {"symbol": "DMART", "name": "Avenue Supermarts Ltd. (DMart)", "sector": "Consumer Durables & Retail"},

    # Metals & Mining
    "INE081A01020": {"symbol": "TATASTEEL", "name": "Tata Steel Ltd.", "sector": "Metals & Mining"},
    "INE019A01038": {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd.", "sector": "Metals & Mining"},
    "INE038A01020": {"symbol": "HINDALCO", "name": "Hindalco Industries Ltd.", "sector": "Metals & Mining"},
    "INE205A01025": {"symbol": "VEDL", "name": "Vedanta Ltd.", "sector": "Metals & Mining"},
    "INE203G01027": {"symbol": "COALINDIA", "name": "Coal India Ltd.", "sector": "Metals & Mining"},
    "INE584G01023": {"symbol": "NMDC", "name": "NMDC Ltd.", "sector": "Metals & Mining"},

    # Telecommunication
    "INE397D01024": {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd.", "sector": "Telecommunication"},
    "INE669G01011": {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd.", "sector": "Financial Services"},
    "INE742F01042": {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd.", "sector": "Diversified"},

    # Construction Materials & Real Estate
    "INE358A01014": {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd.", "sector": "Construction Materials"},
    "INE070A01015": {"symbol": "SHREECEM", "name": "Shree Cement Ltd.", "sector": "Construction Materials"},
    "INE012A01025": {"symbol": "AMBUJACEM", "name": "Ambuja Cements Ltd.", "sector": "Construction Materials"},
    "INE271C01023": {"symbol": "DLF", "name": "DLF Ltd.", "sector": "Real Estate"},
    "INE084A01012": {"symbol": "GODREJPROP", "name": "Godrej Properties Ltd.", "sector": "Real Estate"},
}

# Fast symbol -> ISIN reverse map
SYMBOL_TO_ISIN = {v["symbol"].upper(): k for k, v in KNOWN_INDIAN_STOCKS.items()}
