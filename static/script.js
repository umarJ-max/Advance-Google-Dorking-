/* DorkLab Hub — Main JS */

let ALL_DORKS = [];
let ALL_CATEGORIES = [];
let filteredDorks = [];
let currentCat = 'all';
let currentSev = '';
let currentSort = 'default';
let searchTimeout;

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadDorks();
    setupBuilder();
    setupOperators();
    setupLibrary();
    startTicker();
});

// ── Load dorks from API ────────────────────────────────────────────────────
async function loadDorks() {
    try {
        const res = await fetch('/api/dorks');
        const data = await res.json();
        ALL_CATEGORIES = data.categories;
        ALL_DORKS = [];
        ALL_CATEGORIES.forEach(cat => {
            cat.dorks.forEach(d => {
                ALL_DORKS.push({ ...d, catId: cat.id, catLabel: cat.label, catIcon: cat.icon, catColor: cat.color });
            });
        });
        initUI();
    } catch (e) {
        console.error('Failed to load dorks:', e);
        document.getElementById('dorkGrid').innerHTML = '<div class="loading-wrap"><p>Failed to load database. Please refresh.</p></div>';
    }
}

function initUI() {
    const total = ALL_DORKS.length;
    const critical = ALL_DORKS.filter(d => d.severity === 'critical').length;

    // Header + footer counts
    document.getElementById('statTotal').textContent = `${total} dorks`;
    document.getElementById('heroTotal').textContent = total;
    document.getElementById('heroCritical').textContent = critical;
    document.getElementById('libCount').textContent = total;
    document.getElementById('footerTotal').textContent = total;

    // Build category tabs
    buildCatTabs();
    // Initial render
    applyFilters();
}

// ── Category Tabs ──────────────────────────────────────────────────────────
function buildCatTabs() {
    const bar = document.getElementById('catTabs');
    bar.innerHTML = '';

    // All tab
    const allTab = mkTab('all', '◈ All', ALL_DORKS.length, 'cnt-all');
    bar.appendChild(allTab);

    ALL_CATEGORIES.forEach(cat => {
        const tab = mkTab(cat.id, `${cat.icon} ${cat.label}`, cat.dorks.length, `cnt-${cat.id}`);
        bar.appendChild(tab);
    });

    bar.addEventListener('click', (e) => {
        const tab = e.target.closest('.cat-tab');
        if (!tab) return;
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCat = tab.dataset.cat;
        applyFilters();
    });
}

function mkTab(id, label, count, countId) {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (id === 'all' ? ' active' : '');
    btn.dataset.cat = id;
    btn.innerHTML = `<span>${label}</span><span class="cat-count" id="${countId}">${count}</span>`;
    return btn;
}

// ── Filtering ──────────────────────────────────────────────────────────────
function applyFilters() {
    const q = (document.getElementById('libSearch').value || '').toLowerCase().trim();

    filteredDorks = ALL_DORKS.filter(d => {
        if (currentCat !== 'all' && d.catId !== currentCat) return false;
        if (currentSev && d.severity !== currentSev) return false;
        if (q && !(
            d.query.toLowerCase().includes(q) ||
            d.title.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            (d.tags || []).some(t => t.includes(q)) ||
            d.catLabel.toLowerCase().includes(q)
        )) return false;
        return true;
    });

    // Sort
    if (currentSort === 'severity') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        filteredDorks.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
    } else if (currentSort === 'title') {
        filteredDorks.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderDorks();
    updateResultsMeta();
}

function updateResultsMeta() {
    const el = document.getElementById('resultsCount');
    const total = ALL_DORKS.length;
    const shown = filteredDorks.length;
    el.textContent = shown === total ? `All ${total} dorks` : `${shown} of ${total} dorks`;
    document.getElementById('emptyState').classList.toggle('hidden', shown > 0);
}

// ── Render Dorks ───────────────────────────────────────────────────────────
function renderDorks() {
    const grid = document.getElementById('dorkGrid');

    if (filteredDorks.length === 0) {
        grid.innerHTML = '';
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredDorks.forEach(d => {
        fragment.appendChild(makeDorkCard(d));
    });
    grid.innerHTML = '';
    grid.appendChild(fragment);
}

function makeDorkCard(d) {
    const card = document.createElement('div');
    card.className = `dork-card sev-${d.severity}`;
    card.innerHTML = `
        <div class="dork-sev-bar"></div>
        <div class="dork-main">
            <div class="dork-title-row">
                <span class="dork-title">${escHtml(d.title)}</span>
                <span class="sev-badge ${d.severity}">${d.severity}</span>
                <span class="dork-cat-badge">${escHtml(d.catIcon)} ${escHtml(d.catLabel)}</span>
            </div>
            <div class="dork-query-text">${escHtml(d.query)}</div>
            <div class="dork-desc">${escHtml(d.description)}</div>
        </div>
        <div class="dork-tags">
            ${(d.tags || []).slice(0, 3).map(t => `<span class="dork-tag">${escHtml(t)}</span>`).join('')}
        </div>
        <button class="dork-use-btn" data-id="${d.id}">Use ↗</button>
    `;

    card.querySelector('.dork-use-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        loadDorkIntoBuilder(d, e.currentTarget);
    });
    card.addEventListener('click', () => {
        const btn = card.querySelector('.dork-use-btn');
        loadDorkIntoBuilder(d, btn);
    });

    return card;
}

function loadDorkIntoBuilder(d, btn) {
    document.getElementById('searchQuery').value = d.query;
    buildQuery();
    // Flash the button
    const orig = btn.textContent;
    btn.textContent = '✓ Loaded';
    btn.classList.add('loaded');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('loaded'); }, 1600);
    // Scroll to builder
    document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Library Setup ──────────────────────────────────────────────────────────
