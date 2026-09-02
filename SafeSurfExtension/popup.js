// popup.js - Simple SafeSurf Extension
const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('SafeSurf popup loaded');
    
    // Initialize
    await initPopup();
    
    // Add event listeners
    document.getElementById('scanBtn').addEventListener('click', scanCurrentPage);
    document.getElementById('rescanBtn').addEventListener('click', rescanCurrentPage);
    document.getElementById('syncBtn').addEventListener('click', syncData);
    document.getElementById('historyBtn').addEventListener('click', showHistory);
});

async function initPopup() {
    try {
        // Check backend connection
        const isOnline = await checkBackend();
        
        if (isOnline) {
            // Load current tab info
            await loadCurrentTab();
            
            // Load history
            await loadHistory();
            
            // Hide loading, show content
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        } else {
            showMessage('Backend server is offline', 'error');
            showOfflineMode();
        }
    } catch (error) {
        console.error('Init error:', error);
        showMessage('Error: ' + error.message, 'error');
        showOfflineMode();
    }
}

async function checkBackend() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            document.getElementById('backendStatus').textContent = 'Backend: ONLINE';
            document.getElementById('backendStatus').className = 'status-badge online';
            return true;
        }
    } catch (error) {
        console.log('Backend offline:', error);
    }
    
    document.getElementById('backendStatus').textContent = 'Backend: OFFLINE';
    document.getElementById('backendStatus').className = 'status-badge offline';
    return false;
}

async function loadCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url && tab.url.startsWith('http')) {
            // Display URL
            const url = tab.url;
            document.getElementById('currentUrl').textContent = getDomain(url);
            document.getElementById('fullUrl').textContent = truncateText(url, 50);
            
            // Check if we have cached result
            const cached = await getCachedResult(url);
            if (cached) {
                updateScanUI(cached);
            } else {
                // Scan immediately
                await quickScan(url);
            }
        } else {
            document.getElementById('currentUrl').textContent = 'No active website';
            document.getElementById('fullUrl').textContent = 'Open a website to scan';
            document.getElementById('scoreValue').textContent = '--';
            document.getElementById('statusValue').textContent = 'N/A';
            document.getElementById('threatLevel').textContent = 'UNKNOWN';
        }
    } catch (error) {
        console.error('Load tab error:', error);
    }
}

async function quickScan(url) {
    try {
        const response = await fetch(`${API_BASE}/api/quick-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                user_id: getUserId()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const result = {
                url: url,
                score: data.score,
                status: data.status,
                threat_level: data.threat_level,
                warnings: data.warnings || []
            };
            
            updateScanUI(result);
            saveToHistory(result);
            return result;
        }
    } catch (error) {
        console.error('Quick scan error:', error);
    }
    
    // Fallback to local scan
    return localScan(url);
}

function localScan(url) {
    // Simple local analysis
    const urlLower = url.toLowerCase();
    let score = 70;
    
    // Check for HTTPS
    if (!urlLower.startsWith('https://')) {
        score -= 15;
    }
    
    // Check for suspicious patterns
    if (url.includes('login') || url.includes('signin')) {
        score -= 10;
    }
    
    if (url.length > 100) {
        score -= 5;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let status, threat_level;
    if (score >= 70) {
        status = '✅ SAFE';
        threat_level = 'LOW';
    } else if (score >= 40) {
        status = '⚠️ MODERATE';
        threat_level = 'MEDIUM';
    } else {
        status = '🚨 DANGER';
        threat_level = 'HIGH';
    }
    
    const result = {
        url: url,
        score: score,
        status: status,
        threat_level: threat_level,
        warnings: ['Local analysis only']
    };
    
    updateScanUI(result);
    saveToHistory(result);
    return result;
}

function updateScanUI(result) {
    const score = result.score || 0;
    const status = result.status || 'UNKNOWN';
    const threatLevel = result.threat_level || 'UNKNOWN';
    
    // Update elements
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('statusValue').textContent = status;
    document.getElementById('threatLevel').textContent = threatLevel;
    
    // Set colors
    const scoreElement = document.getElementById('scoreValue');
    const threatElement = document.getElementById('threatLevel');
    
    if (score >= 70) {
        scoreElement.className = 'score safe';
        threatElement.style.backgroundColor = '#10b98120';
        threatElement.style.color = '#10b981';
    } else if (score >= 40) {
        scoreElement.className = 'score warning';
        threatElement.style.backgroundColor = '#f59e0b20';
        threatElement.style.color = '#f59e0b';
    } else {
        scoreElement.className = 'score danger';
        threatElement.style.backgroundColor = '#ef444420';
        threatElement.style.color = '#ef4444';
    }
    
    // Store in cache
    cacheResult(result);
}

async function scanCurrentPage() {
    const btn = document.getElementById('scanBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '🔍 Scanning...';
    btn.disabled = true;
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
            const result = await quickScan(tab.url);
            showMessage(`Scanned: ${result.score}/100 - ${result.threat_level}`, 'success');
        }
    } catch (error) {
        showMessage('Scan failed: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function rescanCurrentPage() {
    const btn = document.getElementById('rescanBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '🔄 Rescanning...';
    btn.disabled = true;
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
            // Clear cache for this URL
            await clearCache(tab.url);
            
            // Rescan
            const result = await quickScan(tab.url);
            showMessage(`Rescanned: ${result.score}/100`, 'success');
        }
    } catch (error) {
        showMessage('Rescan failed: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function syncData() {
    const btn = document.getElementById('syncBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '🔄 Syncing...';
    btn.disabled = true;
    
    try {
        // Get history from storage
        const history = await getHistory();
        
        if (history.length === 0) {
            showMessage('No data to sync', 'info');
            return;
        }
        
        // Send to backend
        const response = await fetch(`${API_BASE}/api/threats/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                threats: history,
                user_id: getUserId()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`Synced ${data.synced} threats successfully`, 'success');
            
            // Mark as synced
            await markAsSynced();
        } else {
            showMessage('Sync failed: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Sync error: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadHistory() {
    try {
        const history = await getHistory();
        const historyList = document.getElementById('historyList');
        const emptyHistory = document.getElementById('emptyHistory');
        const historyCount = document.getElementById('historyCount');
        
        // Update count
        historyCount.textContent = `${history.length} scans`;
        
        if (history.length === 0) {
            emptyHistory.style.display = 'block';
            historyList.innerHTML = '';
            return;
        }
        
        emptyHistory.style.display = 'none';
        historyList.innerHTML = '';
        
        // Show latest 5 scans
        history.slice(0, 5).forEach((item, index) => {
            const threatItem = createHistoryItem(item, index);
            historyList.appendChild(threatItem);
        });
    } catch (error) {
        console.error('Load history error:', error);
    }
}

function createHistoryItem(threat, index) {
    const div = document.createElement('div');
    div.className = 'threat-item';
    
    const score = threat.score || 0;
    const threatLevel = threat.threat_level || 'LOW';
    
    // Set color based on score
    let color, bgColor;
    if (score >= 70) {
        color = '#10b981';
        bgColor = '#10b98120';
    } else if (score >= 40) {
        color = '#f59e0b';
        bgColor = '#f59e0b20';
    } else {
        color = '#ef4444';
        bgColor = '#ef444420';
    }
    
    div.innerHTML = `
        <div class="threat-header">
            <div class="threat-score" style="color: ${color}">${score}/100</div>
            <div style="font-size: 11px; background: ${bgColor}; color: ${color}; padding: 2px 6px; border-radius: 10px;">
                ${threatLevel}
            </div>
        </div>
        <div class="threat-url">${truncateText(threat.url, 40)}</div>
        <div class="threat-time">${formatTime(threat.timestamp)}</div>
    `;
    
    // Click to open URL
    div.addEventListener('click', () => {
        chrome.tabs.create({ url: threat.url });
    });
    
    return div;
}

function showHistory() {
    // For now, just reload history
    loadHistory();
    showMessage('History loaded', 'info');
}

// Storage functions
async function getHistory() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanHistory'], (result) => {
            resolve(result.scanHistory || []);
        });
    });
}

