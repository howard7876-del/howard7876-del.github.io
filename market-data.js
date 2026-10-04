/*
 * This file is the only place a scheduled updater should edit.
 * Do not retain old values as "latest": update lastVerified and quoteDate,
 * or set verification.state to "failed" with the reason.
 */
window.marketSnapshot = {
  reportDate: "2026-10-04",
  lastVerified: "2026-10-04",
  verification: {
    state: "verified",
    headline: "已核對來源；今天休市，顯示最近交易日收盤。",
    detail: "資料來源頁面於 2026-10-04 核對。台、美、日市場主要報價的最近交易日為 2026-10-02；並未把週末當成新的交易日。"
  },
  alerts: {
    activeKeys: [],
    lastNotifiedAt: null
  },
  score: {
    value: "5.4 / 10",
    label: "🟡 謹慎偏中性",
    tone: "amber"
  },
  groups: {
    equity: [
      { name: "台灣加權", ticker: "TWII", value: "48,475.74", change: "+0.25%", quoteDate: "2026-10-02 收盤", tone: "green", note: "仍在歷史高檔附近。", source: "https://www.investing.com/indices/taiwan-weighted" },
      { name: "S&P 500", ticker: "SPX", value: "7,722.72", change: "+0.73%", quoteDate: "2026-10-02 收盤", tone: "green", note: "週五收高。", source: "https://www.investing.com/indices/us-spx-500" },
      { name: "Nasdaq 100", ticker: "NDX", value: "30,807.93", change: "+1.00%", quoteDate: "2026-10-02 收盤", tone: "green", note: "科技股動能仍正向。", source: "https://www.investing.com/indices/nq-100" },
      { name: "費城半導體", ticker: "SOX", value: "13,136.70", change: "+2.40%", quoteDate: "2026-10-02 收盤", tone: "green", note: "半導體相對強勢。", source: "https://www.investing.com/indices/phlx-semiconductor" },
      { name: "VIX", ticker: "VIX", value: "15.31", change: "-6.59%", quoteDate: "2026-10-02 收盤", tone: "green", note: "未顯示恐慌型波動。", source: "https://www.investing.com/indices/volatility-s-p-500" }
    ],
    rates: [
      { name: "美國 2 年債", ticker: "US 2Y", value: "4.783%", change: "參考值", quoteDate: "最近來源報價", tone: "amber", note: "短端仍在偏高區域。", source: "https://www.investing.com/rates-bonds/" },
      { name: "美國 10 年債", ticker: "US 10Y", value: "5.277%", change: "+0.043", quoteDate: "2026-10-02 收盤", tone: "red", note: "高於 5.20% 警戒線，尚未到 5.40% 紅線。", source: "https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield" },
      { name: "日本 10 年債", ticker: "JP 10Y", value: "3.102%", change: "+0.002", quoteDate: "2026-10-02 收盤", tone: "red", note: "位於 3% 以上的高檔區。", source: "https://www.investing.com/rates-bonds/japan-10-year-bond-yield" }
    ],
    energy: [
      { name: "Brent 原油", ticker: "BRENT", value: "$102.25", change: "-0.06%", quoteDate: "2026-10-02 收盤", tone: "amber", note: "高於 $100，維持能源壓力觀察。", source: "https://www.investing.com/commodities/brent-oil" },
      { name: "WTI 原油", ticker: "WTI", value: "$91.26", change: "-1.73%", quoteDate: "2026-10-02 收盤", tone: "amber", note: "尚未到 $100 紅線。", source: "https://www.investing.com/commodities/crude-oil" }
    ]
  },
  signals: [
    { level: "red", title: "利率壓力", rule: "美國 10 年債 ≥ 5.40%", current: "目前 5.277% · 未觸發", description: "若觸發，優先檢查高估值與長存續期資產的風險。" },
    { level: "red", title: "恐慌波動", rule: "VIX ≥ 25", current: "目前 15.31 · 未觸發", description: "這是市場壓力加速的提醒，不是單一買賣訊號。" },
    { level: "red", title: "能源衝擊", rule: "Brent ≥ $110 或 WTI ≥ $100", current: "Brent $102.25 · WTI $91.26 · 未觸發", description: "若觸發，檢查通膨與地緣風險是否同步升級。" },
    { level: "amber", title: "股市急跌", rule: "TWII、NDX 或 SOX 單日 ≤ -3%", current: "最近交易日未觸發", description: "先辨認是否為單一產業消息或跨市場賣壓。" }
  ]
};