function setupLibrary() {
    // Search input
    const libSearch = document.getElementById('libSearch');
    const clearBtn = document.getElementById('clearSearch');

    libSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const hasVal = libSearch.value.length > 0;
        clearBtn.classList.toggle('hidden', !hasVal);
        searchTimeout = setTimeout(applyFilters, 200);
    });

    clearBtn.addEventListener('click', () => {
        libSearch.value = '';
        clearBtn.classList.add('hidden');
        applyFilters();
    });

    // Severity pills
    document.getElementById('sevFilters').addEventListener('click', (e) => {
        const pill = e.target.closest('.sev-pill');
        if (!pill) return;
        document.querySelectorAll('.sev-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSev = pill.dataset.sev;
        applyFilters();
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
    });

    // Reset all
    document.getElementById('resetAll').addEventListener('click', resetAllFilters);
}

function resetAllFilters() {
    document.getElementById('libSearch').value = '';
    document.getElementById('clearSearch').classList.add('hidden');
    document.querySelectorAll('.sev-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.sev-pill[data-sev=""]').classList.add('active');
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.cat-tab[data-cat="all"]').classList.add('active');
    currentCat = 'all';
    currentSev = '';
    currentSort = 'default';
    document.getElementById('sortSelect').value = 'default';
    applyFilters();
}

// ── Builder ────────────────────────────────────────────────────────────────
function setupBuilder() {
    document.getElementById('buildBtn').addEventListener('click', buildQuery);
    document.getElementById('clearBtn').addEventListener('click', clearBuilder);
    document.getElementById('searchQuery').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') buildQuery();
    });
}

function buildQuery() {
    const q = document.getElementById('searchQuery').value.trim();
    const site = document.getElementById('siteFilter').value.trim();
    if (!q) {
        shakeEl(document.getElementById('searchQuery'));
        return;
    }

    let finalQ = q;
    if (site && !finalQ.includes('site:')) finalQ += ` site:${site}`;

    document.getElementById('outputQuery').textContent = finalQ;
    document.getElementById('outputBox').classList.remove('hidden');

    // Intent badges
    const badges = detectBadges(finalQ);
    const badgesEl = document.getElementById('intentBadges');
    badgesEl.innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');

    const gUrl = `https://www.google.com/search?q=${encodeURIComponent(finalQ)}`;
    const bUrl = `https://www.bing.com/search?q=${encodeURIComponent(finalQ)}`;
    const dUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalQ)}`;

    document.getElementById('openGoogle').onclick = () => window.open(gUrl, '_blank');
    document.getElementById('openBing').onclick = () => window.open(bUrl, '_blank');
    document.getElementById('openDDG').onclick = () => window.open(dUrl, '_blank');
    document.getElementById('copyDork').onclick = () => copyText(finalQ, document.getElementById('copyDork'));

    document.getElementById('outputBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearBuilder() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('siteFilter').value = '';
    document.getElementById('outputBox').classList.add('hidden');
    document.getElementById('searchQuery').focus();
}

// ── Operators ──────────────────────────────────────────────────────────────
function setupOperators() {
    document.querySelectorAll('.op-card').forEach(card => {
        card.addEventListener('click', () => {
            const insert = card.dataset.insert;
            const ta = document.getElementById('searchQuery');
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const val = ta.value;
            ta.value = val.slice(0, start) + insert + val.slice(end);
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + insert.length;
            // Flash
            card.style.borderColor = 'var(--accent)';
            setTimeout(() => card.style.borderColor = '', 500);
        });
    });
}

// ── Ticker ────────────────────────────────────────────────────────────────
function startTicker() {
    if (!ALL_DORKS.length) return;
    let idx = 0;
    const tickDorks = ALL_DORKS.filter(d => d.severity === 'critical').slice(0, 20);
    function tick() {
        if (!tickDorks.length) return;
        const d = tickDorks[idx % tickDorks.length];
        const qEl = document.getElementById('tickerQuery');
        const tEl = document.getElementById('tickerTitle');
        if (qEl && tEl) {
            qEl.style.opacity = '0';
            setTimeout(() => {
                qEl.textContent = d.query;
                tEl.textContent = d.title;
                qEl.style.transition = 'opacity 0.4s';
                qEl.style.opacity = '1';
            }, 200);
        }
        idx++;
    }
    tick();
    setInterval(tick, 3500);
}

// ── Utilities ──────────────────────────────────────────────────────────────
function detectBadges(q) {
    const ql = q.toLowerCase();
    const badges = [];
    if (ql.includes('filetype:')) badges.push('filetype');
    if (ql.includes('inurl:')) badges.push('url match');
    if (ql.includes('intitle:')) badges.push('title match');
    if (ql.includes('intext:')) badges.push('body search');
    if (ql.includes('site:')) badges.push('site scoped');
    if (ql.includes('password') || ql.includes('passwd')) badges.push('credential hunt');
    if (ql.includes('login') || ql.includes('signin')) badges.push('auth page');
    if (ql.includes('index of')) badges.push('dir listing');
    if (ql.includes('filetype:sql') || ql.includes('mysql')) badges.push('database');
    if (ql.includes('config') || ql.includes('.ini') || ql.includes('.conf')) badges.push('config file');
    return badges;
}

function copyText(text, btn) {
    const orig = btn.textContent;
    navigator.clipboard.writeText(text).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }).finally(() => {
        btn.textContent = '✓ Copied';
        setTimeout(() => btn.textContent = orig, 2000);
    });
}

function shakeEl(el) {
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow = '0 0 0 3px var(--red-dim)';
    setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 800);
    el.focus();
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('libSearch').focus();
        document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (e.key === 'Escape') {
        document.getElementById('outputBox').classList.add('hidden');
    }
});
