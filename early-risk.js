(function () {
  const byId = (id) => document.getElementById(id);
  const asPercent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : '—';
  const signedPercent = (value) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—';

  function tierTone(tier) {
    if (tier === '市場壓力') return 'red';
    if (tier === '提前檢視' || tier === '觀察') return 'amber';
    return 'green';
  }

  function makeMetric(label, value, note) {
    const item = document.createElement('article');
    item.className = 'backtest-metric';
    const number = document.createElement('strong');
    number.textContent = value;
    const heading = document.createElement('span');
    heading.textContent = label;
    const detail = document.createElement('small');
    detail.textContent = note;
    item.append(number, heading, detail);
    return item;
  }

  function renderCurrent(data) {
    const target = byId('live-risk');
    if (!target) return;
    const current = data.current;
    const tone = tierTone(current.tier);
    const header = document.createElement('div');
    header.className = 'risk-score-head';
    const score = document.createElement('strong');
    score.className = `risk-score-number tone-${tone}`;
    score.textContent = `${current.score} / 100`;
    const label = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'kicker';
    kicker.textContent = 'MODEL STATUS';
    const title = document.createElement('h3');
    title.textContent = current.tier;
    label.append(kicker, title);
    header.append(score, label);
    const date = document.createElement('p');
    date.className = 'risk-date';
    date.textContent = `模型資料截點：${current.date}（以台股下一個交易日可得資料計算）`;
    const note = document.createElement('p');
    note.className = 'risk-note';
    note.textContent = current.note;
    const list = document.createElement('div');
    list.className = 'risk-driver-list';
    current.pillars.forEach((pillar) => {
      const row = document.createElement('div');
      row.className = `risk-driver tone-${pillar.state}`;
      const name = document.createElement('strong');
      name.textContent = pillar.label;
      const state = document.createElement('span');
      state.textContent = pillar.state === 'red' ? `紅線 +${pillar.points}` : pillar.state === 'amber' ? `警戒 +${pillar.points}` : '未觸發';
      const detail = document.createElement('small');
      detail.textContent = pillar.detail;
      row.append(name, state, detail);
      list.append(row);
    });
    target.replaceChildren(header, date, note, list);
  }

  function renderMetrics(data) {
    const target = byId('backtest-metrics');
    if (!target) return;
    const { metrics, sourceCoverage } = data;
    target.replaceChildren(
      makeMetric('提前命中', `${metrics.timelyHits} / ${metrics.signals}`, `在警示後第 5–20 個台灣交易日出現目標回撤：${asPercent(metrics.precision)}`),
      makeMetric('事件捕捉', `${metrics.capturedEvents} / ${metrics.targetEvents}`, `所有目標事件中，提前 5–20 日收到警示：${asPercent(metrics.captureRate)}`),
      makeMetric('中位提前天數', metrics.medianLeadDays ? `${metrics.medianLeadDays} 天` : '—', '只計入符合「提前」定義的命中'),
      makeMetric('假警報／年', metrics.falseAlertsPerYear.toFixed(1), `另有 ${metrics.lateSignals} 次太晚才出現的訊號，不列為命中`),
      makeMetric('樣本覆蓋', `${sourceCoverage.rowCount.toLocaleString()} 日`, `${sourceCoverage.modelStart} 至 ${data.asOf}`)
    );
  }

  function renderEvents(data) {
    const target = byId('backtest-events');
    if (!target) return;
    const description = document.createElement('p');
    description.className = 'backtest-description';
    description.textContent = '下表列出最近的預警 episode（不只呈現成功案例）。「提前捕捉」代表目標下跌事件在警示後第 5–20 個台灣交易日出現。';
    const tableWrap = document.createElement('div');
    tableWrap.className = 'backtest-table-wrap';
    const table = document.createElement('table');
    table.className = 'backtest-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['警示日', '分數／支柱', '結果', '提前', '後續 20 日最大回撤'].forEach((text) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = text;
      headRow.append(cell);
    });
    head.append(headRow);
    const body = document.createElement('tbody');
    data.events.forEach((event) => {
      const row = document.createElement('tr');
      const date = document.createElement('td');
      date.textContent = event.date;
      const score = document.createElement('td');
      score.textContent = `${event.score} · ${event.pillars.join('、') || '—'}`;
      const result = document.createElement('td');
      result.className = event.hit ? 'result-hit' : 'result-miss';
      result.textContent = event.result;
      const lead = document.createElement('td');
      lead.textContent = event.leadDays ? `${event.leadDays} 天` : '—';
      const drawdown = document.createElement('td');
      drawdown.textContent = `TWII ${signedPercent(event.twiiDrawdown)} · SOX ${signedPercent(event.soxDrawdown)}`;
      row.append(date, score, result, lead, drawdown);
      body.append(row);
    });
    table.append(head, body);
    tableWrap.append(table);

    const source = document.createElement('p');
    source.className = 'backtest-source';
    source.append('資料來源：');
    data.sources.forEach((item, index) => {
      if (index) source.append(' · ');
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.label;
      source.append(link);
    });
    source.append('。歐債序列標註為 Source: Sveriges Riksbank（underlying series source: Refinitiv）。');
    target.replaceChildren(description, tableWrap, source);
  }

  function renderBacktest(data) {
    const status = byId('backtest-status');
    if (status) {
      const preliminary = data.metrics.precision < 0.3 || data.metrics.captureRate < 0.15;
      status.className = `backtest-status ${preliminary ? 'is-caution' : 'is-ready'}`;
      status.textContent = preliminary
        ? `固定規則日頻回測已完成，但初版結果不足以當成自動賣出依據；命中、漏掉與假警報全部保留。最後共同資料日 ${data.asOf}。`
        : `已完成固定規則的日頻回測 · 最後共同資料日 ${data.asOf} · 本次產生於 ${new Date(data.generatedAt).toLocaleString('zh-TW', { hour12: false })}`;
    }
    renderCurrent(data);
    renderMetrics(data);
    renderEvents(data);
  }

  function showBacktestFailure() {
    const status = byId('backtest-status');
    if (status) {
      status.className = 'backtest-status is-failed';
      status.textContent = '回測資料無法載入；本頁不會顯示任何準確率或預測結論。';
    }
    const target = byId('live-risk');
    if (target) target.textContent = '模型資料暫時無法驗證。請稍後重新整理。';
  }

  const dataScript = document.createElement('script');
  dataScript.src = `early-risk-data.js?v=${Date.now()}`;
  dataScript.addEventListener('load', () => {
    if (window.earlyRiskBacktest) renderBacktest(window.earlyRiskBacktest);
    else showBacktestFailure();
  }, { once: true });
  dataScript.addEventListener('error', showBacktestFailure, { once: true });
  document.head.append(dataScript);
})();
