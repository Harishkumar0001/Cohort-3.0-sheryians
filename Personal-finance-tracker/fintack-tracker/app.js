(() => {
  'use strict';

  /* ------------------------------------------------------------
     Storage keys & defaults
  ------------------------------------------------------------ */
  const STORE_TX = 'fintrackpro.transactions';
  const STORE_PROFILE = 'fintrackpro.profile';
  const STORE_THEME = 'fintrackpro.theme';

  const CURRENCIES = {
    USD: { symbol: '$', rate: 1 },
    EUR: { symbol: '€', rate: 0.92 },
    GBP: { symbol: '£', rate: 0.79 },
    INR: { symbol: '₹', rate: 83.1 },
    JPY: { symbol: '¥', rate: 157.4 }
  };

  /* All amounts are stored in USD internally; converted only for display. */

  let state = {
    transactions: loadJSON(STORE_TX, []),
    profile: loadJSON(STORE_PROFILE, { name: 'Your Ledger', currency: 'USD' }),
    filter: 'all',
    type: 'income'
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { showToast('Could not save — storage may be full.'); }
  }

  /* ------------------------------------------------------------
     DOM refs
  ------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const txForm = $('#txForm');
  const txDesc = $('#txDesc');
  const txAmount = $('#txAmount');
  const txDate = $('#txDate');
  const typeToggle = document.querySelectorAll('.type-opt');
  const txList = $('#txList');
  const emptyState = $('#emptyState');
  const filterTabs = document.querySelectorAll('#filterTabs .tab');

  const balanceValue = $('#balanceValue');
  const balanceCurrency = $('#balanceCurrency');
  const totalIncome = $('#totalIncome');
  const totalExpense = $('#totalExpense');
  const totalCount = $('#totalCount');
  const flowLine = $('#flowLine');

  const themeToggle = $('#themeToggle');
  const profileBtn = $('#profileBtn');
  const profileModal = $('#profileModal');
  const closeProfile = $('#closeProfile');
  const saveProfile = $('#saveProfile');
  const nameInput = $('#nameInput');
  const currencySelect = $('#currencySelect');
  const profileName = $('#profileName');
  const avatarInitial = $('#avatarInitial');
  const resetBtn = $('#resetBtn');
  const toast = $('#toast');

  /* ------------------------------------------------------------
     Init
  ------------------------------------------------------------ */
  function init() {
    txDate.value = new Date().toISOString().slice(0, 10);
    applyTheme(localStorage.getItem(STORE_THEME) || 'light');
    applyProfileToUI();
    bindEvents();
    render();
  }

  function bindEvents() {
    typeToggle.forEach(btn => {
      btn.addEventListener('click', () => {
        typeToggle.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.type = btn.dataset.type;
      });
    });

    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTransaction();
    });

    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.filter = tab.dataset.filter;
        renderList();
      });
    });

    txList.addEventListener('click', (e) => {
      const btn = e.target.closest('.tx-delete');
      if (!btn) return;
      deleteTransaction(btn.dataset.id);
    });

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    profileBtn.addEventListener('click', openProfileModal);
    closeProfile.addEventListener('click', closeProfileModal);
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfileModal();
    });
    saveProfile.addEventListener('click', persistProfile);

    resetBtn.addEventListener('click', resetAllData);
  }

  /* ------------------------------------------------------------
     Theme
  ------------------------------------------------------------ */
  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(STORE_THEME, theme);
  }

  /* ------------------------------------------------------------
     Profile
  ------------------------------------------------------------ */
  function applyProfileToUI() {
    profileName.textContent = state.profile.name || 'Your Ledger';
    avatarInitial.textContent = (state.profile.name || 'U').trim().charAt(0).toUpperCase() || 'U';
    balanceCurrency.textContent = CURRENCIES[state.profile.currency].symbol;
    nameInput.value = state.profile.name || '';
    currencySelect.value = state.profile.currency || 'USD';
  }

  function openProfileModal() {
    nameInput.value = state.profile.name || '';
    currencySelect.value = state.profile.currency || 'USD';
    profileModal.classList.add('is-open');
    nameInput.focus();
  }
  function closeProfileModal() { profileModal.classList.remove('is-open'); }

  function persistProfile() {
    const name = nameInput.value.trim() || 'Your Ledger';
    const currency = currencySelect.value;
    state.profile = { name, currency };
    saveJSON(STORE_PROFILE, state.profile);
    applyProfileToUI();
    closeProfileModal();
    render();
    showToast('Profile updated');
  }

  /* ------------------------------------------------------------
     Transactions
  ------------------------------------------------------------ */
  function addTransaction() {
    const desc = txDesc.value.trim();
    const amount = parseFloat(txAmount.value);
    const date = txDate.value;

    if (!desc || isNaN(amount) || amount <= 0 || !date) {
      showToast('Please fill in every field correctly.');
      return;
    }

    const entry = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      desc,
      amount,               // stored in USD base
      type: state.type,     // 'income' | 'expense'
      date
    };

    state.transactions.push(entry);
    saveJSON(STORE_TX, state.transactions);

    txDesc.value = '';
    txAmount.value = '';
    showToast('Entry added');
    render();
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveJSON(STORE_TX, state.transactions);
    showToast('Entry removed');
    render();
  }

  function getFilteredTransactions() {
    const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (state.filter === 'all') return sorted;
    return sorted.filter(t => t.type === state.filter);
  }

  /* ------------------------------------------------------------
     Rendering
  ------------------------------------------------------------ */
  function fmt(amountUSD) {
    const cur = CURRENCIES[state.profile.currency] || CURRENCIES.USD;
    const converted = amountUSD * cur.rate;
    const decimals = state.profile.currency === 'JPY' ? 0 : 2;
    return converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function render() {
    renderSummary();
    renderList();
    renderFlow();
  }

  function renderSummary() {
    const income = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    balanceCurrency.textContent = CURRENCIES[state.profile.currency].symbol;
    balanceValue.textContent = fmt(balance);
    totalIncome.textContent = '+' + fmt(income);
    totalExpense.textContent = '-' + fmt(expense);
    totalCount.textContent = state.transactions.length;
  }

  function renderList() {
    const items = getFilteredTransactions();
    txList.innerHTML = '';

    if (items.length === 0) {
      emptyState.classList.add('is-visible');
      return;
    }
    emptyState.classList.remove('is-visible');

    const cur = CURRENCIES[state.profile.currency];
    const frag = document.createDocumentFragment();

    items.forEach(t => {
      const li = document.createElement('li');
      li.className = 'tx-row ' + (t.type === 'income' ? 'is-income' : 'is-expense');

      const glyph = document.createElement('div');
      glyph.className = 'tx-glyph';
      glyph.textContent = t.type === 'income' ? '↑' : '↓';

      const info = document.createElement('div');
      info.className = 'tx-info';
      const desc = document.createElement('div');
      desc.className = 'tx-desc';
      desc.textContent = t.desc;
      const date = document.createElement('div');
      date.className = 'tx-date';
      date.textContent = formatDate(t.date);
      info.appendChild(desc);
      info.appendChild(date);

      const amount = document.createElement('div');
      amount.className = 'tx-amount';
      amount.textContent = (t.type === 'income' ? '+' : '-') + cur.symbol + fmt(t.amount);

      const del = document.createElement('button');
      del.className = 'tx-delete';
      del.dataset.id = t.id;
      del.setAttribute('aria-label', 'Delete transaction');
      del.textContent = '✕';

      li.appendChild(glyph);
      li.appendChild(info);
      li.appendChild(amount);
      li.appendChild(del);
      frag.appendChild(li);
    });

    txList.appendChild(frag);
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ------------------------------------------------------------
     Cash-flow sparkline (signature hero visual)
     Draws cumulative running balance across sorted history.
  ------------------------------------------------------------ */
  function renderFlow() {
    const sorted = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const W = 600, H = 140, PAD = 6;

    if (sorted.length === 0) {
      flowLine.innerHTML = '';
      return;
    }

    let running = 0;
    const points = sorted.map(t => {
      running += t.type === 'income' ? t.amount : -t.amount;
      return running;
    });
    points.unshift(0);

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;

    const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
    const coords = points.map((v, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return [x, y];
    });

    const d = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');

    flowLine.innerHTML = '<path d="' + d + '"></path>';
    const path = flowLine.querySelector('path');
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect(); // force reflow
    path.style.transition = 'stroke-dashoffset 900ms ease-out';
    path.style.strokeDashoffset = '0';
  }

  /* ------------------------------------------------------------
     Reset
  ------------------------------------------------------------ */
  function resetAllData() {
    const ok = window.confirm('This will permanently delete every saved transaction and profile setting on this device. Continue?');
    if (!ok) return;
    localStorage.removeItem(STORE_TX);
    localStorage.removeItem(STORE_PROFILE);
    state.transactions = [];
    state.profile = { name: 'Your Ledger', currency: 'USD' };
    applyProfileToUI();
    render();
    showToast('All data has been reset');
  }

  /* ------------------------------------------------------------
     Toast
  ------------------------------------------------------------ */
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  init();
})();