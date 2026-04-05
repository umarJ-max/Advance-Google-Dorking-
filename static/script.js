document.addEventListener('DOMContentLoaded', () => {

    // ── Elements ──────────────────────────────────────────────────
    const queryInput  = document.getElementById('searchQuery');
    const siteInput   = document.getElementById('siteFilter');
    const buildBtn    = document.getElementById('buildBtn');
    const clearBtn    = document.getElementById('clearBtn');
    const outputBox   = document.getElementById('outputBox');
    const outputQuery = document.getElementById('outputQuery');
    const openGoogle  = document.getElementById('openGoogle');
    const copyDork    = document.getElementById('copyDork');
    const intentBadges = document.getElementById('intentBadges');
    const tabBar      = document.getElementById('tabBar');

    // ── Tab switcher ──────────────────────────────────────────────
    tabBar.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dork-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById('panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
    });

    // ── Dork library "Use" buttons ────────────────────────────────
    document.querySelectorAll('.use-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.dork-item');
            const dorkQuery = item.dataset.dork;
            queryInput.value = dorkQuery;
            buildQuery(dorkQuery);
            // flash
            btn.classList.add('flash');
            btn.textContent = '✓ Loaded';
            setTimeout(() => {
                btn.classList.remove('flash');
                btn.textContent = 'Use ↗';
            }, 1400);
            // scroll to builder
            document.querySelector('.query-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Also clicking the dork-item row (excluding button)
    document.querySelectorAll('.dork-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('use-btn')) return;
            const btn = item.querySelector('.use-btn');
            btn.click();
        });
    });

    // ── Build button ──────────────────────────────────────────────
    buildBtn.addEventListener('click', () => {
        const query = queryInput.value.trim();
        if (!query) {
            shake(queryInput);
            return;
        }
        buildQuery(query);
    });

    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') buildBtn.click();
    });

    // ── Clear ─────────────────────────────────────────────────────
    clearBtn.addEventListener('click', () => {
        queryInput.value = '';
        siteInput.value = '';
        outputBox.classList.add('hidden');
        queryInput.focus();
    });

    // ── Build logic ───────────────────────────────────────────────
    function buildQuery(rawQuery) {
        const site = siteInput.value.trim();
        let finalQuery = rawQuery;

        // Append site: if provided
        if (site) {
            // If query doesn't already have site:
            if (!finalQuery.includes('site:')) {
                finalQuery += ` site:${site}`;
            }
        }

        const url = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;

        outputQuery.textContent = finalQuery;
        outputBox.classList.remove('hidden');

        // Detect intent badges
        const intents = detectIntents(rawQuery);
        intentBadges.innerHTML = '';
        intents.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'intent-badge';
            span.textContent = tag;
            intentBadges.appendChild(span);
        });

        // Wire buttons
        openGoogle.onclick = () => window.open(url, '_blank');
        copyDork.onclick = () => copyToClipboard(finalQuery, copyDork);

        outputBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Intent detector for badges ────────────────────────────────
    function detectIntents(q) {
        const ql = q.toLowerCase();
        const tags = [];
        if (ql.includes('filetype:')) tags.push('filetype filter');
        if (ql.includes('inurl:'))   tags.push('url targeting');
        if (ql.includes('intitle:')) tags.push('title match');
        if (ql.includes('intext:'))  tags.push('body search');
        if (ql.includes('site:'))    tags.push('site scoped');
        if (ql.includes('password') || ql.includes('passwd')) tags.push('credential hunt');
        if (ql.includes('login') || ql.includes('signin'))   tags.push('auth page');
        if (ql.includes('index of'))  tags.push('dir listing');
        if (ql.includes('filetype:sql') || ql.includes('filetype:mdb') || ql.includes('mysql')) tags.push('database');
        if (ql.includes('.conf') || ql.includes('config') || ql.includes('.ini')) tags.push('config file');
        if (ql.includes('camera') || ql.includes('viewerframe') || ql.includes('shtml')) tags.push('camera/iot');
        return tags;
    }

    // ── Clipboard ─────────────────────────────────────────────────
    function copyToClipboard(text, btn) {
        const orig = btn.textContent;
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'Copied ✓';
            setTimeout(() => btn.textContent = orig, 2000);
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            btn.textContent = 'Copied ✓';
            setTimeout(() => btn.textContent = orig, 2000);
        });
    }

    // ── Shake animation for empty input ──────────────────────────
    function shake(el) {
        el.style.animation = 'none';
        el.style.borderColor = 'var(--red)';
        el.style.boxShadow = '0 0 0 3px rgba(255,69,96,0.2)';
        setTimeout(() => {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }, 800);
        el.focus();
    }

    // ── Keyboard shortcuts ────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K → focus query input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            queryInput.focus();
            queryInput.select();
        }
        // Escape → hide output
        if (e.key === 'Escape') {
            if (!outputBox.classList.contains('hidden')) {
                outputBox.classList.add('hidden');
            }
        }
    });

    // ── Auto focus ────────────────────────────────────────────────
    queryInput.focus();
});
