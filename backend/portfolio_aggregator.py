from typing import List, Dict, Any, Tuple
from .models import AggregatedHolding, SectorAllocation, PortfolioSummary, BrokerAccount
from .sector_service import resolve_sector
from .sector_data import KNOWN_INDIAN_STOCKS


async def aggregate_holdings(raw_holdings: List[Dict[str, Any]]) -> Tuple[List[AggregatedHolding], List[SectorAllocation], PortfolioSummary]:
    """
    Core normalization and aggregation engine:
    1. Groups holdings by ISIN (or symbol if ISIN missing).
    2. Merges multi-broker holdings with weighted average price.
    3. Resolves sector for each stock.
    4. Computes portfolio weights and sector allocations.
    """
    grouped: Dict[str, Dict[str, Any]] = {}

    for h in raw_holdings:
        isin = h.get("isin") or h.get("tradingsymbol")
        broker = h.get("broker", "unknown")
        qty = int(h.get("quantity", 0))
        avg_price = float(h.get("average_price", 0.0))
        last_price = float(h.get("last_price", 0.0))
        symbol = h.get("tradingsymbol", "")
        exchange = h.get("exchange", "NSE")
        day_chg = float(h.get("day_change", 0.0))
        day_pct = float(h.get("day_change_percent", 0.0))

        if isin not in grouped:
            company_name = KNOWN_INDIAN_STOCKS.get(isin, {}).get("name", symbol)
            grouped[isin] = {
                "isin": isin,
                "tradingsymbol": symbol,
                "company_name": company_name,
                "exchange": exchange,
                "brokers": set([broker]),
                "broker_quantities": {broker: qty},
                "total_quantity": qty,
                "total_cost": qty * avg_price,
                "last_price": last_price,
                "day_change": day_chg,
                "day_change_percent": day_pct,
                "sector": h.get("sector") or "Other",
            }
        else:
            entry = grouped[isin]
            entry["brokers"].add(broker)
            entry["broker_quantities"][broker] = entry["broker_quantities"].get(broker, 0) + qty
            entry["total_quantity"] += qty
            entry["total_cost"] += qty * avg_price
            if last_price > 0:
                entry["last_price"] = last_price
            if day_chg != 0:
                entry["day_change"] = day_chg
                entry["day_change_percent"] = day_pct

    # Calculate portfolio totals
    total_invested = sum(e["total_cost"] for e in grouped.values())
    total_current_value = sum(e["total_quantity"] * e["last_price"] for e in grouped.values())
    total_pnl = total_current_value - total_invested
    total_pnl_percent = (total_pnl / total_invested * 100.0) if total_invested > 0 else 0.0

    day_pnl = sum(e["total_quantity"] * e["day_change"] for e in grouped.values())
    day_pnl_percent = (day_pnl / (total_current_value - day_pnl) * 100.0) if (total_current_value - day_pnl) > 0 else 0.0

    aggregated_list: List[AggregatedHolding] = []
    sector_map: Dict[str, Dict[str, Any]] = {}

    for isin, item in grouped.items():
        qty = item["total_quantity"]
        total_cost = item["total_cost"]
        weighted_avg = (total_cost / qty) if qty > 0 else 0.0
        ltp = item["last_price"]
        current_val = qty * ltp
        pnl = current_val - total_cost
        pnl_pct = (pnl / total_cost * 100.0) if total_cost > 0 else 0.0
        weight_pct = (current_val / total_current_value * 100.0) if total_current_value > 0 else 0.0

        # Resolve sector dynamically
        sector = await resolve_sector(isin, item["tradingsymbol"])

        agg = AggregatedHolding(
            isin=isin,
            tradingsymbol=item["tradingsymbol"],
            company_name=item["company_name"],
            exchange=item["exchange"],
            brokers=sorted(list(item["brokers"])),
            broker_quantities=item["broker_quantities"],
            total_quantity=qty,
            average_price=round(weighted_avg, 2),
            last_price=round(ltp, 2),
            invested_value=round(total_cost, 2),
            current_value=round(current_val, 2),
            pnl=round(pnl, 2),
            pnl_percent=round(pnl_pct, 2),
            sector=sector,
            weight_percent=round(weight_pct, 2),
            day_change=round(item["day_change"], 2),
            day_change_percent=round(item["day_change_percent"], 2)
        )
        aggregated_list.append(agg)

        # Sector grouping
        if sector not in sector_map:
            sector_map[sector] = {
                "sector": sector,
                "current_value": 0.0,
                "invested_value": 0.0,
                "stock_count": 0,
            }
        sector_map[sector]["current_value"] += current_val
        sector_map[sector]["invested_value"] += total_cost
        sector_map[sector]["stock_count"] += 1

    # Sort holdings descending by current value
    aggregated_list.sort(key=lambda x: x.current_value, reverse=True)

    # Build Sector Allocations
    sector_allocations: List[SectorAllocation] = []
    for s_name, s_data in sector_map.items():
        s_cur = s_data["current_value"]
        s_inv = s_data["invested_value"]
        s_pnl = s_cur - s_inv
        s_pnl_pct = (s_pnl / s_inv * 100.0) if s_inv > 0 else 0.0
        s_weight = (s_cur / total_current_value * 100.0) if total_current_value > 0 else 0.0

        sector_allocations.append(SectorAllocation(
            sector=s_name,
            current_value=round(s_cur, 2),
            invested_value=round(s_inv, 2),
            weight_percent=round(s_weight, 2),
            pnl=round(s_pnl, 2),
            pnl_percent=round(s_pnl_pct, 2),
            stock_count=s_data["stock_count"]
        ))
    sector_allocations.sort(key=lambda x: x.current_value, reverse=True)

    # Top Gainers & Losers (sorted by pnl_percent)
    by_pnl = sorted(aggregated_list, key=lambda x: x.pnl_percent, reverse=True)
    top_gainers = by_pnl[:5]
    top_losers = sorted([x for x in aggregated_list if x.pnl_percent < 0], key=lambda x: x.pnl_percent)[:5]

    summary = PortfolioSummary(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current_value, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_percent=round(total_pnl_percent, 2),
        day_pnl=round(day_pnl, 2),
        day_pnl_percent=round(day_pnl_percent, 2),
        stock_count=len(aggregated_list),
        sector_count=len(sector_allocations),
        top_gainers=top_gainers,
        top_losers=top_losers,
    )

    return aggregated_list, sector_allocations, summary
