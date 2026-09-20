// ============================================================
// SafeSurf AI — Extension Popup
// ============================================================
const API_BASE = 'http://localhost:5000';

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    show('loadingScreen');
    hide('mainContent');
    hide('offlineContent');

    const online = await checkBackend();

    if (online) {
        show('mainContent');
        hide('offlineContent');
        hide('loadingScreen');

        await loadCurrentTab();
        await loadHistory();

        document.getElementById('scanBtn').addEventListener('click', deepScan);
        document.getElementById('rescanBtn').addEventListener('click', rescan);
        document.getElementById('syncBtn').addEventListener('click', syncData);
        document.getElementById('historyBtn').addEventListener('click', () => { loadHistory(); toast('History refreshed', 'info'); });
    } else {
        hide('loadingScreen');
        show('offlineContent');

        // Still do a local scan for the current tab
        const tab = await getActiveTab();
        if (tab && tab.url && tab.url.startsWith('http')) {
            const el = document.getElementById('offlineSiteCard');
            if (el) el.style.display = 'block';
            document.getElementById('offlineSiteName').textContent = getDomain(tab.url);
            document.getElementById('offlineSiteUrl').textContent  = truncate(tab.url, 55);
            const res = localScan(tab.url);
            applyOfflineUI(res);
        }
        document.getElementById('offlineScanBtn').addEventListener('click', async () => {
            const tab = await getActiveTab();
            if (tab && tab.url) {
                const res = localScan(tab.url);
                applyOfflineUI(res);
                toast(`Local scan: ${res.score}/100`, 'info');
            }
        });
    }
});

// ── Backend health check ─────────────────────────────────────
async function checkBackend() {
    try {
        const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
        const d = await r.json();
        if (d.status === 'healthy') {
            setBadge('backendStatus', '● Online', 'online');
            return true;
        }
    } catch (_) { /* offline */ }
    setBadge('backendStatus', '● Offline', 'offline');
    return false;
}

// ── Current tab ──────────────────────────────────────────────
async function loadCurrentTab() {
    const tab = await getActiveTab();

    if (!tab || !tab.url || !tab.url.startsWith('http')) {
        document.getElementById('siteName').textContent = 'No active website';
        document.getElementById('siteUrl').textContent  = 'Navigate to a site to scan';
        setScoreUI({ score: 0, status: 'N/A', threat_level: 'UNKNOWN', warnings: [] });
        return;
    }

    const url = tab.url;
    document.getElementById('siteName').textContent = getDomain(url);
    document.getElementById('siteUrl').textContent  = truncate(url, 58);
    document.getElementById('siteIcon').textContent = getIcon(url);

    // Check 5-min cache first
    const cached = await getCached(url);
    if (cached) {
        setScoreUI(cached);
    } else {
        await performScan(url);
    }
}

// ── Scan (uses enhanced endpoint for full API results) ───────
async function performScan(url) {
    try {
        // Use enhanced endpoint so we get api_summary + warnings
        const r = await fetch(`${API_BASE}/check-website-enhanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await r.json();
        if (data.score !== undefined) {
            const result = {
                url,
                score:        data.score,
                status:       data.status,
                threat_level: data.threat_level,
                warnings:     data.warnings  || [],
                api_summary:  data.api_summary || {}
            };
            setScoreUI(result);
            await saveHistory(result);
            return result;
        }
    } catch (err) {
        console.error('Enhanced scan error:', err);
    }

    // Fallback: quick-check
    try {
        const r = await fetch(`${API_BASE}/api/quick-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, user_id: getUserId() })
        });
        const data = await r.json();
        if (data.success) {
            const result = {
                url,
                score:        data.score,
                status:       data.status,
                threat_level: data.threat_level,
                warnings:     data.warnings || [],
                api_summary:  {}
            };
            setScoreUI(result);
            await saveHistory(result);
            return result;
        }
    } catch (err) {
        console.error('Quick-check error:', err);
    }

    // Final fallback: local
    const result = localScan(url);
    await saveHistory(result);
    return result;
}

// ── Deep scan button ─────────────────────────────────────────
async function deepScan() {
    const btn = document.getElementById('scanBtn');
    btn.textContent = '⏳ Scanning...';
    btn.disabled = true;
    try {
        const tab = await getActiveTab();
        if (tab && tab.url) {
            await clearCached(tab.url);
            const res = await performScan(tab.url);
            toast(`Deep scan: ${res.score}/100 — ${res.threat_level}`, res.score >= 70 ? 'success' : 'warning');
            await loadHistory();
        }
    } finally {
        btn.textContent = '🔍 Deep Scan';
        btn.disabled = false;
    }
}

