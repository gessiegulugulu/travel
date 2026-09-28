const DRAFT_KEY = 'winter-route-2026-online-draft-v3';
const OLD_DRAFT_KEY = 'winter-route-2026-online-draft-v2';
const STORAGE = window.TRAVEL_STORAGE || {};
const STORAGE_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(STORAGE.url || '')
  ? STORAGE.url.replace(/\/$/, '') + '/rest/v1/travel_plan' : '';
const STORAGE_READY = !!(STORAGE_URL && /^sb_publishable_[A-Za-z0-9_-]+$/.test(STORAGE.publishableKey || ''));
const euro = (value) => '€' + Math.round(value).toLocaleString('en-US');
const el = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
};

let published;
let trip;
let activeFilter = 'all';
let publishedRevision = null;
let draftBaseRevision = null;

function setStatus(message, error = false) {
  const node = document.querySelector('#save-status');
  node.textContent = message;
  node.classList.toggle('error', error);
}

function validPlan(data) {
  return data && data.version === 1 && Array.isArray(data.route) && Array.isArray(data.days)
    && Array.isArray(data.attractions) && Array.isArray(data.flights) && data.budget
    && Array.isArray(data.tasks) && Array.isArray(data.sources);
}

async function fetchPublished() {
  if (!STORAGE_READY) throw new Error('共享数据表尚未配置');
  const response = await fetch(`${STORAGE_URL}?id=eq.main&select=revision,data`, {
    headers: {apikey: STORAGE.publishableKey, Accept: 'application/json'}, cache: 'no-store'
  });
  if (!response.ok) throw new Error(`共享服务 HTTP ${response.status}`);
  const rows = await response.json();
  if (rows.length !== 1 || !validPlan(rows[0].data) || !Number.isSafeInteger(rows[0].revision)) {
    throw new Error('共享数据缺失或格式不正确');
  }
  return rows[0];
}

async function fetchBundled() {
  const response = await fetch('./trip.json', {cache:'no-store'});
  if (!response.ok) throw new Error(`内置行程 HTTP ${response.status}`);
  const data = await response.json();
  if (!validPlan(data)) throw new Error('内置行程格式不正确');
  return data;
}

function storeDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({baseRevision:draftBaseRevision, data:trip})); }
  catch { /* Browsers with storage disabled still allow downloads. */ }
  setStatus(STORAGE_READY && publishedRevision !== null
    ? '本机有未共享修改 · 点击“保存到共享计划”'
    : '本机草稿已保留；共享保存尚未启用。');
}

function getDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || localStorage.getItem(OLD_DRAFT_KEY));
    if (saved && saved.data?.version === published.version && Array.isArray(saved.data.days)) {
      draftBaseRevision = Number.isSafeInteger(saved.baseRevision) ? saved.baseRevision : null;
      return saved.data;
    }
    return null;
  } catch { return null; }
}

function renderRoute() {
  const host = document.querySelector('#route-cards');
  host.replaceChildren();
  trip.route.forEach((stop, index) => {
    const card = el('article', 'route-card');
    card.append(el('span', 'ordinal', `0${index + 1} / ${stop.country}`));
    card.append(el('h3', '', stop.city));
    card.append(el('div', 'english', `${stop.en.toUpperCase()} · ${stop.code}`));
    const meta = el('div', 'route-meta');
    meta.append(el('strong', '', `${stop.nights} 晚`), el('small', '', ['12.26 — 12.28', '12.28 — 01.01', '01.01 — 01.03'][index]));
    card.append(meta);
    host.append(card);
  });
}

