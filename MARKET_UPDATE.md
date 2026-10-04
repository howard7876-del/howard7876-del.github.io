# Market Watch update playbook

This is Howard's personal risk-monitoring dashboard, not investment advice and not an automatic trading system. The site must never pretend that an old quote, an unverified headline, or an untested model is a current buy/sell conclusion.

## What gets refreshed

- `market-data.js` is the verified, human-readable current snapshot.
- `early-risk-data.js` is a same-origin, generated daily backtest snapshot. It exists because the official Riksbank API does not permit direct browser CORS requests from GitHub Pages.
- `scripts/generate-early-risk-data.mjs` contains the locked Early Risk v1 rules. Do not change thresholds just because a historical result looks bad or good.

## Non-negotiable integrity rules

1. Read the listed Investing.com source page for every visible current quote during the update run. Do not use a cached search result, a previous report, or an unsourced social post as the current number.
2. Update `lastVerified` only after those pages have been checked. Keep each instrument's `quoteDate` as the actual exchange date shown by Investing.com. Weekends and holidays normally retain the previous session's date.
3. If a current quote or its exchange date cannot be confirmed, do **not** retain it as if it were new. Set `verification.state` to `failed`, state the reason in plain language, and publish that status.
4. Every numeric card needs its original source link. Keep current quotes (Investing.com) separate from historical model sources (Yahoo Finance and Sveriges Riksbank).
5. News is a research watch, not a model input. State its date, source, and whether it is an official TSMC release, a Reuters report, or analyst commentary. Do not let a headline alone turn the dashboard red.
6. After editing, run syntax checks and refresh the model data. Commit only dashboard files; never stage unrelated user files. Both data files are loaded with a cache-busting query so a newly published verified snapshot is not silently served from browser cache.

## Current quote sources

- Taiwan Weighted: <https://www.investing.com/indices/taiwan-weighted>
- S&P 500: <https://www.investing.com/indices/us-spx-500>
- Nasdaq 100: <https://www.investing.com/indices/nq-100>
- Philadelphia Semiconductor: <https://www.investing.com/indices/phlx-semiconductor>
- VIX: <https://www.investing.com/indices/volatility-s-p-500>
- U.S. bond curve / 2Y: <https://www.investing.com/rates-bonds/>
- U.S. 10Y: <https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield>
- Japan 10Y: <https://www.investing.com/rates-bonds/japan-10-year-bond-yield>
- France 10Y: <https://www.investing.com/rates-bonds/france-10-year-bond-yield>
- Germany 10Y: <https://www.investing.com/rates-bonds/germany-10-year-bond-yield>
- USD/JPY: <https://www.investing.com/currencies/usd-jpy>
- TSMC Taiwan / 2330: <https://www.investing.com/equities/taiwan-semicon>
- TSMC ADR / TSM: <https://www.investing.com/equities/taiwan-semicond.manufacturing-co>
- Brent: <https://www.investing.com/commodities/brent-oil>
- WTI: <https://www.investing.com/commodities/crude-oil>

TSMC primary-source checks when the story is about its operation rather than price:

- Monthly revenue: <https://investor.tsmc.com/english/monthly-revenue/2026>
- Financial calendar: <https://investor.tsmc.com/english/financial-calendar>
- Official news archive: <https://pr.tsmc.com/english/news-archives>

## Early Risk v1 — fixed research rules

The score is a *risk-review prompt*, never an automatic sell command. It only escalates at `40 / 100` after at least two independent pillars contribute. Its market target is deliberately strict: a warning must occur **5–20 Taiwan trading days before** either a 7% Taiwan Weighted drawdown or a 10% SOX drawdown.

| Pillar | Amber | Red |
| --- | --- | --- |
| U.S. rates | U.S. 10Y +25bp in 20 days and 75th percentile | +50bp and 90th percentile |
| Euro sovereigns | OAT–Bund spread 75th percentile and +15bp in 20 days | 90th percentile and +25bp |
| JPY carry | USD/JPY -2% in 5 days plus high FX volatility | USD/JPY -4% in 5 days |
| Energy | Brent +10% in 5 days and 75th percentile | +15% and 90th percentile |
| Volatility | VIX >=20 or +30% in 5 days | VIX >=28 or +50% in 5 days |
| TSMC / semis | TSM below 50DMA and 20-day relative SOX return <=-5% | below 200DMA and <=-10% |

`OAT–Bund spread = (France 10Y - Germany 10Y) × 100bp`. Never call France risky from its absolute yield alone. Likewise, a high USD/JPY level is context; the carry-warning signal is a **rapid USD/JPY fall** (a sudden JPY rise).

## Historical model data and refresh

Run this after a successful current-source check:

```powershell
node scripts/generate-early-risk-data.mjs
node --check market-data.js
node --check early-risk-data.js
```

The generator pulls daily historical prices from Yahoo Finance and France/Germany 10Y history from Sveriges Riksbank (`FRGVB10Y`, `DEGVB10Y`; underlying source Refinitiv). It purposely shifts U.S. and European closes to the next Taiwan session so the backtest cannot use a later overseas close as if it were already known in Taiwan. The dashboard must disclose its current sample period, all recent warning episodes, timely hits, missed events, median lead days, and false alerts per year. Do **not** call any of these figures “accuracy.”

If the generator fails, leave or publish a failure status; do not reuse a stale historical result as a fresh run. A weak initial backtest is a valid result: show it and do not turn it into a notification rule merely because the user wants early warnings.

## Notification rules

Notify Howard only when a rule newly enters the triggered state, or when source verification/model generation itself fails. Persist `alerts.activeKeys` and `alerts.lastNotifiedAt`, so an unchanged red condition does not create hourly duplicate messages.

- `rates-red`: U.S. 10Y > 5.20%
- `vix-red`: VIX >= 25
- `energy-red`: Brent >= $110 or WTI >= $100
- `equity-drawdown`: TWII, NDX, or SOX <= -3% for the latest session
- `euro-fragmentation`: only after the generated v1 model reaches >=40 **and** the Euro pillar is active
- `yen-unwind`: only after the generated v1 model reaches >=40 **and** the JPY pillar is active
- `tsmc-leadership`: only after the generated v1 model reaches >=40 **and** the TSMC pillar is active

For an early-model notice, explicitly say `risk-review alert, not a sell instruction`, name the active pillars, model data date, and its published backtest caveat. Never notify from a single article. If the current backtest has not passed the documented independent validation plan, the alert should be a **review prompt only**, not a recommendation to reduce a position.

## Update outcome

After a successful source check, refresh the score explanation, relevant signal text, current quotes, TSMC News Watch, and `early-risk-data.js`. A no-change weekend check may preserve prices but must update `lastVerified` and say that the market was closed. Do not infer geopolitical news or give portfolio trade instructions without separately verified sources.