// ── Rescan button ─────────────────────────────────────────────
async function rescan() {
    const btn = document.getElementById('rescanBtn');
    btn.textContent = '⏳ Rescanning...';
    btn.disabled = true;
    try {
        const tab = await getActiveTab();
        if (tab && tab.url) {
            await clearCached(tab.url);
            const res = await performScan(tab.url);
            toast(`Rescanned: ${res.score}/100`, 'info');
            await loadHistory();
        }
    } finally {
        btn.textContent = '🔄 Rescan';
        btn.disabled = false;
    }
}

// ── Sync button ───────────────────────────────────────────────
async function syncData() {
    const btn = document.getElementById('syncBtn');
    btn.textContent = '⏳ Syncing...';
    btn.disabled = true;
    try {
        const history = await getHistory();
        if (!history.length) { toast('Nothing to sync', 'info'); return; }

        const r = await fetch(`${API_BASE}/api/threats/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threats: history, user_id: getUserId() })
        });
        const d = await r.json();
        if (d.success) {
            toast(`Synced ${d.synced} scans ✓`, 'success');
            await markSynced();
        } else {
            toast('Sync failed', 'warning');
        }
    } catch (e) {
        toast('Sync error: ' + e.message, 'warning');
    } finally {
        btn.textContent = '☁️ Sync';
        btn.disabled = false;
    }
}

// ── Update main UI ────────────────────────────────────────────
function setScoreUI(result) {
    const score       = result.score        || 0;
    const status      = result.status       || 'UNKNOWN';
    const threatLevel = result.threat_level || 'UNKNOWN';
    const warnings    = result.warnings     || [];
    const apiSummary  = result.api_summary  || {};

    // Score circle
    const circle = document.getElementById('scoreCircle');
    circle.textContent = score;
    circle.className   = 'score-circle ' + scoreClass(score);

    // Status & threat
    document.getElementById('scoreStatus').textContent = status;
    const threatEl = document.getElementById('threatBadge');
    threatEl.textContent = threatLevel;
    threatEl.className   = `score-threat threat-${threatLevel}`;

    // Site icon based on threat
    const iconEl = document.getElementById('siteIcon');
    if (score < 40) iconEl.textContent = '🚨';
    else if (score < 70) iconEl.textContent = '⚠️';
    else iconEl.textContent = '✅';

    // API chips
    const strip = document.getElementById('apiStrip');
    strip.innerHTML = '';
    let hasApi = false;
    for (const [name, val] of Object.entries(apiSummary)) {
        if (name.endsWith('_permalink')) continue;
        hasApi = true;
        const chip = document.createElement('span');
        const chipClass = val.includes('🚨') ? 'danger'
                        : val.includes('⚠️') ? 'warning'
                        : val.includes('✅') ? 'clean'
                        : 'skipped';
        chip.className   = `api-chip ${chipClass}`;
        chip.title       = val;

        // Short label
        const shortName = name.includes('VirusTotal') ? 'VT'
                        : name.includes('Google')     ? 'GSB'
                        : name;
        const icon = chipClass === 'clean'   ? '✅'
                   : chipClass === 'danger'  ? '🚨'
                   : chipClass === 'warning' ? '⚠️'
                   : '—';

        // VT permalink
        const permalink = apiSummary[`${name}_permalink`];
        if (permalink && chipClass === 'danger') {
            chip.style.cursor = 'pointer';
            chip.addEventListener('click', () => chrome.tabs.create({ url: permalink }));
            chip.title = val + ' — Click to view on VirusTotal';
        }

        chip.textContent = `${icon} ${shortName}`;
        strip.appendChild(chip);
    }
    strip.style.display = hasApi ? 'flex' : 'none';

    // Cache result
    cacheResult(result);

    // Warnings
    const box  = document.getElementById('warningsBox');
    const list = document.getElementById('warningsList');
    list.innerHTML = '';
    const shown = warnings.filter(w => w && !w.startsWith('🔍') && !w.startsWith('🌐') && !w.startsWith('📁'));
    if (shown.length > 0) {
        box.style.display = 'block';
        shown.slice(0, 5).forEach(w => {
            const el = document.createElement('div');
            el.className = 'warning-item';
            el.textContent = w;
            list.appendChild(el);
        });
    } else {
        box.style.display = 'none';
    }
}

// ── Offline UI ────────────────────────────────────────────────
function applyOfflineUI(res) {
    const score = res.score || 0;
    const circle = document.getElementById('offlineScoreCircle');
    circle.textContent = score;
    circle.className   = 'score-circle ' + scoreClass(score);
    document.getElementById('offlineStatus').textContent = res.status || 'LOCAL SCAN';
    const t = document.getElementById('offlineThreat');
    t.textContent = res.threat_level || 'UNKNOWN';
    t.className   = `score-threat threat-${res.threat_level || 'UNKNOWN'}`;
}

// ── Local fallback scan ───────────────────────────────────────
function localScan(url) {
    const u = url.toLowerCase();
    let score = 65;
    if (!u.startsWith('https://')) score -= 15;
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(u)) score -= 20;
    if (url.length > 120) score -= 8;

    const phishPatterns = ['paypal-login', 'microsoft-login', 'apple-id-verify',
                           'bank-login', 'account-verify', 'free-money'];
    for (const p of phishPatterns) {
        if (u.includes(p)) { score -= 30; break; }
    }

    score = Math.max(0, Math.min(100, score));
    return {
        url, score,
        status:       score >= 70 ? '✅ SAFE' : score >= 40 ? '⚠️ MODERATE' : '🚨 DANGER',
        threat_level: score >= 70 ? 'LOW'     : score >= 40 ? 'MEDIUM'       : 'HIGH',
        warnings:     ['⚠️ Local analysis only — backend offline'],
        api_summary:  {}
    };
}

// ── History ───────────────────────────────────────────────────
async function loadHistory() {
    const history  = await getHistory();
    const list     = document.getElementById('historyList');
    const empty    = document.getElementById('emptyHistory');
    const countEl  = document.getElementById('historyCount');

    countEl.textContent = `${history.length} scans`;

    if (!history.length) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    list.innerHTML = '';

    history.slice(0, 6).forEach(item => {
        const score = item.score || 0;
        const tl    = item.threat_level || 'UNKNOWN';
        const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
        const bgCol = score >= 70 ? '#10b98118' : score >= 40 ? '#f59e0b18' : '#ef444418';

        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-score" style="color:${color}">${score}</div>
            <div class="history-meta">
                <div class="history-url">${truncate(item.url || '—', 42)}</div>
                <div class="history-time">${timeAgo(item.timestamp)}</div>
            </div>
            <div class="history-badge" style="background:${bgCol};color:${color}">${tl}</div>
        `;
        div.addEventListener('click', () => {
            if (item.url) chrome.tabs.create({ url: item.url });
        });
        list.appendChild(div);
    });
}

