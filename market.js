(function () {
  const byId = (id) => document.getElementById(id);

  function showDataFailure() {
    const status = byId('verification-status');
    const detail = byId('verification-detail');
    const card = document.querySelector('.verification-card');
    const icon = document.querySelector('.verification-icon');
    if (card) card.classList.add('is-failed');
    if (icon) icon.textContent = '!';
    if (status) status.textContent = '市場資料無法載入；請勿將本頁視為最新行情。';
    if (detail) detail.textContent = '請稍後重新整理，或直接從 Investing.com 的來源連結核對報價。';
    document.dispatchEvent(new CustomEvent('market:data-failed'));
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function quoteCard(quote) {
    const card = document.createElement('article');
    card.className = `quote-card tone-${quote.tone || 'amber'}`;
    const top = document.createElement('div');
    top.className = 'quote-top';
    const label = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = quote.name;
    const ticker = document.createElement('span');
    ticker.textContent = quote.ticker;
    label.append(name, ticker);
    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.setAttribute('aria-label', quote.tone === 'red' ? '高風險' : quote.tone === 'amber' ? '注意' : '穩定');
    top.append(label, dot);

    const value = document.createElement('p');
    value.className = 'quote-value';
    value.textContent = quote.value;
    const change = document.createElement('p');
    change.className = 'quote-change';
    change.textContent = quote.change;
    const note = document.createElement('p');
    note.className = 'quote-note';
    note.textContent = quote.note;
    const footer = document.createElement('div');
    footer.className = 'quote-footer';
    const date = document.createElement('span');
    date.textContent = quote.quoteDate;
    const source = document.createElement('a');
    source.href = quote.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = '來源';
    footer.append(date, source);
    card.append(top, value, change, note, footer);
    return card;
  }

  function renderQuotes(targetId, quotes = []) {
    const target = byId(targetId);
    if (!target) return;
    target.replaceChildren(...quotes.map(quoteCard));
  }

  function signalItem(signal) {
    const item = document.createElement('article');
    item.className = `signal-item tone-${signal.level}`;
    const level = document.createElement('span');
    level.className = 'signal-level';
    level.textContent = signal.level === 'red' ? '紅線' : '警戒';
    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = signal.title;
    const rule = document.createElement('p');
    rule.className = 'signal-rule';
    rule.textContent = signal.rule;
    const description = document.createElement('p');
    description.textContent = signal.description;
    body.append(title, rule, description);
    const current = document.createElement('p');
    current.className = 'signal-current';
    current.textContent = signal.current;
    item.append(level, body, current);
    return item;
  }

  function newsItem(news) {
    const item = document.createElement('article');
    item.className = 'news-item';
    const meta = document.createElement('div');
    meta.className = 'news-meta';
    const tag = document.createElement('span');
    tag.textContent = news.tag;
    const date = document.createElement('time');
    date.dateTime = news.date;
    date.textContent = news.date;
    meta.append(tag, date);
    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = news.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = news.title;
    title.append(link);
    const description = document.createElement('p');
    description.textContent = news.description;
    const source = document.createElement('p');
    source.className = 'news-source';
    source.textContent = news.sourceName;
    item.append(meta, title, description, source);
    return item;
  }

  function renderMarket() {
    const snapshot = window.marketSnapshot;
    if (!snapshot) {
      showDataFailure();
      return;
    }

    const verificationCard = document.querySelector('.verification-card');
    const verificationIcon = document.querySelector('.verification-icon');
    const verifiedAt = new Date(`${snapshot.lastVerified}T00:00:00+08:00`);
    const verificationTooOld = Number.isFinite(verifiedAt.getTime()) && Date.now() - verifiedAt.getTime() > 36 * 60 * 60 * 1000;
    setText('market-score', snapshot.score.value);
    setText('market-score-label', snapshot.score.label);
    if (snapshot.verification.state !== 'verified' || verificationTooOld) {
      verificationCard?.classList.add('is-failed');
      if (verificationIcon) verificationIcon.textContent = '!';
      setText('verification-status', verificationTooOld ? '資料核對時間超過 36 小時，請勿當作最新行情。' : snapshot.verification.headline);
      setText('verification-detail', verificationTooOld ? `最近成功核對：${snapshot.lastVerified}。更新程序必須重新讀取來源後才可恢復「已核對」。` : snapshot.verification.detail);
    } else {
      setText('verification-status', snapshot.verification.headline);
      setText('verification-detail', snapshot.verification.detail);
    }
    setText('footer-date', `資料核對：${snapshot.lastVerified}`);
    byId('market-score')?.parentElement.classList.add(`tone-${snapshot.score.tone}`);
    renderQuotes('equity-cards', snapshot.groups?.equity);
    renderQuotes('rates-cards', snapshot.groups?.rates);
    renderQuotes('euro-cards', snapshot.groups?.europe);
    renderQuotes('tsmc-cards', snapshot.groups?.tsmc);
    renderQuotes('energy-cards', snapshot.groups?.energy);
    const signals = byId('signals');
    if (signals) signals.replaceChildren(...(snapshot.signals || []).map(signalItem));
    const news = byId('tsmc-news');
    if (news) news.replaceChildren(...(snapshot.tsmcNews || []).map(newsItem));

    window.marketSnapshotRendered = true;
    document.dispatchEvent(new CustomEvent('market:ready', { detail: snapshot }));
  }

  const dataScript = document.createElement('script');
  dataScript.src = `market-data.js?v=${Date.now()}`;
  dataScript.addEventListener('load', renderMarket, { once: true });
  dataScript.addEventListener('error', showDataFailure, { once: true });
  document.head.appendChild(dataScript);
})();