function renderDays() {
  const host = document.querySelector('#day-grid');
  host.replaceChildren();
  trip.days.forEach((day, index) => {
    if (activeFilter !== 'all' && day.city !== activeFilter) return;
    const card = el('article', `day-card ${day.kind || ''}`);
    const date = el('div', 'day-date');
    const match = day.date.match(/^(12月|1月)(\d+)日$/);
    date.append(el('strong', '', match ? match[2] : day.date), el('span', '', `${match ? match[1] : ''} · ${day.week}`), el('i'));
    const body = el('div', 'day-body');
    const top = el('div', 'day-top');
    top.append(el('span', 'city-chip', day.city), el('small', '', day.stay));
    body.append(top, el('h3', '', day.title));
    [['早', day.morning], ['午', day.afternoon], ['晚', day.evening]].forEach(([label, value]) => {
      const line = el('div', 'day-line');
      line.append(el('b', '', label), el('span', '', value));
      body.append(line);
    });
    if (day.logistics || day.booking || day.backup) {
      const details = el('div', 'day-details');
      [['动线', day.logistics], ['预订', day.booking], ['备选', day.backup]].forEach(([label, value]) => {
        if (!value) return;
        const line = el('div', 'detail-line');
        line.append(el('b', '', label), el('span', '', value));
        details.append(line);
      });
      body.append(details);
    }
    if (Array.isArray(day.links) && day.links.length) {
      const links = el('div', 'day-links');
      day.links.forEach(({name, url}) => {
        if (!/^https:\/\//.test(url)) return;
        const link = el('a', '', `${name} ↗`);
        link.href = url; link.target = '_blank'; link.rel = 'noopener';
        links.append(link);
      });
      body.append(links);
    }
    const foot = el('div', 'day-foot');
    foot.append(el('span', '', day.note));
    const edit = el('button', '', '修改 ↗');
    edit.type = 'button';
    edit.addEventListener('click', () => openDayEditor(index));
    foot.append(edit);
    body.append(foot);
    card.append(date, body);
    host.append(card);
  });
}

function renderSights() {
  const host = document.querySelector('#sight-grid');
  host.replaceChildren();
  (trip.attractions || published.attractions || []).forEach((sight, index) => {
    const card = el('article', 'sight-card');
    const top = el('div', 'sight-top');
    top.append(el('span', '', `${sight.city} · ${sight.day}`), el('span', '', `0${index + 1}`));
    card.append(top, el('h3', '', sight.title), el('p', 'sight-time', sight.time));
    [['预约／开放', sight.booking], ['怎样去', sight.arrival], ['随身准备', sight.bring], ['备选', sight.fallback]].forEach(([label, value]) => {
      const line = el('div', 'sight-line');
      line.append(el('strong', '', label), el('span', '', value));
      card.append(line);
    });
    const foot = el('div', 'sight-foot');
    if (/^https:\/\//.test(sight.url || '')) {
      const source = el('a', '', `${sight.sourceName || '查看官网'} ↗`);
      source.href = sight.url; source.target = '_blank'; source.rel = 'noopener';
      foot.append(source);
    }
    const edit = el('button', '', '修改 ↗');
    edit.type = 'button'; edit.addEventListener('click', () => openSightEditor(index));
    foot.append(edit); card.append(foot); host.append(card);
  });
}

function renderFlights() {
  const host = document.querySelector('#flight-grid');
  host.replaceChildren();
  trip.flights.forEach((flight, index) => {
    const card = el('article', 'flight-card');
    const symbol = el('div', 'flight-symbol');
    symbol.append(el('span', '', '↗'), el('small', '', `TRAVELER 0${index + 1}`));
    card.append(symbol, el('h3', '', flight.person), el('div', 'codes', `${flight.origin}  →  PRG  /  BUD  →  ${flight.origin}`), el('p', '', flight.via));
    const fields = el('div', 'quote-fields');
    [['a', 'A 三城路线 / €'], ['b', 'B 维也纳往返 / €']].forEach(([key, labelText]) => {
      const label = el('label', '', labelText);
      const input = el('input');
      input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'decimal';
      input.placeholder = '待报价';
      input.value = flight[key] === null || flight[key] === undefined ? '' : flight[key];
      input.addEventListener('input', () => {
        flight[key] = input.value === '' ? null : Math.max(0, Number(input.value));
        storeDraft(); updateFlightResult();
      });
      label.append(input); fields.append(label);
    });
    card.append(fields); host.append(card);
  });
  updateFlightResult();
}

function updateFlightResult() {
  const result = document.querySelector('#flight-result');
  const complete = trip.flights.every(({a, b}) => Number.isFinite(a) && Number.isFinite(b));
  if (!complete) {
    const count = trip.flights.reduce((sum, {a, b}) => sum + Number(Number.isFinite(a) && Number.isFinite(b)), 0);
    result.textContent = `${count}/3 人完成两种机票报价 · 填齐后比较`;
    return;
  }
  const a = trip.flights.reduce((sum, person) => sum + person.a, 0);
  const b = trip.flights.reduce((sum, person) => sum + person.b, 0);
  result.textContent = `三城机票 ${euro(a)} · 维也纳往返 ${euro(b)}。${a === b ? '机票总价相同' : `${a < b ? '三城路线' : '维也纳往返'}机票少 ${euro(Math.abs(a - b))}`}；交通与住宿还需另比。`;
}

const budgetFields = [
  ['pragueNight', '布拉格整套住宿', '每晚 · 2 晚'],
  ['viennaNight', '维也纳整套住宿', '每晚 · 4 晚'],
  ['budapestNight', '布达佩斯整套住宿', '每晚 · 2 晚'],
  ['railPerPerson', '城际火车', '每人 · 两段合计'],
  ['foodPerPersonDay', '每日餐饮', '每人 · 8 天'],
  ['localPerPerson', '市内交通', '每人 · 全程'],
  ['activitiesPerPerson', '活动门票', '每人 · 自选'],
  ['bufferPerPerson', '机动费用', '每人 · 全程']
];

function renderBudget() {
  const host = document.querySelector('#budget-inputs'); host.replaceChildren();
  budgetFields.forEach(([key, title, hint]) => {
    const row = el('div', 'budget-row');
    const label = el('label');
    label.append(el('span', '', title), el('small', '', hint));
    const wrapper = el('div', 'input-wrap');
    wrapper.append(el('span', '', '€'));
    const input = el('input');
    input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'decimal';
    input.value = trip.budget[key]; input.setAttribute('aria-label', `${title}，欧元`);
    input.addEventListener('input', () => {
      trip.budget[key] = input.value === '' ? 0 : Math.max(0, Number(input.value));
      storeDraft(); updateBudget();
    });
    wrapper.append(input); row.append(label, wrapper); host.append(row);
  });
  updateBudget();
}

function updateBudget() {
  const b = trip.budget;
  const lodging = b.pragueNight * 2 + b.viennaNight * 4 + b.budapestNight * 2;
  const each = lodging / 3 + b.railPerPerson + b.foodPerPersonDay * 8 + b.localPerPerson + b.activitiesPerPerson + b.bufferPerPerson;
  document.querySelector('#per-person').textContent = Math.round(each).toLocaleString('en-US');
  document.querySelector('#group-total').textContent = euro(each * 3);
  document.querySelector('#lodging-share').textContent = euro(lodging / 3);
}

function renderTasks() {
  const host = document.querySelector('#tasks'); host.replaceChildren();
  trip.tasks.forEach((task, index) => {
    const row = el('label', `task${task.done ? ' done' : ''}`);
    const box = el('input'); box.type = 'checkbox'; box.checked = !!task.done;
    box.setAttribute('aria-label', task.text);
    box.addEventListener('change', () => { trip.tasks[index].done = box.checked; row.classList.toggle('done', box.checked); storeDraft(); });
    const body = el('div'); body.append(el('strong', '', task.text), el('small', '', `负责：${task.owner}`));
    row.append(box, body, el('mark', '', task.priority)); host.append(row);
  });
}

function renderSources() {
  const host = document.querySelector('#source-grid'); host.replaceChildren();
  trip.sources.forEach(({name, url}) => {
    if (!/^https:\/\//.test(url)) return;
    const link = el('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener';
    link.append(el('span', '', name), el('span', '', '↗')); host.append(link);
  });
}

function openDayEditor(index) {
  const day = trip.days[index];
  document.querySelector('#day-index').value = index;
  document.querySelector('#dialog-title').textContent = `${day.date} · ${day.city}`;
  ['title', 'morning', 'afternoon', 'evening', 'logistics', 'booking', 'backup', 'note'].forEach((key) => {
    document.querySelector(`#day-${key}`).value = day[key] || '';
  });
  document.querySelector('#day-dialog').showModal();
}

function openSightEditor(index) {
  const sight = (trip.attractions || published.attractions)[index];
  document.querySelector('#sight-index').value = index;
  document.querySelector('#sight-dialog-title').textContent = sight.title;
  ['title', 'time', 'booking', 'arrival', 'bring', 'fallback', 'sourceName', 'url'].forEach((key) => {
    document.querySelector(`#sight-${key}`).value = sight[key] || '';
  });
  document.querySelector('#sight-dialog').showModal();
}

async function saveOnline() {
  const button = document.querySelector('#save-online');
  if (!STORAGE_READY || publishedRevision === null) {
    setStatus('共享保存尚未启用。可先下载本机备份，站点主人完成数据表配置后再试。', true);
    return;
  }
  button.disabled = true;
  setStatus('正在检查线上版本并保存…');
  try {
    if (draftBaseRevision !== publishedRevision) {
      setStatus('本机草稿基于旧版。请先下载备份，再刷新并合并修改；此处没有覆盖线上计划。', true);
      return;
    }
    const latest = await fetchPublished();
    if (latest.revision !== publishedRevision) {
      setStatus('另一位朋友已更新线上计划。请先下载本机备份，刷新后合并；此处没有覆盖对方。', true);
      return;
    }
    trip.updated = new Date().toISOString().slice(0, 10);
    const response = await fetch(`${STORAGE_URL}?id=eq.main&revision=eq.${publishedRevision}&select=revision`, {
      method: 'PATCH',
      headers: {
        apikey: STORAGE.publishableKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({data: trip, revision: publishedRevision + 1})
    });
    if (!response.ok) {
      throw new Error(`共享保存失败（HTTP ${response.status}）。`);
    }
    const rows = await response.json();
    if (rows.length !== 1 || rows[0].revision !== publishedRevision + 1) {
      setStatus('另一位朋友先保存了新版本。请下载备份，重新读取共享版后手动合并。', true);
      return;
    }
    publishedRevision = rows[0].revision;
    draftBaseRevision = publishedRevision;
    published = structuredClone(trip);
    try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(OLD_DRAFT_KEY); } catch { /* no storage */ }
    setStatus('已保存到共享计划。朋友刷新网页即可看到新版本。');
  } catch (error) {
    setStatus(error.message || '暂时无法连接共享服务，请稍后重试。', true);
  } finally {
    button.disabled = false;
  }
}

function wireEvents() {
  document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button));
    renderDays();
  }));
  const dialog = document.querySelector('#day-dialog');
  document.querySelector('#day-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const index = Number(document.querySelector('#day-index').value);
    ['title', 'morning', 'afternoon', 'evening', 'logistics', 'booking', 'backup', 'note'].forEach((key) => {
      trip.days[index][key] = document.querySelector(`#day-${key}`).value.trim();
    });
    storeDraft(); renderDays(); dialog.close();
  });
  ['#close-dialog', '#cancel-dialog'].forEach((id) => document.querySelector(id).addEventListener('click', () => dialog.close()));
  const sightDialog = document.querySelector('#sight-dialog');
  document.querySelector('#sight-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const index = Number(document.querySelector('#sight-index').value);
    if (!trip.attractions) trip.attractions = structuredClone(published.attractions);
    ['title', 'time', 'booking', 'arrival', 'bring', 'fallback', 'sourceName', 'url'].forEach((key) => {
      trip.attractions[index][key] = document.querySelector(`#sight-${key}`).value.trim();
    });
    storeDraft(); renderSights(); sightDialog.close();
  });
  ['#close-sight', '#cancel-sight'].forEach((id) => document.querySelector(id).addEventListener('click', () => sightDialog.close()));
  const guide = document.querySelector('#guide-dialog');
  document.querySelector('#edit-guide').addEventListener('click', () => guide.showModal());
  document.querySelector('#close-guide').addEventListener('click', () => guide.close());
  document.querySelector('#group-note').addEventListener('input', (event) => { trip.groupNote = event.target.value; storeDraft(); });
  document.querySelector('#save-online').addEventListener('click', saveOnline);
  document.querySelector('#export-json').addEventListener('click', () => {
    trip.updated = new Date().toISOString().slice(0, 10);
    const file = new Blob([JSON.stringify(trip, null, 2) + '\n'], {type:'application/json'});
    const url = URL.createObjectURL(file);
    const download = el('a'); download.href = url; download.download = 'trip.json';
    document.body.append(download); download.click(); download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('#reset-draft').addEventListener('click', async () => {
    if (!window.confirm('放弃本机未共享修改，重新读取共享版本？')) return;
    try {
      const latest = await fetchPublished();
      published = latest.data; publishedRevision = latest.revision;
    } catch (error) {
      setStatus(`暂时无法读取共享版本：${error.message}`, true);
      return;
    }
    try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(OLD_DRAFT_KEY); } catch { /* no storage */ }
    draftBaseRevision = publishedRevision;
    trip = structuredClone(published); renderAll();
    setStatus('已读取最新共享计划。');
  });
}