async function saveToHistory(threat) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanHistory'], (result) => {
            let history = result.scanHistory || [];
            
            // Add timestamp if not present
            if (!threat.timestamp) {
                threat.timestamp = new Date().toISOString();
            }
            
            // Add to beginning
            history.unshift(threat);
            
            // Keep only last 50 items
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            chrome.storage.local.set({ scanHistory: history }, () => {
                resolve();
            });
        });
    });
}

async function markAsSynced() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanHistory'], (result) => {
            let history = result.scanHistory || [];
            
            // Mark all as synced
            history = history.map(item => ({
                ...item,
                synced: true
            }));
            
            chrome.storage.local.set({ scanHistory: history }, () => {
                resolve();
            });
        });
    });
}

async function getCachedResult(url) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanCache'], (result) => {
            const cache = result.scanCache || {};
            const cached = cache[url];
            
            // Check if cache is fresh (less than 5 minutes old)
            if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
                resolve(cached);
            } else {
                resolve(null);
            }
        });
    });
}

async function cacheResult(result) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanCache'], (storage) => {
            const cache = storage.scanCache || {};
            cache[result.url] = {
                ...result,
                timestamp: Date.now()
            };
            
            chrome.storage.local.set({ scanCache: cache }, () => {
                resolve();
            });
        });
    });
}

async function clearCache(url) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['scanCache'], (storage) => {
            const cache = storage.scanCache || {};
            delete cache[url];
            
            chrome.storage.local.set({ scanCache: cache }, () => {
                resolve();
            });
        });
    });
}

// Utility functions
function getUserId() {
    // Generate or get user ID
    let userId = localStorage.getItem('safesurf_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('safesurf_user_id', userId);
    }
    return userId;
}

function getDomain(url) {
    try {
        const urlObj = new URL(url);
        let domain = urlObj.hostname;
        
        // Remove www. prefix
        if (domain.startsWith('www.')) {
            domain = domain.substring(4);
        }
        
        return domain;
    } catch {
        return url.split('/')[2] || url;
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    } catch {
        return timestamp;
    }
}

function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    
    // Set color based on type
    if (type === 'success') {
        messageDiv.style.background = '#10b981';
    } else if (type === 'error') {
        messageDiv.style.background = '#ef4444';
    } else if (type === 'warning') {
        messageDiv.style.background = '#f59e0b';
    } else {
        messageDiv.style.background = '#3b82f6';
    }
    
    messageDiv.style.display = 'block';
    
    // Auto hide
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

function showOfflineMode() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    document.getElementById('scoreValue').textContent = 'OFF';
    document.getElementById('scoreValue').className = 'score warning';
    document.getElementById('statusValue').textContent = 'Offline Mode';
    document.getElementById('threatLevel').textContent = 'LIMITED';
}