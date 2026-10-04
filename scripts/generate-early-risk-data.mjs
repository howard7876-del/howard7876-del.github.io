/*
 * Rebuilds the small, same-origin dataset used by the Early Risk backtest.
 *
 * The browser deliberately does not fetch Riksbank directly: its API has no
 * CORS header for GitHub Pages. Keeping the resulting snapshot in the repo
 * makes the calculation reproducible, date-stamped, and honest about its
 * refresh time instead of silently falling back to stale data.
 *
 * Run: node scripts/generate-early-risk-data.mjs
 */
import { writeFile } from 'node:fs/promises';

const START_DATE = '2006-01-01';
const END_DATE = new Date().toISOString().slice(0, 10);
const SCORE_THRESHOLD = 40;
const REARM_THRESHOLD = 25;
const TARGET_LEAD_MIN = 5;
const TARGET_LEAD_MAX = 20;
const DAY_SECONDS = 24 * 60 * 60;

const yahooSeries = {
  us10: '^TNX',
  vix: '^VIX',
  usdjpy: 'JPY=X',
  brent: 'BZ=F',
  tsm: 'TSM',
  sox: '^SOX',
  twii: '^TWII'
};

const riksbankSeries = {
  france10: 'FRGVB10Y',
  germany10: 'DEGVB10Y'
};

const iso = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
const finite = (value) => Number.isFinite(value) && value !== null;
const percent = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const basisPoints = (value) => `${Math.round(value * 100)} bp`;
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const standardDeviation = (values) => {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} while reading ${url}`);
  return response.json();
}

async function getYahoo(symbol) {
  const period1 = Math.floor(Date.parse(`${START_DATE}T00:00:00Z`) / 1000);
  const period2 = Math.floor(Date.parse(`${END_DATE}T00:00:00Z`) / 1000) + DAY_SECONDS;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  const data = await getJson(url);
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const output = new Map();
  timestamps.forEach((timestamp, index) => {
    const close = closes[index];
    if (finite(close)) output.set(iso(timestamp), close);
  });
  if (!output.size) throw new Error(`No Yahoo observations returned for ${symbol}`);
  return output;
}

async function getRiksbank(seriesId) {
  const url = `https://api.riksbank.se/swea/v1/Observations/${seriesId}/${START_DATE}/${END_DATE}`;
  const data = await getJson(url);
  const output = new Map();
  data.forEach(({ date, value }) => {
    if (date && finite(value)) output.set(date, value);
  });
  if (!output.size) throw new Error(`No Riksbank observations returned for ${seriesId}`);
  return output;
}