function renderAll() {
  renderRoute(); renderDays(); renderSights(); renderFlights(); renderBudget(); renderTasks(); renderSources();
  document.querySelector('#group-note').value = trip.groupNote || '';
}

async function start() {
  try {
    try {
      const latest = await fetchPublished();
      published = latest.data; publishedRevision = latest.revision;
    } catch (error) {
      published = await fetchBundled();
      if (STORAGE_READY) console.warn('共享版本读取失败；已载入内置行程。', error);
    }
    const draft = getDraft();
    trip = draft || structuredClone(published);
    if (!draft) draftBaseRevision = publishedRevision;
    renderAll(); wireEvents();
    if (!STORAGE_READY) setStatus('共享保存尚未启用；站点主人需要完成一次性数据表配置。当前可修改本机草稿并下载备份。', true);
    else if (publishedRevision === null) setStatus('共享服务暂时无法读取。当前仅显示内置行程，保存已暂停。', true);
    else if (draft && draftBaseRevision !== publishedRevision) setStatus('共享计划已更新，本机草稿仍保留。先下载备份，再重新读取共享版并手动合并。', true);
    else if (draft) setStatus('已恢复本机未共享草稿。点击“保存到共享计划”同步给朋友。');
    else setStatus('已读取最新共享计划。修改后点击保存即可同步。');
    document.querySelector('#save-online').disabled = publishedRevision === null;
  } catch (error) {
    const notice = document.querySelector('.notice');
    notice.querySelector('strong').textContent = '行程数据暂时无法读取';
    notice.querySelector('p').textContent = '请通过网站地址访问，而不是直接打开电脑中的 index.html；若仍有问题，请刷新页面。';
    console.error(error);
  }
}

start();
