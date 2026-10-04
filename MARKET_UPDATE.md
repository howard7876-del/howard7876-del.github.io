# Market Watch update playbook

This site is a market-monitoring dashboard, not investment advice. `market-data.js` is the single source of truth for the displayed snapshot.

## Non-negotiable integrity rules

1. Read the public Investing.com source page for each quote listed below during the update run. Do not use a cached search result, a previous report, or an unsourced social post as the current number.
2. Update `lastVerified` only after the pages have been checked. Keep each instrument's `quoteDate` as the actual exchange date shown by Investing.com. On a weekend or market holiday it is normal for this to be the previous session.
3. If a current quote or its exchange date cannot be confirmed, do **not** retain it as if it were new. Set `verification.state` to `failed`, write a plain-language reason in `headline` and `detail`, and publish that status.
4. Keep all quote values linked to their instrument source. Never overwrite a source URL with an unaudited link.
5. Check JavaScript syntax after editing. Commit and push only the files used by the dashboard (`market-data.js`, or a required dashboard file); do not stage unrelated user files. The page loads `market-data.js` with a cache-busting query so a newly published verified snapshot is fetched rather than a browser-cached prior snapshot.

## Quote sources

- Taiwan Weighted: <https://www.investing.com/indices/taiwan-weighted>
- S&P 500: <https://www.investing.com/indices/us-spx-500>
- Nasdaq 100: <https://www.investing.com/indices/nq-100>
- Philadelphia Semiconductor: <https://www.investing.com/indices/phlx-semiconductor>
- VIX: <https://www.investing.com/indices/volatility-s-p-500>
- U.S. bond curve / 2Y: <https://www.investing.com/rates-bonds/>
- U.S. 10Y: <https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield>
- Japan 10Y: <https://www.investing.com/rates-bonds/japan-10-year-bond-yield>
- Brent: <https://www.investing.com/commodities/brent-oil>
- WTI: <https://www.investing.com/commodities/crude-oil>

## Notification rules

Notify Howard only when a rule newly enters the triggered state, or when the data-verification process itself fails. Store the current triggered IDs in `alerts.activeKeys` and the send time in `alerts.lastNotifiedAt`, so a persistent red signal does not produce duplicate notifications each run.

- `rates-red`: U.S. 10Y > 5.20%
- `vix-red`: VIX >= 25
- `energy-red`: Brent >= $110 or WTI >= $100
- `equity-drawdown`: TWII, NDX, or SOX <= -3% for the latest session

The notification must name the instrument, current value, rule crossed, quote date, and the relevant Investing.com link. It must say it is a risk alert, not a buy/sell instruction.

## Update outcome

After a successful source check, refresh the score explanation and each signal's `current` text from the same snapshot. A no-change weekend check may preserve prices but must update `lastVerified` and explicitly say the market was closed. Do not infer geopolitical news or make portfolio trade instructions without a separately verified source.
