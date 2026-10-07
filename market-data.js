/*
 * This file is the only place a scheduled updater should edit.
 * Do not retain old values as "latest": update lastVerified and quoteDate,
 * or set verification.state to "failed" with the reason.
 */
window.marketSnapshot = {
  reportDate: "2026-10-07",
  lastVerified: "2026-10-04",
  verification: {
    state: "failed",
    headline: "資料核對失敗；請勿將本頁視為最新行情。",
    detail: "2026-10-07 核對時，Investing.com 的台灣加權即時頁、歷史頁標頭與同日歷史列出現互相衝突的數值。舊卡片保留原實際交易日；待來源一致後才會恢復已核對狀態。"
  },
  alerts: {
    activeKeys: ["rates-red"],
    lastNotifiedAt: "2026-10-04"
  },
  score: {
    value: "—",
    label: "資料未驗證",
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
      { name: "美國 2 年債", ticker: "US 2Y", value: "4.825%", change: "+0.038", quoteDate: "2026-10-02 收盤", tone: "amber", note: "短端仍在偏高區域。", source: "https://www.investing.com/rates-bonds/" },
      { name: "美國 10 年債", ticker: "US 10Y", value: "5.277%", change: "+0.043", quoteDate: "2026-10-02 收盤", tone: "red", note: "高於 5.20% 紅線，利率壓力已觸發。", source: "https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield" },
      { name: "日本 10 年債", ticker: "JP 10Y", value: "3.102%", change: "+0.002", quoteDate: "2026-10-02 收盤", tone: "red", note: "位於 3% 以上的高檔區。", source: "https://www.investing.com/rates-bonds/japan-10-year-bond-yield" }
    ],
    europe: [
      { name: "法國 10 年債", ticker: "FR 10Y", value: "4.859%", change: "-0.065", quoteDate: "2026-10-02 收盤", tone: "amber", note: "絕對利率不單獨代表法國風險。", source: "https://www.investing.com/rates-bonds/france-10-year-bond-yield" },
      { name: "德國 10 年債", ticker: "DE 10Y", value: "3.4545%", change: "-0.0657", quoteDate: "2026-10-02 收盤", tone: "amber", note: "作為 OAT–Bund 利差的比較基準。", source: "https://www.investing.com/rates-bonds/germany-10-year-bond-yield" },
      { name: "OAT–Bund 利差", ticker: "FR − DE", value: "140.45 bp", change: "約 +0.07 bp", quoteDate: "2026-10-02 收盤", tone: "amber", note: "由同日兩個 Investing 收盤價相減；模型另以官方日資料回測。", source: "https://www.investing.com/rates-bonds/france-10-year-bond-yield" },
      { name: "美元／日圓", ticker: "USD/JPY", value: "157.86", change: "-0.15%", quoteDate: "2026-10-02 收盤", tone: "amber", note: "模型看 5 日急跌（日圓急升），不是單看 158。", source: "https://www.investing.com/currencies/usd-jpy" }
    ],
    tsmc: [
      { name: "TSMC 台股", ticker: "2330", value: "NT$2,500", change: "-0.40%", quoteDate: "2026-10-02 收盤", tone: "green", note: "台股與 ADR 收盤時區不同，不能直接拿單日價差下結論。", source: "https://www.investing.com/equities/taiwan-semicon" },
      { name: "TSMC ADR", ticker: "TSM", value: "US$472.78", change: "+2.96%", quoteDate: "2026-10-02 收盤", tone: "green", note: "只採正式收盤，不把盤後交易當作正式市場訊號。", source: "https://www.investing.com/equities/taiwan-semicond.manufacturing-co" },
      { name: "官方基本面", ticker: "TSMC IR", value: "月營收／法說", change: "以官方更新為準", quoteDate: "非即時報價", tone: "green", note: "營收、指引與重大訊息才會改變基本面判讀；新聞只作研究線索。", source: "https://investor.tsmc.com/english/financial-calendar" }
    ]
    ,energy: [
      { name: "Brent 原油", ticker: "BRENT", value: "$102.72", change: "+0.46%", quoteDate: "2026-10-02 收盤", tone: "amber", note: "高於 $100，維持能源壓力觀察。", source: "https://www.investing.com/commodities/brent-oil" },
      { name: "WTI 原油", ticker: "WTI", value: "$91.26", change: "-1.73%", quoteDate: "2026-10-02 收盤", tone: "amber", note: "尚未到 $100 紅線。", source: "https://www.investing.com/commodities/crude-oil" }
    ]
  },
  tsmcNews: [
    { date: "2026-09-30", tag: "產能／海外投資", sourceName: "Reuters via Investing.com", title: "Reuters：TSMC 正評估擴大美國德州投資的可能性", description: "屬媒體報導與評估階段，並非公司已正式宣布的投資決定。", source: "https://www.investing.com/news/stock-market-news/tsmc-weighs-investment-in-texas-to-expand-us-chip-production-reuters-reports-4926170" },
    { date: "2026-09-30", tag: "分析師觀點", sourceName: "Piper Sandler via Investing.com", title: "分析師認為先進製程產能供應緊張", description: "這是外部研究觀點，不是台積電正式的營收或產能 guidance。", source: "https://www.investing.com/news/stock-market-news/piper-says-tsmc-capacity-sold-out-through-2028-on-strong-ai-demand-93CH-4924703" },
    { date: "2026-09-27", tag: "技術／產能", sourceName: "EDN via Investing.com", title: "2nm 產能預期的媒體報導", description: "保留為產業研究線索，需等待公司月營收、法說或重大訊息交叉確認。", source: "https://www.investing.com/news/stock-market-news/tsmc-2nm-wafer-capacity-to-exceed-earlier-estimates-edn-reports-4919289" }
  ],
  signals: [
    { level: "red", title: "利率壓力", rule: "美國 10 年債 > 5.20%", current: "資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源的同日數字一致後，才會重新判定。" },
    { level: "red", title: "恐慌波動", rule: "VIX ≥ 25", current: "資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源的同日數字一致後，才會重新判定。" },
    { level: "red", title: "能源衝擊", rule: "Brent ≥ $110 或 WTI ≥ $100", current: "資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源的同日數字一致後，才會重新判定。" },
    { level: "amber", title: "股市急跌", rule: "TWII、NDX 或 SOX 單日 ≤ -3%", current: "資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源的同日數字一致後，才會重新判定。" },
    { level: "amber", title: "歐債碎片化", rule: "OAT–Bund 高分位且 20 日擴大 ≥15 bp", current: "模型資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源一致且日頻模型重新產生後，才會重新判定。" },
    { level: "amber", title: "日圓 carry 回補", rule: "USD/JPY 5 日下跌 ≥2% 且匯率波動高", current: "模型資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源一致且日頻模型重新產生後，才會重新判定。" },
    { level: "amber", title: "TSMC 領先度", rule: "TSM 跌破均線且 20 日相對 SOX 落後 ≥5%", current: "模型資料未驗證；本次不更新觸發狀態", description: "等待所有必要來源一致且日頻模型重新產生後，才會重新判定。" }
  ]
};