// ── Storage ───────────────────────────────────────────────────
function getHistory() {
    return new Promise(res => chrome.storage.local.get(['scanHistory'], d => res(d.scanHistory || [])));
}

async function saveHistory(item) {
    const history = await getHistory();
    if (!item.timestamp) item.timestamp = new Date().toISOString();
    history.unshift(item);
    const trimmed = history.slice(0, 50);
    return new Promise(res => chrome.storage.local.set({ scanHistory: trimmed }, res));
}

function markSynced() {
    return new Promise(res => chrome.storage.local.get(['scanHistory'], d => {
        const h = (d.scanHistory || []).map(i => ({ ...i, synced: true }));
        chrome.storage.local.set({ scanHistory: h }, res);
    }));
}

function getCached(url) {
    return new Promise(res => chrome.storage.local.get(['scanCache'], d => {
        const c = (d.scanCache || {})[url];
        res(c && Date.now() - c._ts < 5 * 60 * 1000 ? c : null);
    }));
}

function cacheResult(result) {
    return new Promise(res => chrome.storage.local.get(['scanCache'], d => {
        const cache = d.scanCache || {};
        cache[result.url] = { ...result, _ts: Date.now() };
        chrome.storage.local.set({ scanCache: cache }, res);
    }));
}

function clearCached(url) {
    return new Promise(res => chrome.storage.local.get(['scanCache'], d => {
        const cache = d.scanCache || {};
        delete cache[url];
        chrome.storage.local.set({ scanCache: cache }, res);
    }));
}

// ── Helpers ───────────────────────────────────────────────────
function getActiveTab() {
    return new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, tabs => res(tabs[0])));
}

function getUserId() {
    let id = localStorage.getItem('ss_uid');
    if (!id) { id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9); localStorage.setItem('ss_uid', id); }
    return id;
}

function getDomain(url) {
    try { let h = new URL(url).hostname; return h.startsWith('www.') ? h.slice(4) : h; }
    catch (_) { return url.split('/')[2] || url; }
}

function truncate(text, max) {
    if (!text) return '';
    return text.length <= max ? text : text.slice(0, max) + '…';
}

function scoreClass(score) {
    return score >= 70 ? 'safe' : score >= 40 ? 'warning' : 'danger';
}

function getIcon(url) {
    const u = url.toLowerCase();
    if (u.includes('bank') || u.includes('paypal'))   return '🏦';
    if (u.includes('mail') || u.includes('email'))    return '📧';
    if (u.includes('shop') || u.includes('amazon'))   return '🛒';
    if (u.includes('youtube') || u.includes('video')) return '▶️';
    return '🌐';
}

function timeAgo(ts) {
    if (!ts) return 'just now';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d === 1) return 'yesterday';
    if (d < 7)  return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

function setBadge(id, text, cls) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className   = `badge ${cls}`;
}

function show(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.background = type === 'success' ? '#059669'
                         : type === 'warning' ? '#d97706'
                         : type === 'error'   ? '#dc2626'
                         : '#3b82f6';
    el.style.color = '#fff';
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}
