# TradingView + Guardian Stop — safe validation checklist

## Supported scope

TradingView is used as a human-facing charting surface. Guardian Stop risk decisions and order authorization must use Guardian Stop's own state and a separately licensed/authorized broker or market-data adapter.

Do not automate TradingView.com, scrape charts, intercept browser traffic, use undocumented endpoints, or route TradingView alert/webhook payloads or market data into automated risk decisions/order generation unless the required express written permissions and data-provider rights have been obtained. TradingView's published terms currently restrict non-display processing and machine-driven risk-management use; its support guidance also says alerts are not designed for automated trading.

## Manual display test

1. Open TradingView normally and select the same instrument/timeframe used in the test plan.
2. Confirm the chart is visible and the user can inspect it manually.
3. Do not enable a webhook to Guardian Stop for order execution or risk enforcement.
4. Record the instrument, timeframe, visible timestamp, and any manually observed test scenario in the test notes. Do not ingest or scrape TradingView chart data.
5. Use a separately authorized demo feed or deterministic simulator to create the equivalent test event inside Guardian Stop.

## Guardian Stop simulator acceptance

- Simulated quote/event is clearly labelled SIMULATION, never as a TradingView feed.
- Risk evaluation uses server-side account policy and fresh telemetry.
- Breach persists a lockout before any close intent is emitted.
- Duplicate events do not create duplicate close intents.
- A simulated close acknowledgement is not considered confirmed until the simulator reports zero open positions.
- A locked user cannot submit a new simulated entry through the Guardian Stop order ticket.

## MT5 demo test

Use the read-only diagnostic in `companion/mt5/diagnostic.py` first. Do not run any order/close test until the read-only check proves the selected terminal is a DEMO account and the user explicitly authorizes a disposable demo execution test.

## External references

- TradingView Terms of Use: https://www.tradingview.com/policies/
- TradingView webhook guidance: https://www.tradingview.com/support/solutions/43000722015-using-credentials-for-webhooks/
- MetaTrader 5 Python integration: https://www.mql5.com/en/docs/python_metatrader5
