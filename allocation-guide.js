(function () {
  const byId = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0
  });

  const number = (id) => Number(byId(id)?.value);
  const percent = (value) => `${value.toFixed(value % 1 ? 1 : 0)}%`;
  const moneyText = (value) => `NT$${money.format(Math.max(0, Math.round(value)))}`;
  const clear = (node) => node?.replaceChildren();

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function metric(label, value, note) {
    const item = make('article', 'allocation-metric');
    item.append(make('span', 'allocation-metric-label', label));
    item.append(make('strong', 'allocation-metric-value', value));
    item.append(make('small', 'allocation-metric-note', note));
    return item;
  }

  function renderContext(data) {
    const target = byId('allocation-risk-context');
    if (!target) return;
    clear(target);

    if (!data?.current) {
      target.className = 'allocation-risk-context is-unavailable';
      target.append(make('p', 'kicker', 'MARKET CONTEXT'));
      target.append(make('strong', '', '市場背景暫時無法驗證。'));
      target.append(make('span', '', '配置試算仍可用，但只依你填寫的目標比例計算，不會提供市場判斷。'));
      return;
    }

    const { current, metrics = {} } = data;
    const needsReview = current.score >= 40 && current.activeCount >= 2;
    const weakBacktest = metrics.precision < 0.3 || metrics.captureRate < 0.15;
    target.className = `allocation-risk-context ${needsReview ? 'is-review' : 'is-neutral'}`;
    target.append(make('p', 'kicker', 'MARKET CONTEXT · REVIEW ONLY'));
    target.append(make('strong', '', `Early Risk ${current.score} / 100 · ${current.tier}`));
    const copy = needsReview
      ? `目前有 ${current.activeCount} 個支柱在作用，應重新檢視你的風險曝險；它不會自動改寫下方目標比例。`
      : `目前有 ${current.activeCount} 個支柱在作用，尚未跨越模型的提前檢視門檻；它不會自動改寫下方目標比例。`;
    target.append(make('span', '', copy));
    if (weakBacktest) target.append(make('small', '', '目前回測結果不足以支持自動買賣；下方僅是你自訂規則的數學試算。'));
  }

  function renderMessage(title, body, tone = 'neutral') {
    const target = byId('allocation-results');
    if (!target) return;
    clear(target);
    target.className = `allocation-results is-${tone}`;
    target.append(make('p', 'kicker', 'ALLOCATION RESULT'));
    target.append(make('h3', '', title));
    target.append(make('p', 'allocation-result-copy', body));
    target.append(make('p', 'allocation-disclaimer', '本頁不會選擇個股、基金或下單時點；請把結果當成配置檢查，而不是交易指令。'));
  }

  function validInputs(values) {
    return Number.isFinite(values.total) && values.total > 0
      && Number.isFinite(values.current) && values.current >= 0 && values.current <= 100
      && Number.isFinite(values.target) && values.target >= 0 && values.target <= 100
      && Number.isFinite(values.band) && values.band >= 0 && values.band <= 25
      && Number.isFinite(values.newMoney) && values.newMoney >= 0;
  }

  function renderCalculation() {
    const form = byId('allocation-form');
    if (!form) return;
    const values = {
      total: number('allocation-total'),
      current: number('allocation-current'),
      target: number('allocation-target'),
      band: number('allocation-band'),
      newMoney: number('allocation-new-money'),
      horizon: byId('allocation-horizon')?.value,
      hasReserve: Boolean(byId('allocation-reserve')?.checked)
    };

    if (!validInputs(values)) {
      renderMessage('請先完成有效數字。', '總額需大於 0；比例需介於 0–100；容許偏離最多 25 個百分點。', 'error');
      return;
    }

    if (!values.hasReserve) {
      renderMessage('先把短期生活資金排除。', '勾選「緊急預備金已另留」後，才會顯示你的配置差額。這能避免把短期要用的錢當成可承擔波動的投資資產。', 'neutral');
      return;
    }

    if (values.horizon === 'short') {
      renderMessage('3 年內會用到的資金，不做這個試算。', '短期資金可能沒有足夠時間承受市場回撤。請把它從可投資資產中排除，或先和專業人士確認資金安排。', 'caution');
      return;
    }

    const lower = Math.max(0, values.target - values.band);
    const upper = Math.min(100, values.target + values.band);
    const futureTotal = values.total + values.newMoney;
    const currentRiskAssets = values.total * values.current / 100;
    const futureTarget = futureTotal * values.target / 100;
    const futureLower = futureTotal * lower / 100;
    const futureUpper = futureTotal * upper / 100;
    const gapToTarget = futureTarget - currentRiskAssets;
    const amountWithinUpper = Math.min(values.newMoney, Math.max(0, futureUpper - currentRiskAssets));
    const amountToTarget = Math.min(amountWithinUpper, Math.max(0, gapToTarget));
    const excessAboveUpper = Math.max(0, currentRiskAssets - futureUpper);
    const remainder = values.newMoney - amountWithinUpper;
    const currentAllocationAfterCash = currentRiskAssets / futureTotal * 100;
    const allocationAfterProposedBuy = (currentRiskAssets + amountToTarget) / futureTotal * 100;
    const targetBand = `${percent(lower)}–${percent(upper)}`;

    const result = byId('allocation-results');
    if (!result) return;
    clear(result);

    const heading = make('div', 'allocation-result-head');
    heading.append(make('p', 'kicker', 'YOUR CONFIGURATION GAP'));

    let title;
    let narrative;
    let tone;
    if (excessAboveUpper > 0) {
      title = '加入新資金後，仍高於你的上限。';
      narrative = '這是你自訂規則下的「再平衡差額」，不是本頁要求你賣出的指令。先確認持有目的、成本與稅務，再決定是否分期處理。';
      tone = 'caution';
    } else if (currentRiskAssets < futureLower) {
      title = '低於你設定的下限。';
      narrative = '若你的目標比例與期限仍然適合，新增資金可以先用來填補這個差額；本頁不決定要買哪一項資產或哪一天買。';
      tone = 'ready';
    } else {
      title = '仍在你設定的容許範圍內。';
      narrative = '沒有因市場訊號必須交易的理由。若你本來就有定期投入計畫，下方只顯示加入新資金後仍不會超過上限的額度。';
      tone = 'neutral';
    }

    result.className = `allocation-results is-${tone}`;
    heading.append(make('h3', '', title));
    result.append(heading);

    const metrics = make('div', 'allocation-metrics');
    metrics.append(
      metric('你設定的目標區間', targetBand, `目標 ${percent(values.target)}，容許偏離 ±${percent(values.band)}`),
      metric('加入新資金後的目標額', moneyText(futureTarget), `總可投資資產 ${moneyText(futureTotal)}`),
      metric('本次可放入高波動資產的上限', moneyText(amountWithinUpper), `若投入超過這個額度，將高於 ${percent(upper)} 上限`)
    );
    result.append(metrics);

    const action = make('div', 'allocation-action');
    if (excessAboveUpper > 0) {
      action.append(make('strong', '', `超出上限的配置差額：${moneyText(excessAboveUpper)}`));
      action.append(make('p', '', `即使把 ${moneyText(values.newMoney)} 全部列入資產，股票／高波動資產仍約為 ${percent(currentAllocationAfterCash)}。試算不會指定賣出標的，也不建議一次清倉。`));
    } else if (currentRiskAssets < futureLower) {
      action.append(make('strong', '', `若想朝目標靠近，新增資金最多可先放入：${moneyText(amountToTarget)}`));
      action.append(make('p', '', `若先放入這筆額度，股票／高波動資產約為 ${percent(allocationAfterProposedBuy)}；其餘 ${moneyText(remainder)} 不因這個試算自動指定用途。`));
    } else {
      action.append(make('strong', '', `新增資金中，最多 ${moneyText(amountWithinUpper)} 仍在你的上限內`));
      action.append(make('p', '', `加入新資金後，若完全不買高波動資產，比例約為 ${percent(currentAllocationAfterCash)}。是否投入與投入標的，仍取決於你原本的計畫。`));
    }
    result.append(action);
    result.append(make('p', 'allocation-disclaimer', '這是依你輸入之目標比例的教育試算，不預測價格或報酬；未計入手續費、稅務、流動性、最小交易單位與完整財務狀況。'));
  }

  function init() {
    const form = byId('allocation-form');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      renderCalculation();
    });
    form.addEventListener('input', () => {
      if (byId('allocation-reserve')?.checked) renderCalculation();
    });
    form.addEventListener('change', () => {
      if (byId('allocation-reserve')?.checked) renderCalculation();
    });
    renderMessage('先輸入自己的規則。', '請填入你自己設定的目標比例與容許偏離，並確認短期生活資金已排除後，再看配置差額。', 'neutral');
    if (window.earlyRiskBacktest) renderContext(window.earlyRiskBacktest);
    else renderContext(null);
  }

  document.addEventListener('early-risk:ready', (event) => renderContext(event.detail));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