function makeLookup(map) {
  const dates = [...map.keys()].sort();
  const values = dates.map((date) => map.get(date));
  return {
    atOrBefore(date, strict = false) {
      let low = 0;
      let high = dates.length - 1;
      let answer = -1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const allowed = strict ? dates[middle] < date : dates[middle] <= date;
        if (allowed) {
          answer = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      return answer >= 0 ? { date: dates[answer], value: values[answer] } : null;
    }
  };
}

function valueAt(rows, index, key, lookback = 0) {
  const row = rows[index - lookback];
  return row ? row[key] : null;
}

function rollingPercentile(rows, index, key, window = 252) {
  if (index < window - 1) return null;
  const values = rows.slice(index - window + 1, index + 1).map((row) => row[key]).filter(finite);
  const current = rows[index][key];
  if (!finite(current) || values.length < window * 0.9) return null;
  return values.filter((value) => value <= current).length / values.length * 100;
}

function movingAverage(rows, index, key, window) {
  if (index < window - 1) return null;
  const values = rows.slice(index - window + 1, index + 1).map((row) => row[key]).filter(finite);
  return values.length === window ? average(values) : null;
}

function calculateFxVolatility(rows, index) {
  if (index < 20) return null;
  const returns = [];
  for (let cursor = index - 19; cursor <= index; cursor += 1) {
    const prior = rows[cursor - 1]?.usdjpy;
    const current = rows[cursor]?.usdjpy;
    if (!finite(prior) || !finite(current)) return null;
    returns.push(current / prior - 1);
  }
  return standardDeviation(returns) * Math.sqrt(252);
}

function buildState(rows, index) {
  const row = rows[index];
  const us10Delta20 = row.us10 - valueAt(rows, index, 'us10', 20);
  const euroDelta20 = row.euroSpread - valueAt(rows, index, 'euroSpread', 20);
  const yenReturn5 = row.usdjpy / valueAt(rows, index, 'usdjpy', 5) - 1;
  const brentReturn5 = row.brent / valueAt(rows, index, 'brent', 5) - 1;
  const vixReturn5 = row.vix / valueAt(rows, index, 'vix', 5) - 1;
  const tsmReturn20 = row.tsm / valueAt(rows, index, 'tsm', 20) - 1;
  const soxReturn20 = row.sox / valueAt(rows, index, 'sox', 20) - 1;
  const tsmRelative20 = tsmReturn20 - soxReturn20;
  const fxVol = calculateFxVolatility(rows, index);
  row.fxVol = fxVol;
  const fxVolPct = rollingPercentile(rows, index, 'fxVol');
  const us10Pct = rollingPercentile(rows, index, 'us10');
  const euroPct = rollingPercentile(rows, index, 'euroSpread');
  const brentPct = rollingPercentile(rows, index, 'brent');
  const tsm50 = movingAverage(rows, index, 'tsm', 50);
  const tsm200 = movingAverage(rows, index, 'tsm', 200);
  const enoughData = [us10Delta20, euroDelta20, yenReturn5, brentReturn5, vixReturn5, tsmRelative20, fxVolPct, us10Pct, euroPct, brentPct, tsm50, tsm200].every(finite);
  if (!enoughData) return null;

  const pillars = [
    {
      id: 'rates', label: '美國利率', weight: 15,
      state: us10Delta20 >= 0.50 && us10Pct >= 90 ? 'red' : us10Delta20 >= 0.25 && us10Pct >= 75 ? 'amber' : 'clear',
      detail: `10Y 20 日 ${us10Delta20 >= 0 ? '+' : ''}${basisPoints(us10Delta20)} · 252 日百分位 ${us10Pct.toFixed(0)}%`
    },
    {
      id: 'euro', label: '歐洲主權債', weight: 15,
      state: euroPct >= 90 && euroDelta20 >= 0.25 ? 'red' : euroPct >= 75 && euroDelta20 >= 0.15 ? 'amber' : 'clear',
      detail: `OAT–Bund ${basisPoints(row.euroSpread)} · 20 日 ${euroDelta20 >= 0 ? '+' : ''}${basisPoints(euroDelta20)} · 百分位 ${euroPct.toFixed(0)}%`
    },
    {
      id: 'yen', label: '日圓／carry', weight: 15,
      state: yenReturn5 <= -0.04 ? 'red' : yenReturn5 <= -0.02 && fxVolPct >= 90 ? 'amber' : 'clear',
      detail: `USD/JPY 5 日 ${percent(yenReturn5)} · 匯率波動百分位 ${fxVolPct.toFixed(0)}%`
    },
    {
      id: 'energy', label: '能源衝擊', weight: 10,
      state: brentReturn5 >= 0.15 && brentPct >= 90 ? 'red' : brentReturn5 >= 0.10 && brentPct >= 75 ? 'amber' : 'clear',
      detail: `Brent 5 日 ${percent(brentReturn5)} · 價格百分位 ${brentPct.toFixed(0)}%`
    },
    {
      id: 'volatility', label: '市場波動', weight: 15,
      state: row.vix >= 28 || vixReturn5 >= 0.50 ? 'red' : row.vix >= 20 || vixReturn5 >= 0.30 ? 'amber' : 'clear',
      detail: `VIX ${row.vix.toFixed(2)} · 5 日 ${percent(vixReturn5)}`
    },
    {
      id: 'tsmc', label: '台積電／半導體', weight: 20,
      state: row.tsm < tsm200 && tsmRelative20 <= -0.10 ? 'red' : row.tsm < tsm50 && tsmRelative20 <= -0.05 ? 'amber' : 'clear',
      detail: `TSM 相對 SOX 20 日 ${percent(tsmRelative20)} · 50／200 日線已納入`
    }
  ];
  const active = pillars.filter((pillar) => pillar.state !== 'clear');
  const rawScore = pillars.reduce((total, pillar) => total + (pillar.state === 'red' ? pillar.weight : pillar.state === 'amber' ? Math.round(pillar.weight * 0.6) : 0), 0);
  const score = Math.min(100, rawScore + (active.length >= 2 ? 10 : 0));
  return { score, pillars, activeCount: active.length };
}

function drawdownEvents(rows) {
  const events = [];
  let inEvent = false;
  for (let index = 20; index < rows.length; index += 1) {
    const past = rows.slice(index - 20, index + 1);
    const twiiPeak = Math.max(...past.map((row) => row.twii));
    const soxPeak = Math.max(...past.map((row) => row.sox));
    const twiiDrawdown = rows[index].twii / twiiPeak - 1;
    const soxDrawdown = rows[index].sox / soxPeak - 1;
    const triggered = twiiDrawdown <= -0.07 || soxDrawdown <= -0.10;
    if (triggered && !inEvent) events.push({ index, date: rows[index].date, twiiDrawdown, soxDrawdown });
    inEvent = triggered;
  }
  return events;
}

function tierFor(score) {
  if (score >= 65) return '市場壓力';
  if (score >= SCORE_THRESHOLD) return '提前檢視';
  if (score >= REARM_THRESHOLD) return '觀察';
  return '正常';
}

function displayEvent(event) {
  return {
    date: event.date,
    score: event.score,
    tier: event.tier,
    pillars: event.pillars,
    result: event.hit ? '提前捕捉' : event.late ? '太晚／未計入命中' : '未見目標事件',
    hit: event.hit,
    leadDays: event.leadDays,
    twiiDrawdown: Number((event.twiiDrawdown * 100).toFixed(1)),
    soxDrawdown: Number((event.soxDrawdown * 100).toFixed(1))
  };
}

async function main() {
  const names = [...Object.keys(yahooSeries), ...Object.keys(riksbankSeries)];
  const fetched = await Promise.all([
    ...Object.entries(yahooSeries).map(async ([name, ticker]) => [name, await getYahoo(ticker)]),
    ...Object.entries(riksbankSeries).map(async ([name, seriesId]) => [name, await getRiksbank(seriesId)])
  ]);
  const sourceMaps = Object.fromEntries(fetched);
  const lookups = Object.fromEntries(Object.entries(sourceMaps).map(([name, map]) => [name, makeLookup(map)]));
  const twiiDates = [...sourceMaps.twii.keys()].sort();
  const rows = [];

  // Taiwan's close is the decision clock. U.S./European data is deliberately
  // delayed to the last observation strictly before that Taiwan session, so
  // a backtest cannot use a later U.S. or European close as if it were known.
  twiiDates.forEach((date) => {
    const taiwan = lookups.twii.atOrBefore(date);
    const prior = (name) => lookups[name].atOrBefore(date, true);
    const us10 = prior('us10');
    const vix = prior('vix');
    const usdjpy = prior('usdjpy');
    const brent = prior('brent');
    const tsm = prior('tsm');
    const sox = prior('sox');
    const france10 = prior('france10');
    const germany10 = prior('germany10');
    if (![taiwan, us10, vix, usdjpy, brent, tsm, sox, france10, germany10].every(Boolean)) return;
    rows.push({
      date,
      twii: taiwan.value,
      us10: us10.value,
      vix: vix.value,
      usdjpy: usdjpy.value,
      brent: brent.value,
      tsm: tsm.value,
      sox: sox.value,
      france10: france10.value,
      germany10: germany10.value,
      euroSpread: france10.value - germany10.value,
      sourceDates: { us10: us10.date, europe: france10.date, tsm: tsm.date }
    });
  });

  rows.forEach((row, index) => {
    row.state = buildState(rows, index);
  });
  const usableStart = rows.findIndex((row) => row.state);
  if (usableStart < 0) throw new Error('Not enough overlapping daily history to evaluate the model.');

  const marketEvents = drawdownEvents(rows);
  const signals = [];
  let armed = true;
  for (let index = usableStart; index < rows.length - TARGET_LEAD_MAX; index += 1) {
    const state = rows[index].state;
    if (state.score < REARM_THRESHOLD) armed = true;
    if (armed && state.score >= SCORE_THRESHOLD) {
      const subsequentEvents = marketEvents.filter((event) => event.index > index && event.index <= index + TARGET_LEAD_MAX);
      const timelyEvent = subsequentEvents.find((event) => event.index >= index + TARGET_LEAD_MIN);
      const lateEvent = subsequentEvents.find((event) => event.index < index + TARGET_LEAD_MIN);
      const future = rows.slice(index + 1, index + TARGET_LEAD_MAX + 1);
      const twiiDrawdown = Math.min(...future.map((row) => row.twii / rows[index].twii - 1));
      const soxDrawdown = Math.min(...future.map((row) => row.sox / rows[index].sox - 1));
      signals.push({
        index,
        date: rows[index].date,
        score: state.score,
        tier: tierFor(state.score),
        pillars: state.pillars.filter((pillar) => pillar.state !== 'clear').map((pillar) => pillar.label),
        hit: Boolean(timelyEvent),
        late: !timelyEvent && Boolean(lateEvent),
        leadDays: timelyEvent ? timelyEvent.index - index : null,
        twiiDrawdown,
        soxDrawdown
      });
      armed = false;
    }
  }

  const targetEvents = marketEvents.filter((event) => event.index >= usableStart + TARGET_LEAD_MIN && event.index <= rows.length - 1);
  const captured = targetEvents.filter((event) => signals.some((signal) => signal.index >= event.index - TARGET_LEAD_MAX && signal.index <= event.index - TARGET_LEAD_MIN));
  const hits = signals.filter((signal) => signal.hit);
  const years = Math.max(1, (Date.parse(rows.at(-1).date) - Date.parse(rows[usableStart].date)) / (365.25 * DAY_SECONDS * 1000));
  const currentRow = rows.at(-1);
  const currentState = currentRow.state;
  const output = {
    version: 'Early Risk v1.0',
    generatedAt: new Date().toISOString(),
    asOf: currentRow.date,
    sourceCoverage: {
      modelStart: rows[usableStart].date,
      rowCount: rows.length,
      currentSourceDates: currentRow.sourceDates
    },
    thresholds: {
      score: SCORE_THRESHOLD,
      rearm: REARM_THRESHOLD,
      target: `5–20 個台灣交易日後，台灣加權回撤 ≥7% 或 SOX 回撤 ≥10%`
    },
    current: {
      date: currentRow.date,
      score: currentState.score,
      tier: tierFor(currentState.score),
      activeCount: currentState.activeCount,
      pillars: currentState.pillars.map((pillar) => ({ ...pillar, points: pillar.state === 'red' ? pillar.weight : pillar.state === 'amber' ? Math.round(pillar.weight * 0.6) : 0 })),
      note: currentState.activeCount >= 2 && currentState.score >= SCORE_THRESHOLD
        ? '至少兩個獨立支柱同時觸發，應依既定配置檢視曝險與再平衡，而不是把它當成自動賣出指令。'
        : currentState.activeCount >= 2
          ? '已有兩個獨立支柱亮燈，但合計仍低於「提前檢視」門檻；列為觀察，不把它當成自動減碼指令。'
          : '目前未滿足兩個獨立支柱的提前檢視門檻；仍要分開看既有的利率、能源與地緣風險。'
    },
    metrics: {
      signals: signals.length,
      timelyHits: hits.length,
      precision: signals.length ? hits.length / signals.length : null,
      targetEvents: targetEvents.length,
      capturedEvents: captured.length,
      captureRate: targetEvents.length ? captured.length / targetEvents.length : null,
      medianLeadDays: hits.length ? hits.map((signal) => signal.leadDays).sort((a, b) => a - b)[Math.floor(hits.length / 2)] : null,
      falseAlertsPerYear: (signals.length - hits.length) / years,
      lateSignals: signals.filter((signal) => signal.late).length
    },
    events: signals.slice(-14).reverse().map(displayEvent),
    sources: [
      { label: 'Yahoo Finance 日資料（^TNX、^VIX、JPY=X、BZ=F、TSM、^SOX、^TWII）', url: 'https://finance.yahoo.com/' },
      { label: 'Sveriges Riksbank / Refinitiv 日資料（FRGVB10Y、DEGVB10Y）', url: 'https://api.riksbank.se/swea/v1/Series/FRGVB10Y' }
    ]
  };
  const destination = new URL('../early-risk-data.js', import.meta.url);
  await writeFile(destination, `/* Generated by scripts/generate-early-risk-data.mjs. Do not hand-edit. */\nwindow.earlyRiskBacktest = ${JSON.stringify(output, null, 2)};\n`);
  console.log(`Early Risk data generated through ${output.asOf}: ${output.metrics.signals} warning episodes, ${output.metrics.timelyHits} timely hits.`);
}

main().catch((error) => {
  console.error(`Early Risk generation failed: ${error.message}`);
  process.exitCode = 1;
});
