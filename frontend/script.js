// SafeSurf AI - Complete Frontend JavaScript
// Developer: Hamid Ali, Abdul Rehman, Haider Ali
// University: M.U.S.T

const BACKEND_URL = 'http://127.0.0.1:5000';
let threatsChart = null;
let wifiDetectionInterval = null;
let detectedWifis = new Set();
let currentTab = 'dashboard';

// ==================== 1. INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SafeSurf AI Frontend Loaded');
    
    // Setup tab switching
    setupTabs();
    
    // Check backend connection
    checkBackend();
    
    // Load initial data
    loadInitialData();
    
    // Setup chart
    setupChart();
    
    // Start WiFi auto-detection
    startWifiAutoDetection();
    
    // Auto-refresh every 30 seconds
    setInterval(loadInitialData, 30000);
    
    // Add auto controls to WiFi tab
    setTimeout(() => {
        addAutoControls();
    }, 1000);
    
    // Setup event listeners for advanced features
    setupAdvancedEventListeners();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
});

// ==================== 2. TAB SYSTEM ====================
function setupTabs() {
    const tabButtons = document.querySelectorAll('.nav-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            currentTab = tabId;
            document.getElementById(tabId).classList.add('active');
            
            // Load specific data for tab
            loadTabData(tabId);
        });
    });
}

function loadTabData(tabId) {
    switch(tabId) {
        case 'threats':
            loadThreats();
            break;
        case 'reports':
            showStats();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ==================== 3. BACKEND CONNECTION ====================
async function checkBackend() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const statusElement = document.getElementById('backendStatus');
        
        if (response.ok) {
            statusElement.textContent = 'Connected ✅';
            statusElement.style.color = '#10b981';
            addAlert('Backend connected successfully', 'safe');
        } else {
            statusElement.textContent = 'Error ❌';
            statusElement.style.color = '#ef4444';
            addAlert('Cannot connect to backend', 'danger');
        }
    } catch (error) {
        document.getElementById('backendStatus').textContent = 'Offline ❌';
        document.getElementById('backendStatus').style.color = '#ef4444';
        addAlert('Backend is offline. Please start the server.', 'danger');
    }
}

// ==================== 4. WEBSITE CHECKER ====================
async function checkWebsite() {
    const urlInput = document.getElementById('websiteUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a URL (e.g., https://google.com)');
        urlInput.focus();
        return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }
    
    // Show loading
    const resultBox = document.getElementById('websiteResult');
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-search"></i> Checking website...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/check-website`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        displayWebsiteResult(data);
        
    } catch (error) {
        resultBox.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
        addAlert('Error checking website', 'danger');
    }
}

function displayWebsiteResult(data) {
    const resultBox = document.getElementById('websiteResult');
    
    let resultHTML = `
        <div class="advanced-result">
            <h3><i class="fas fa-globe"></i> Scan Results: ${data.url}</h3>
            
            <div class="score-header ${getScoreClass(data.score)}">
                <div class="main-score">${data.score}/100</div>
                <div class="main-status">${data.status}</div>
            </div>
            
            <div class="verdict-box">
                <h4><i class="fas fa-gavel"></i> Security Verdict:</h4>
                <p>${getSecurityVerdict(data.score)}</p>
            </div>
    `;
    
    if (data.reasons && data.reasons.length > 0) {
        resultHTML += `
            <div class="findings-box">
                <h4><i class="fas fa-clipboard-list"></i> Security Findings (${data.reasons.length}):</h4>
                <ul>
        `;
        
        data.reasons.forEach(reason => {
            resultHTML += `<li><i class="fas fa-circle-small"></i> ${reason}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    if (data.recommendations) {
        resultHTML += `
            <div class="recommendations-box">
                <h4><i class="fas fa-lightbulb"></i> Recommendations:</h4>
                <ul>
        `;
        
        data.recommendations.forEach(rec => {
            resultHTML += `<li><i class="fas fa-check-circle"></i> ${rec}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    resultHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> Scanned at: ${data.timestamp}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    // Add alert and update dashboard
    addAlert(`Website checked: ${data.url} - Score: ${data.score}`, 
             data.score >= 70 ? 'safe' : data.score >= 40 ? 'warning' : 'danger');
    loadInitialData();
}

// ==================== ADVANCED WEBSITE CHECK ====================
async function checkWebsiteAdvanced() {
    const urlInput = document.getElementById('websiteUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a URL for advanced analysis');
        return;
    }
    
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }
    
    const resultBox = document.getElementById('websiteResult');
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-cogs fa-spin"></i> Running advanced analysis with multiple security APIs...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/check-website-advanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            throw new Error(`Advanced check failed: ${response.status}`);
        }
        
        const data = await response.json();
        displayAdvancedWebsiteResult(data);
        
    } catch (error) {
        console.error('Advanced check error:', error);
        resultBox.innerHTML = `
            <div class="error">
                <h3><i class="fas fa-exclamation-triangle"></i> Advanced Check Failed</h3>
                <p>${error.message}</p>
                <p>Try basic check instead:</p>
                <button onclick="checkWebsite()" class="btn-basic">
                    <i class="fas fa-search"></i> Run Basic Check
                </button>
            </div>
        `;
    }
}

function displayAdvancedWebsiteResult(data) {
    const resultBox = document.getElementById('websiteResult');
    
    let resultHTML = `
        <div class="advanced-result">
            <h3><i class="fas fa-search-plus"></i> Advanced Analysis: ${data.domain || data.url}</h3>
            
            <div class="score-header ${data.color || getScoreClass(data.score)}">
                <div class="main-score">${data.score}/100</div>
                <div class="main-status">${data.status}</div>
            </div>
            
            <div class="verdict-box">
                <h4><i class="fas fa-gavel"></i> Final Verdict:</h4>
                <p>${data.verdict || getSecurityVerdict(data.score)}</p>
            </div>
    `;
    
    if (data.api_summary && Object.keys(data.api_summary).length > 0) {
        resultHTML += `
            <div class="api-summary">
                <h4><i class="fas fa-shield-alt"></i> API Analysis Results:</h4>
                <div class="api-grid">
        `;
        
        Object.entries(data.api_summary).forEach(([api, result]) => {
            const icon = result.includes('Clean') || result.includes('Not') ? '✅' : 
                        result.includes('Threats') || result.includes('Phishing') ? '🚨' : '⚠️';
            const resultClass = result.includes('Clean') ? 'safe' : 
                              result.includes('Threats') ? 'danger' : 'warning';
            
            resultHTML += `
                <div class="api-item">
                    <div class="api-name">${api}</div>
                    <div class="api-result ${resultClass}">
                        ${icon} ${result}
                    </div>
                </div>
            `;
        });
        
        resultHTML += '</div></div>';
    }
    
    if (data.reasons && data.reasons.length > 0) {
        resultHTML += `
            <div class="findings-box">
                <h4><i class="fas fa-clipboard-list"></i> Detailed Findings (${data.reasons.length}):</h4>
                <ul>
        `;
        
        data.reasons.slice(0, 10).forEach(reason => {
            resultHTML += `<li><i class="fas fa-circle-small"></i> ${reason}</li>`;
        });
        
        if (data.reasons.length > 10) {
            resultHTML += `<li>... and ${data.reasons.length - 10} more findings</li>`;
        }
        
        resultHTML += '</ul></div>';
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
        resultHTML += `
            <div class="recommendations-box">
                <h4><i class="fas fa-lightbulb"></i> Security Recommendations:</h4>
                <ul>
        `;
        
        data.recommendations.forEach(rec => {
            resultHTML += `<li><i class="fas fa-check-circle"></i> ${rec}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    resultHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> ${data.timestamp} | Advanced Analysis Complete
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    addAlert(`Advanced analysis: ${data.domain} - Score: ${data.score}`, 
             data.score >= 80 ? 'safe' : data.score >= 60 ? 'warning' : 'danger');
    loadInitialData();
}

// ==================== BATCH URL CHECK ====================
async function checkMultipleUrls() {
    const urls = prompt('Enter URLs to check (one per line):\nExample:\nhttps://google.com\nhttps://example.com\nhttps://test.com\n\nMaximum 5 URLs allowed');
    
    if (!urls) return;
    
    const urlList = urls.split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && isValidUrl(url));
    
    if (urlList.length === 0) {
        alert('No valid URLs entered');
        return;
    }
    
    if (urlList.length > 5) {
        alert('Maximum 5 URLs allowed for batch check');
        return;
    }
    
    const resultBox = document.getElementById('websiteResult');
    resultBox.innerHTML = `<div class="loading"><i class="fas fa-list-check"></i> Batch checking ${urlList.length} URLs...</div>`;
    
    try {
        const response = await fetch(`${BACKEND_URL}/batch-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlList })
        });
        
        if (!response.ok) {
            throw new Error(`Batch check failed: ${response.status}`);
        }
        
        const data = await response.json();
        displayBatchResults(data);
        
    } catch (error) {
        console.error('Batch check error:', error);
        resultBox.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Batch check failed: ${error.message}</div>`;
    }
}

function displayBatchResults(data) {
    const resultBox = document.getElementById('websiteResult');
    
    let resultHTML = `
        <div class="batch-result">
            <h3><i class="fas fa-layer-group"></i> Batch URL Analysis</h3>
            <p class="summary">✅ Checked ${data.total_checked || data.results?.length || 0} URLs</p>
            
            <div class="batch-summary">
                <div class="summary-item">
                    <span class="summary-label">Safe URLs:</span>
                    <span class="summary-value safe">${data.safe_count || 0}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Warning URLs:</span>
                    <span class="summary-value warning">${data.warning_count || 0}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Dangerous URLs:</span>
                    <span class="summary-value danger">${data.danger_count || 0}</span>
                </div>
            </div>
            
            <table class="batch-table">
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Domain</th>
                        <th>Score</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (data.results && data.results.length > 0) {
        data.results.forEach(result => {
            const domain = extractDomain(result.url);
            resultHTML += `
                <tr>
                    <td title="${result.url}">${truncateText(result.url, 25)}</td>
                    <td>${domain}</td>
                    <td><span class="score-badge ${getScoreClass(result.score)}">${result.score}</span></td>
                    <td>${result.status}</td>
                </tr>
            `;
        });
    } else {
        resultHTML += `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;">
                    No results available
                </td>
            </tr>
        `;
    }
    
    resultHTML += `
                </tbody>
            </table>
            
            <div class="timestamp">
                <i class="far fa-clock"></i> ${data.timestamp || new Date().toLocaleString()}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    addAlert(`Batch check completed: ${data.total_checked || 0} URLs analyzed`, 'safe');
    loadInitialData();
}

// ==================== CHECK CURRENT TAB ====================
function checkCurrentTab() {
    if (window.location.href.startsWith('http')) {
        document.getElementById('websiteUrl').value = window.location.href;
        checkWebsiteAdvanced();
    } else {
        alert('Cannot check current tab in this context');
    }
}

// ==================== 5. WIFI CHECKER ====================
async function checkWifi() {
    const wifiName = document.getElementById('wifiName').value.trim();
    const encryption = document.getElementById('wifiEncryption').value;
    
    if (!wifiName) {
        alert('Please enter WiFi name');
        return;
    }
    
    const resultBox = document.getElementById('wifiResult');
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-wifi fa-spin"></i> Analyzing WiFi security...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/check-wifi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                wifi_name: wifiName, 
                encryption: encryption 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        displayWifiResult(data);
        
    } catch (error) {
        resultBox.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
        addAlert('Error checking WiFi', 'danger');
    }
}

function displayWifiResult(data) {
    const resultBox = document.getElementById('wifiResult');
    
    let resultHTML = `
        <div class="advanced-result">
            <h3><i class="fas fa-wifi"></i> WiFi Analysis: ${data.wifi_name}</h3>
            
            <div class="score-header ${getScoreClass(data.score)}">
                <div class="main-score">${data.score}/100</div>
                <div class="main-status">${data.encryption || 'Unknown'}</div>
            </div>
            
            <div class="verdict-box">
                <h4><i class="fas fa-shield-alt"></i> Security Assessment:</h4>
                <p>${data.message || getWifiSecurityMessage(data.score, data.encryption)}</p>
            </div>
            
            <div class="wifi-details">
                <h4><i class="fas fa-info-circle"></i> WiFi Details:</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Encryption:</span>
                        <span class="detail-value ${getEncryptionClass(data.encryption)}">${data.encryption || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Security Score:</span>
                        <span class="detail-value ${getScoreClass(data.score)}">${data.score}/100</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Risk Level:</span>
                        <span class="detail-value ${getScoreClass(data.score)}">${getRiskLevel(data.score)}</span>
                    </div>
                </div>
            </div>
    `;
    
    if (data.recommendations && data.recommendations.length > 0) {
        resultHTML += `
            <div class="recommendations-box">
                <h4><i class="fas fa-lightbulb"></i> Security Recommendations:</h4>
                <ul>
        `;
        
        data.recommendations.forEach(rec => {
            resultHTML += `<li><i class="fas fa-check-circle"></i> ${rec}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    resultHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> Analyzed at: ${data.timestamp}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    addAlert(`WiFi checked: ${data.wifi_name} - Score: ${data.score}`, 
             data.score >= 70 ? 'safe' : data.score >= 40 ? 'warning' : 'danger');
    loadInitialData();
}

// ==================== WIFI AUTO-DETECTION SYSTEM ====================
function startWifiAutoDetection() {
    console.log('📡 Starting WiFi auto-detection...');
    
    // Stop any existing interval
    if (wifiDetectionInterval) {
        clearInterval(wifiDetectionInterval);
    }
    
    // Start new interval (every 30 seconds)
    wifiDetectionInterval = setInterval(autoDetectAndCheckWifi, 30000);
    
    // Also run once immediately
    setTimeout(autoDetectAndCheckWifi, 2000);
    
    addAlert('WiFi auto-detection started (30s interval)', 'safe');
}

function stopWifiAutoDetection() {
    if (wifiDetectionInterval) {
        clearInterval(wifiDetectionInterval);
        wifiDetectionInterval = null;
        addAlert('WiFi auto-detection stopped', 'warning');
    }
}

async function autoDetectAndCheckWifi() {
    console.log('🔍 Auto-detecting WiFi networks...');
    
    try {
        const wifiList = await detectAvailableWifis();
        
        // Check each WiFi
        for (const wifi of wifiList) {
            // Skip if already detected
            if (detectedWifis.has(wifi.name)) {
                continue;
            }
            
            // Mark as detected
            detectedWifis.add(wifi.name);
            
            // Auto-check this WiFi
            await autoCheckWifi(wifi.name, wifi.encryption);
            
            // Add delay between checks
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('❌ Auto WiFi detection error:', error);
    }
}

async function detectAvailableWifis() {
    try {
        // Try to get real WiFi info if available (for browser extensions)
        if (navigator.connection) {
            const connection = navigator.connection;
            return [{
                name: connection.effectiveType || 'Unknown',
                encryption: 'WPA2', // Default assumption
                signal: 85 // Simulated signal strength
            }];
        }
        
        // Fallback to simulation
        return generateRandomWifiList();
        
    } catch (error) {
        console.error('WiFi detection failed:', error);
        return generateRandomWifiList();
    }
}

function generateRandomWifiList() {
    const wifiNames = [
        'Home-WiFi', 'Office-Network', 'Public-WiFi', 'Guest-Network',
        'AndroidAP', 'iPhone Hotspot', 'TP-Link_2G', 'DLink-Router',
        'Cafe-Free-WiFi', 'Hotel-Guest', 'Airport-Free', 'Mall-WiFi'
    ];
    
    const encryptions = ['WPA2', 'WPA3', 'WPA', 'WEP', 'NONE'];
    
    // Generate 1-3 random WiFi networks
    const count = Math.floor(Math.random() * 3) + 1;
    const wifiList = [];
    
    for (let i = 0; i < count; i++) {
        const randomName = wifiNames[Math.floor(Math.random() * wifiNames.length)];
        const randomEncryption = encryptions[Math.floor(Math.random() * encryptions.length)];
        
        wifiList.push({
            name: randomName,
            encryption: randomEncryption,
            signal: Math.floor(Math.random() * 100) + 1
        });
    }
    
    return wifiList;
}

async function autoCheckWifi(wifiName, encryption) {
    try {
        console.log(`📶 Auto-checking WiFi: ${wifiName} (${encryption})`);
        
        const response = await fetch(`${BACKEND_URL}/check-wifi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                wifi_name: wifiName, 
                encryption: encryption 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add alert for auto-detected WiFi
        addAlert(`Auto-detected WiFi: ${wifiName} - Score: ${data.score}`, 
                 data.score >= 70 ? 'safe' : data.score >= 40 ? 'warning' : 'danger');
        
        // Update WiFi input fields if user is on WiFi tab
        updateWifiFields(wifiName, encryption);
        
        // Refresh data
        loadInitialData();
        
    } catch (error) {
        console.error(`❌ Auto-check failed for ${wifiName}:`, error);
    }
}

function updateWifiFields(name, encryption) {
    if (currentTab === 'wifi') {
        document.getElementById('wifiName').value = name;
        document.getElementById('wifiEncryption').value = encryption;
    }
}

// ==================== MANUAL WIFI DETECTION ====================
function detectWifi() {
    const wifiList = generateRandomWifiList();
    
    if (wifiList.length > 0) {
        const wifi = wifiList[0];
        document.getElementById('wifiName').value = wifi.name;
        document.getElementById('wifiEncryption').value = wifi.encryption;
        
        addAlert(`Detected WiFi: ${wifi.name} (${wifi.encryption}) - Signal: ${wifi.signal}%`, 'safe');
        
        // Auto-check this WiFi
        autoCheckWifi(wifi.name, wifi.encryption);
    }
}

// ==================== 6. EMAIL CHECKER ====================
async function checkEmail() {
    const sender = document.getElementById('emailSender').value.trim();
    const emailText = document.getElementById('emailText').value.trim();
    
    if (!sender || !emailText) {
        alert('Please fill both sender email and email content');
        return;
    }
    
    if (!isValidEmail(sender)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const resultBox = document.getElementById('emailResult');
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-envelope fa-spin"></i> Analyzing email for phishing signs...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sender: sender,
                email_text: emailText 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        displayEmailResult(data);
        
    } catch (error) {
        resultBox.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
        addAlert('Error checking email', 'danger');
    }
}

function displayEmailResult(data) {
    const resultBox = document.getElementById('emailResult');
    
    let resultHTML = `
        <div class="advanced-email-result">
            <h3><i class="fas fa-envelope"></i> Email Analysis: ${data.sender}</h3>
            
            <div class="email-score-header ${getScoreClass(data.score)}">
                <div class="email-main-score">${data.score}/100</div>
                <div class="email-risk-level">${getRiskLevel(data.score)} Risk</div>
                <div class="email-status">${data.status}</div>
            </div>
            
            <div class="sender-analysis">
                <h4><i class="fas fa-user"></i> Sender Analysis:</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">Sender Email:</span>
                        <span class="analysis-value">${data.sender}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Phishing Signs:</span>
                        <span class="analysis-value ${data.total_signs > 0 ? 'danger' : 'safe'}">${data.total_signs}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Overall Score:</span>
                        <span class="analysis-value ${getScoreClass(data.score)}">${data.score}/100</span>
                    </div>
                </div>
            </div>
    `;
    
    if (data.phishing_signs && data.phishing_signs.length > 0) {
        resultHTML += `
            <div class="phishing-findings">
                <h4><i class="fas fa-exclamation-triangle"></i> Phishing Indicators (${data.total_signs}):</h4>
                <ul>
        `;
        
        data.phishing_signs.forEach(sign => {
            resultHTML += `<li><i class="fas fa-exclamation-circle"></i> ${sign}</li>`;
        });
        
        resultHTML += '</ul></div>';
    } else {
        resultHTML += `
            <div class="safe-findings">
                <h4><i class="fas fa-check-circle"></i> Security Assessment:</h4>
                <p class="safe-message">✅ No phishing signs detected. This email appears to be safe.</p>
            </div>
        `;
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
        resultHTML += `
            <div class="email-recommendations">
                <h4><i class="fas fa-shield-alt"></i> Recommendations:</h4>
                <ul>
        `;
        
        data.recommendations.forEach(rec => {
            resultHTML += `<li><i class="fas fa-check-circle"></i> ${rec}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    resultHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> Analyzed at: ${data.timestamp}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    addAlert(`Email checked: ${data.sender} - ${data.status}`, 
             data.score >= 70 ? 'safe' : data.score >= 40 ? 'warning' : 'danger');
    loadInitialData();
}

// ==================== ADVANCED EMAIL CHECK ====================
async function checkEmailAdvanced() {
    const sender = document.getElementById('emailSender').value.trim();
    const emailText = document.getElementById('emailText').value.trim();
    
    if (!sender || !emailText) {
        alert('Please enter both sender and email content');
        return;
    }
    
    if (!isValidEmail(sender)) {
        alert('Please enter a valid email address');
        return;
    }
    
    const resultBox = document.getElementById('emailResult');
    resultBox.innerHTML = '<div class="loading"><i class="fas fa-envelope-open-text fa-spin"></i> Advanced email analysis in progress...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/check-email-advanced`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sender: sender,
                email_text: emailText 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Advanced email check failed: ${response.status}`);
        }
        
        const data = await response.json();
        displayAdvancedEmailResult(data);
        
    } catch (error) {
        console.error('Advanced email check error:', error);
        resultBox.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Advanced check failed: ${error.message}</div>`;
    }
}

function displayAdvancedEmailResult(data) {
    const resultBox = document.getElementById('emailResult');
    
    let resultHTML = `
        <div class="advanced-email-result">
            <h3><i class="fas fa-mail-bulk"></i> Advanced Email Analysis</h3>
            
            <div class="email-score-header ${getScoreClass(data.score)}">
                <div class="email-main-score">${data.score}/100</div>
                <div class="email-risk-level">${data.risk_level || getRiskLevel(data.score)} Risk</div>
                <div class="email-status">${data.status}</div>
            </div>
            
            <div class="sender-analysis">
                <h4><i class="fas fa-user-secret"></i> Sender Analysis:</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="analysis-label">Sender:</span>
                        <span class="analysis-value">${data.sender}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Domain Reputation:</span>
                        <span class="analysis-value ${data.domain_reputation || 'unknown'}">${data.domain_reputation || 'Unknown'}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Links Found:</span>
                        <span class="analysis-value">${data.links_found || 0}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Suspicious Keywords:</span>
                        <span class="analysis-value ${(data.suspicious_keywords || 0) > 0 ? 'danger' : 'safe'}">${data.suspicious_keywords || 0}</span>
                    </div>
                </div>
            </div>
    `;
    
    if (data.phishing_signs && data.phishing_signs.length > 0) {
        resultHTML += `
            <div class="phishing-findings">
                <h4><i class="fas fa-exclamation-triangle"></i> Phishing Indicators (${data.total_signs}):</h4>
                <ul>
        `;
        
        data.phishing_signs.forEach(sign => {
            resultHTML += `<li><i class="fas fa-exclamation-circle"></i> ${sign}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    if (data.technical_analysis && data.technical_analysis.length > 0) {
        resultHTML += `
            <div class="technical-findings">
                <h4><i class="fas fa-microscope"></i> Technical Analysis:</h4>
                <ul>
        `;
        
        data.technical_analysis.forEach(item => {
            resultHTML += `<li><i class="fas fa-code"></i> ${item}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
        resultHTML += `
            <div class="email-recommendations">
                <h4><i class="fas fa-shield-alt"></i> Security Recommendations:</h4>
                <ul>
        `;
        
        data.recommendations.forEach(rec => {
            resultHTML += `<li><i class="fas fa-check-circle"></i> ${rec}</li>`;
        });
        
        resultHTML += '</ul></div>';
    }
    
    resultHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> ${data.timestamp}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = resultHTML;
    
    addAlert(`Advanced email analysis: ${data.sender} - ${data.status}`, 
             data.score >= 80 ? 'safe' : data.score >= 60 ? 'warning' : 'danger');
    loadInitialData();
}

// ==================== 7. THREAT HISTORY ====================
async function loadThreats() {
    try {
        const response = await fetch(`${BACKEND_URL}/get-threats`);
        
        if (!response.ok) {
            throw new Error(`Failed to load threats: ${response.status}`);
        }
        
        const data = await response.json();
        displayThreats(data);
        
    } catch (error) {
        console.error('Error loading threats:', error);
        addAlert('Error loading threats: ' + error.message, 'danger');
    }
}

function displayThreats(data) {
    const tableBody = document.getElementById('threatsBody');
    tableBody.innerHTML = '';
    
    if (data.threats && data.threats.length > 0) {
        // Sort by timestamp (newest first)
        data.threats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        data.threats.forEach(threat => {
            const row = document.createElement('tr');
            
            // Format time
            let time = 'Just now';
            try {
                const date = new Date(threat.timestamp);
                time = date.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            } catch (e) {
                time = threat.timestamp || 'Unknown';
            }
            
            const scoreClass = getScoreClass(threat.score);
            const status = getThreatStatus(threat.score);
            const typeIcon = getThreatTypeIcon(threat.type);
            
            row.innerHTML = `
                <td>${time}</td>
                <td>
                    <span class="type-badge ${threat.type.toLowerCase()}">
                        <i class="${typeIcon}"></i> ${threat.type}
                    </span>
                </td>
                <td title="${threat.source}">
                    <div class="source-cell">
                        ${truncateText(threat.source, 25)}
                    </div>
                </td>
                <td>
                    <span class="score-badge ${scoreClass}">
                        ${threat.score}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${scoreClass}">
                        ${status}
                    </span>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Update total threats in dashboard
        document.getElementById('totalThreats').textContent = data.threats.length;
        
        // Update chart
        updateChart(data.threats);
        
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-threats">
                    <div class="empty-state">
                        <i class="fas fa-shield-check"></i>
                        <h4>No threats detected yet</h4>
                        <p>Start scanning websites, WiFi, and emails to see threats here</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('totalThreats').textContent = '0';
    }
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all threat history? This action cannot be undone.')) {
        addAlert('History cleared (demo only)', 'warning');
        document.getElementById('threatsBody').innerHTML = '';
        document.getElementById('totalThreats').textContent = '0';
        
        // Update chart
        if (threatsChart) {
            threatsChart.data.datasets[0].data = [0, 0, 0];
            threatsChart.update();
        }
    }
}

// ==================== 8. REPORTS & STATS ====================
async function showStats() {
    try {
        const response = await fetch(`${BACKEND_URL}/stats`);
        
        if (!response.ok) {
            throw new Error(`Failed to load stats: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update dashboard
        updateDashboard(data);
        
        // Display detailed stats in reports tab
        displayDetailedStats(data);
        
        addAlert('Statistics loaded', 'safe');
        
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('statsDisplay').innerHTML = 
            `<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
    }
}

function displayDetailedStats(data) {
    const statsDisplay = document.getElementById('statsDisplay');
    
    let statsHTML = `
        <div class="stats-container">
            <h3><i class="fas fa-chart-bar"></i> System Statistics</h3>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h4>Total Threats</h4>
                    <div class="stat-value">${data.total_threats || 0}</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h4>Average Score</h4>
                    <div class="stat-value">${data.average_score ? data.average_score.toFixed(1) : 0}</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-server"></i>
                    </div>
                    <h4>System Status</h4>
                    <div class="stat-value safe">${data.system_status || 'Active'}</div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h4>Last Updated</h4>
                    <div class="stat-value">${data.last_updated || 'Just now'}</div>
                </div>
            </div>
    `;
    
    // Threats by Type
    if (data.threats_by_type && Object.keys(data.threats_by_type).length > 0) {
        statsHTML += `
            <div class="threats-by-type">
                <h4><i class="fas fa-layer-group"></i> Threats by Type:</h4>
                <div class="type-distribution">
        `;
        
        Object.entries(data.threats_by_type).forEach(([type, count]) => {
            const percentage = data.total_threats > 0 
                ? Math.round((count / data.total_threats) * 100) 
                : 0;
            
            statsHTML += `
                <div class="type-dist-item">
                    <div class="type-name">
                        <i class="${getThreatTypeIcon(type)}"></i> ${type}
                    </div>
                    <div class="type-bar">
                        <div class="type-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="type-count">${count} (${percentage}%)</div>
                </div>
            `;
        });
        
        statsHTML += '</div></div>';
    }
    
    // Risk Distribution
    if (data.risk_distribution) {
        statsHTML += `
            <div class="risk-distribution">
                <h4><i class="fas fa-exclamation-triangle"></i> Risk Distribution:</h4>
                <div class="risk-grid">
        `;
        
        const risks = [
            { label: 'Safe', class: 'safe', count: data.risk_distribution.safe || 0 },
            { label: 'Warning', class: 'warning', count: data.risk_distribution.warning || 0 },
            { label: 'Danger', class: 'danger', count: data.risk_distribution.danger || 0 }
        ];
        
        risks.forEach(risk => {
            statsHTML += `
                <div class="risk-item ${risk.class}">
                    <div class="risk-label">${risk.label}</div>
                    <div class="risk-count">${risk.count}</div>
                </div>
            `;
        });
        
        statsHTML += '</div></div>';
    }
    
    statsHTML += `
            <div class="timestamp">
                <i class="far fa-clock"></i> Statistics generated: ${new Date().toLocaleString()}
            </div>
        </div>
    `;
    
    statsDisplay.innerHTML = statsHTML;
}

// ==================== REPORT GENERATION ====================
async function generateReport() {
    try {
        addAlert('Generating security report...', 'warning');
        
        // Get all threats
        const response = await fetch(`${BACKEND_URL}/get-threats`);
        const data = await response.json();
        
        if (!data.success || !data.threats) {
            throw new Error('Failed to get threats data');
        }
        
        // Create comprehensive report
        const reportData = {
            title: 'SafeSurf AI Security Report',
            generated: new Date().toLocaleString(),
            total_threats: data.count || 0,
            threats: data.threats || [],
            summary: generateReportSummary(data.threats)
        };
        
        // Create HTML report
        const htmlContent = createReportHTML(reportData);
        
        // Download as HTML file
        downloadFile(htmlContent, `SafeSurf_Report_${new Date().toISOString().slice(0,10)}.html`, 'text/html');
        
        addAlert(`Report generated with ${reportData.total_threats} threats`, 'safe');
        
    } catch (error) {
        console.error('❌ Error generating report:', error);
        addAlert('Error generating report: ' + error.message, 'danger');
    }
}

function generateReportSummary(threats) {
    const summary = {
        safe: 0,
        warning: 0,
        danger: 0,
        byType: {}
    };
    
    threats.forEach(threat => {
        if (threat.score >= 70) summary.safe++;
        else if (threat.score >= 40) summary.warning++;
        else summary.danger++;
        
        if (!summary.byType[threat.type]) {
            summary.byType[threat.type] = 0;
        }
        summary.byType[threat.type]++;
    });
    
    return summary;
}

function createReportHTML(reportData) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportData.title}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f8fafc; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
                h1 { margin: 0; font-size: 2.5rem; }
                .subtitle { opacity: 0.9; margin-top: 10px; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
                .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                .summary-card.safe { border-top: 4px solid #10b981; }
                .summary-card.warning { border-top: 4px solid #f59e0b; }
                .summary-card.danger { border-top: 4px solid #ef4444; }
                .summary-value { font-size: 2.5rem; font-weight: bold; margin: 10px 0; }
                table { width: 100%; background: white; border-collapse: collapse; margin: 20px 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                th { background: #3b82f6; color: white; padding: 15px; text-align: left; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
                tr:hover { background: #f1f5f9; }
                .safe { color: #10b981; }
                .warning { color: #f59e0b; }
                .danger { color: #ef4444; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #3b82f6; color: #64748b; }
                .logo { font-size: 1.2rem; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${reportData.title}</h1>
                <div class="subtitle">Generated: ${reportData.generated} | Total Threats: ${reportData.total_threats}</div>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card safe">
                    <h3>Safe</h3>
                    <div class="summary-value">${reportData.summary.safe}</div>
                    <p>No immediate threats</p>
                </div>
                <div class="summary-card warning">
                    <h3>Warning</h3>
                    <div class="summary-value">${reportData.summary.warning}</div>
                    <p>Requires attention</p>
                </div>
                <div class="summary-card danger">
                    <h3>Danger</h3>
                    <div class="summary-value">${reportData.summary.danger}</div>
                    <p>Immediate action needed</p>
                </div>
            </div>
            
            <h2>📋 Threat Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Source</th>
                        <th>Score</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.threats.map(threat => `
                        <tr>
                            <td>${threat.timestamp}</td>
                            <td>${threat.type}</td>
                            <td>${threat.source.substring(0, 50)}${threat.source.length > 50 ? '...' : ''}</td>
                            <td class="${getScoreClass(threat.score)}"><strong>${threat.score}/100</strong></td>
                            <td class="${getScoreClass(threat.score)}">${getThreatStatus(threat.score)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h2>📈 Security Recommendations</h2>
            <ul>
                <li>Always verify SSL certificates before entering sensitive information</li>
                <li>Use WPA2 or WPA3 encryption for all WiFi networks</li>
                <li>Enable two-factor authentication wherever possible</li>
                <li>Regularly update your security software</li>
                <li>Be cautious of unsolicited emails asking for personal information</li>
            </ul>
            
            <div class="footer">
                <div class="logo">SafeSurf AI Security System</div>
                <p><strong>Developers:</strong> Hamid Ali, Abdul Rehman, Haider Ali</p>
                <p><strong>University:</strong> M.U.S.T</p>
                <p><strong>Note:</strong> This report is for security analysis purposes only.</p>
            </div>
        </body>
        </html>
    `;
}

// ==================== CSV EXPORT ====================
async function exportCSV() {
    try {
        addAlert('Exporting data to CSV...', 'warning');
        
        // Get all threats
        const response = await fetch(`${BACKEND_URL}/get-threats`);
        const data = await response.json();
        
        if (!data.success || !data.threats) {
            throw new Error('Failed to get threats data');
        }
        
        // Create CSV content
        let csvContent = 'Timestamp,Type,Source,Score,Status,Message\n';
        
        data.threats.forEach(threat => {
            const status = getThreatStatus(threat.score);
            const escapedSource = `"${(threat.source || '').replace(/"/g, '""')}"`;
            const escapedMessage = `"${(threat.message || '').replace(/"/g, '""')}"`;
            
            csvContent += `${threat.timestamp},${threat.type},${escapedSource},${threat.score},${status},${escapedMessage}\n`;
        });
        
        // Download CSV file
        downloadFile(csvContent, `SafeSurf_Threats_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
        
        addAlert(`CSV exported with ${data.threats.length} records`, 'safe');
        
    } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        addAlert('Error exporting CSV: ' + error.message, 'danger');
    }
}

// ==================== API STATUS CHECK ====================
async function checkApiStatus() {
    try {
        const resultBox = document.getElementById('websiteResult');
        resultBox.innerHTML = '<div class="loading"><i class="fas fa-plug fa-spin"></i> Checking API status...</div>';
        
        const response = await fetch(`${BACKEND_URL}/api-status`);
        
        if (!response.ok) {
            throw new Error(`API status check failed: ${response.status}`);
        }
        
        const data = await response.json();
        displayApiStatus(data);
        
    } catch (error) {
        console.error('API status check error:', error);
        document.getElementById('websiteResult').innerHTML = `
            <div class="error">
                <h3><i class="fas fa-exclamation-triangle"></i> API Status Check Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displayApiStatus(data) {
    const resultBox = document.getElementById('websiteResult');
    
    let statusHTML = `
        <div class="api-status">
            <h3><i class="fas fa-plug"></i> API Status Dashboard</h3>
            <p class="status-summary">Total Active APIs: ${data.total_apis || 0}/4</p>
            
            <div class="status-grid">
    `;
    
    const apis = [
        { name: 'Google Safe Browsing', key: 'google_safe_browsing', icon: 'fab fa-google' },
        { name: 'VirusTotal', key: 'virustotal', icon: 'fas fa-virus' },
        { name: 'OpenPhish', key: 'openphish', icon: 'fas fa-fish' },
        { name: 'AbuseIPDB', key: 'abuseipdb', icon: 'fas fa-ban' }
    ];
    
    apis.forEach(api => {
        const isActive = data[api.key];
        statusHTML += `
            <div class="status-item ${isActive ? 'active' : 'inactive'}">
                <div class="status-icon">
                    <i class="${api.icon}"></i>
                </div>
                <div class="status-name">${api.name}</div>
                <div class="status-indicator">
                    ${isActive ? '✅ ACTIVE' : '❌ INACTIVE'}
                </div>
            </div>
        `;
    });
    
    statusHTML += `
            </div>
            
            <div class="server-info">
                <h4><i class="fas fa-server"></i> Server Information:</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Server Time:</span>
                        <span class="info-value">${data.server_time || new Date().toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Backend Status:</span>
                        <span class="info-value safe">✅ Running</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Response Time:</span>
                        <span class="info-value">${data.response_time || '< 100ms'}</span>
                    </div>
                </div>
            </div>
            
            <div class="timestamp">
                <i class="far fa-clock"></i> Status checked: ${new Date().toLocaleString()}
            </div>
        </div>
    `;
    
    resultBox.innerHTML = statusHTML;
    
    addAlert('API status checked successfully', 'safe');
}

// ==================== DASHBOARD FUNCTIONS ====================
function updateDashboard(stats) {
    // Update total threats
    document.getElementById('totalThreats').textContent = stats.total_threats || 0;
    
    // Update overall score
    const avgScore = stats.average_score || 0;
    document.getElementById('overallScore').textContent = Math.round(avgScore);
    document.getElementById('overallScore').className = getScoreClass(avgScore) + ' big-number';
    
    // Update website score
    const websiteScore = stats.website_avg_score || 0;
    const websiteScoreElement = document.getElementById('websiteScore');
    websiteScoreElement.textContent = websiteScore > 0 ? Math.round(websiteScore) + '%' : '0%';
    websiteScoreElement.className = getScoreClass(websiteScore) + ' big-number';
    
    // Update WiFi score
    const wifiScore = stats.wifi_avg_score || 0;
    const wifiScoreElement = document.getElementById('wifiScore');
    wifiScoreElement.textContent = wifiScore > 0 ? Math.round(wifiScore) + '%' : '0%';
    wifiScoreElement.className = getScoreClass(wifiScore) + ' big-number';
    
    // Update email score
    const emailScore = stats.email_avg_score || 0;
    const emailScoreElement = document.getElementById('emailScore');
    emailScoreElement.textContent = emailScore > 0 ? Math.round(emailScore) + '%' : '0%';
    emailScoreElement.className = getScoreClass(emailScore) + ' big-number';
    
    // Update last update time
    document.getElementById('lastUpdate').textContent = 
        stats.last_updated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Update score circle
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) {
        const safePercentage = Math.min(100, Math.max(0, avgScore));
        scoreCircle.style.background = 
            `conic-gradient(#10b981 0% ${safePercentage}%, #f59e0b ${safePercentage}% ${Math.min(100, safePercentage + 30)}%, #ef4444 ${Math.min(100, safePercentage + 30)}% 100%)`;
    }
    
    // Update threat chart
    if (threatsChart && stats.risk_distribution) {
        threatsChart.data.datasets[0].data = [
            stats.risk_distribution.safe || 0,
            stats.risk_distribution.warning || 0,
            stats.risk_distribution.danger || 0
        ];
        threatsChart.update();
    }
}

// ==================== CHART SYSTEM ====================
function setupChart() {
    const ctx = document.getElementById('threatChart').getContext('2d');
    
    threatsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Safe', 'Warning', 'Danger'],
            datasets: [{
                data: [70, 20, 10],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: '#1e293b',
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        padding: 20,
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#475569',
                    borderWidth: 1,
                    cornerRadius: 6
                }
            },
            cutout: '65%'
        }
    });
}

function updateChart(threats) {
    if (!threatsChart || !threats) return;
    
    const safeCount = threats.filter(t => t.score >= 70).length;
    const warningCount = threats.filter(t => t.score >= 40 && t.score < 70).length;
    const dangerCount = threats.filter(t => t.score < 40).length;
    
    threatsChart.data.datasets[0].data = [safeCount, warningCount, dangerCount];
    threatsChart.update();
}

// ==================== ALERT SYSTEM ====================
function addAlert(message, type = 'safe') {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    
    const time = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    const alertId = 'alert-' + Date.now();
    const alertDiv = document.createElement('div');
    alertDiv.id = alertId;
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <div class="alert-icon">
            <i class="fas ${getAlertIcon(type)}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-message">${message}</div>
            <div class="alert-time">${time}</div>
        </div>
        <button class="alert-close" onclick="removeAlert('${alertId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to top
    alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
    
    // Keep only last 15 alerts
    while (alertsContainer.children.length > 15) {
        alertsContainer.removeChild(alertsContainer.lastChild);
    }
    
    // Auto-remove after 8 seconds (except danger alerts)
    if (type !== 'danger') {
        setTimeout(() => {
            removeAlert(alertId);
        }, 8000);
    }
    
    // Play sound for important alerts
     // Play sound for important alerts
    if (type === 'danger') {
        playAlertSound('danger');
    } else if (type === 'warning') {
        playAlertSound('warning');
    } else if (type === 'safe') {      // ← YEH LINE ADD KARO
        playAlertSound('safe');         // ← YEH LINE ADD KARO
    }
}

function removeAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.style.transform = 'translateX(-100%)';
        alert.style.opacity = '0';
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 300);
    }
}

function clearAllAlerts() {
    const alertsContainer = document.getElementById('alertsContainer');
    if (alertsContainer) {
        alertsContainer.innerHTML = '';
        addAlert('All alerts cleared', 'warning');
    }
}

// ==================== AUTO-CONTROLS ====================
function toggleAutoDetection() {
    const btn = document.getElementById('autoDetectBtn');
    
    if (wifiDetectionInterval) {
        stopWifiAutoDetection();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> Start Auto Detection';
            btn.style.background = '#10b981';
        }
    } else {
        startWifiAutoDetection();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-stop"></i> Stop Auto Detection';
            btn.style.background = '#ef4444';
        }
    }
}

function scanNow() {
    addAlert('Manual WiFi scan started...', 'warning');
    autoDetectAndCheckWifi();
}

function addAutoControls() {
    const wifiTab = document.getElementById('wifi');
    if (!wifiTab) return;
    
    const checkerBox = wifiTab.querySelector('.checker-box');
    if (!checkerBox) return;
    
    if (!checkerBox.querySelector('.auto-controls')) {
        const autoControls = document.createElement('div');
        autoControls.className = 'auto-controls';
        autoControls.innerHTML = `
            <h4><i class="fas fa-robot"></i> Auto Detection System</h4>
            <div class="auto-controls-buttons">
                <button id="autoDetectBtn" onclick="toggleAutoDetection()" class="btn-auto">
                    <i class="fas fa-play"></i> Start Auto Detection
                </button>
                <button onclick="scanNow()" class="btn-auto secondary">
                    <i class="fas fa-sync"></i> Scan Now
                </button>
                <button onclick="detectWifi()" class="btn-auto secondary">
                    <i class="fas fa-wifi"></i> Detect WiFi
                </button>
            </div>
            <p class="auto-controls-info">
                <i class="fas fa-info-circle"></i> Auto-detection runs every 30 seconds. 
                Detected WiFi networks will be automatically analyzed.
            </p>
        `;
        
        checkerBox.appendChild(autoControls);
    }
}

// ==================== SETTINGS ====================
function loadSettings() {
    const settingsContent = `
        <div class="settings-container">
            <h3><i class="fas fa-cog"></i> Settings</h3>
            
            <div class="settings-section">
                <h4><i class="fas fa-bell"></i> Alert Preferences</h4>
                <div class="settings-item">
                    <label>
                        <input type="checkbox" id="soundAlerts" checked>
                        Enable sound alerts
                    </label>
                </div>
                <div class="settings-item">
                    <label>
                        <input type="checkbox" id="desktopNotifications" checked>
                        Desktop notifications
                    </label>
                </div>
                <div class="settings-item">
                    <label>
                        Auto-clear alerts after:
                        <select id="alertTimeout">
                            <option value="5000">5 seconds</option>
                            <option value="8000" selected>8 seconds</option>
                            <option value="10000">10 seconds</option>
                            <option value="15000">15 seconds</option>
                        </select>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h4><i class="fas fa-wifi"></i> WiFi Settings</h4>
                <div class="settings-item">
                    <label>
                        Auto WiFi detection interval:
                        <select id="wifiInterval">
                            <option value="15000">15 seconds</option>
                            <option value="30000" selected>30 seconds</option>
                            <option value="60000">1 minute</option>
                            <option value="300000">5 minutes</option>
                        </select>
                    </label>
                </div>
                <div class="settings-item">
                    <label>
                        <input type="checkbox" id="autoCheckWifi" checked>
                        Automatically check detected WiFi
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h4><i class="fas fa-chart-line"></i> Display Settings</h4>
                <div class="settings-item">
                    <label>
                        Theme:
                        <select id="themeSelect">
                            <option value="dark">Dark (Default)</option>
                            <option value="light">Light</option>
                            <option value="blue">Blue</option>
                        </select>
                    </label>
                </div>
                <div class="settings-item">
                    <label>
                        <input type="checkbox" id="animations" checked>
                        Enable animations
                    </label>
                </div>
            </div>
            
            <div class="settings-buttons">
                <button onclick="saveSettings()" class="btn-save">
                    <i class="fas fa-save"></i> Save Settings
                </button>
                <button onclick="resetSettings()" class="btn-reset">
                    <i class="fas fa-undo"></i> Reset to Default
                </button>
            </div>
        </div>
    `;
    
    const settingsTab = document.getElementById('settings');
    if (settingsTab) {
        settingsTab.innerHTML = settingsContent;
        loadSavedSettings();
    }
}

function saveSettings() {
    const settings = {
        soundAlerts: document.getElementById('soundAlerts').checked,
        desktopNotifications: document.getElementById('desktopNotifications').checked,
        alertTimeout: document.getElementById('alertTimeout').value,
        wifiInterval: document.getElementById('wifiInterval').value,
        autoCheckWifi: document.getElementById('autoCheckWifi').checked,
        theme: document.getElementById('themeSelect').value,
        animations: document.getElementById('animations').checked
    };
    
    localStorage.setItem('safesurf_settings', JSON.stringify(settings));
    addAlert('Settings saved successfully', 'safe');
    
    // Apply theme
    applyTheme(settings.theme);
}

function loadSavedSettings() {
    const saved = localStorage.getItem('safesurf_settings');
    if (saved) {
        const settings = JSON.parse(saved);
        
        if (document.getElementById('soundAlerts')) {
            document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;
            document.getElementById('desktopNotifications').checked = settings.desktopNotifications !== false;
            document.getElementById('alertTimeout').value = settings.alertTimeout || '8000';
            document.getElementById('wifiInterval').value = settings.wifiInterval || '30000';
            document.getElementById('autoCheckWifi').checked = settings.autoCheckWifi !== false;
            document.getElementById('themeSelect').value = settings.theme || 'dark';
            document.getElementById('animations').checked = settings.animations !== false;
        }
        
        applyTheme(settings.theme || 'dark');
    }
}

function resetSettings() {
    if (confirm('Reset all settings to default?')) {
        localStorage.removeItem('safesurf_settings');
        loadSavedSettings();
        addAlert('Settings reset to default', 'warning');
    }
}

function applyTheme(theme) {
    document.body.className = theme + '-theme';
}

// ==================== UTILITY FUNCTIONS ====================
function getScoreClass(score) {
    if (score >= 70) return 'safe';
    if (score >= 40) return 'warning';
    return 'danger';
}

function getSecurityVerdict(score) {
    if (score >= 90) return 'Excellent security. This resource is highly secure.';
    if (score >= 70) return 'Good security. This resource is generally safe.';
    if (score >= 40) return 'Moderate security. Exercise caution.';
    if (score >= 20) return 'Poor security. Significant risks detected.';
    return 'Critical security risk. Avoid this resource.';
}

function getWifiSecurityMessage(score, encryption) {
    if (encryption === 'WPA3') return 'Excellent security with WPA3 encryption.';
    if (encryption === 'WPA2') {
        if (score >= 80) return 'Strong security with WPA2 encryption.';
        return 'Good security with WPA2 encryption.';
    }
    if (encryption === 'WPA') return 'Adequate security with WPA encryption. Consider upgrading.';
    if (encryption === 'WEP') return 'Weak security with outdated WEP encryption. Upgrade immediately.';
    if (encryption === 'NONE') return 'No encryption detected. This network is highly insecure.';
    return `Security score: ${score}/100. ${getSecurityVerdict(score)}`;
}

function getRiskLevel(score) {
    if (score >= 70) return 'Low';
    if (score >= 40) return 'Medium';
    return 'High';
}

function getThreatStatus(score) {
    if (score >= 70) return '✅ Safe';
    if (score >= 40) return '⚠️ Warning';
    return '🚨 Danger';
}

function getThreatTypeIcon(type) {
    switch(type.toLowerCase()) {
        case 'website': return 'fas fa-globe';
        case 'wifi': return 'fas fa-wifi';
        case 'email': return 'fas fa-envelope';
        default: return 'fas fa-shield-alt';
    }
}

function getAlertIcon(type) {
    switch(type) {
        case 'safe': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'danger': return 'fa-exclamation-circle';
        default: return 'fa-info-circle';
    }
}

function getEncryptionClass(encryption) {
    switch(encryption) {
        case 'WPA3': return 'safe';
        case 'WPA2': return 'safe';
        case 'WPA': return 'warning';
        case 'WEP': return 'danger';
        case 'NONE': return 'danger';
        default: return 'warning';
    }
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (_) {
        return url.substring(0, 20);
    }
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function playAlertSound(type) {
    if (!document.getElementById('soundAlerts')?.checked) return;
    
    const audio = new Audio();
    switch(type) {
        case 'danger':
            audio.src ='http://127.0.0.1:5000/sounds/Danger.mp3';
            break;
        case 'warning':
            audio.src = 'http://127.0.0.1:5000/sounds/Warning.mp3';
            audio.volume = 0.3;
            break;
        case 'safe':
            audio.src = 'http://127.0.0.1:5000/sounds/Safe.mp3';
            audio.volume = 0.2;
            break;
    }
    audio.play().catch(() => {});
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// ==================== EVENT LISTENERS ====================
function setupAdvancedEventListeners() {
    // Enter key support for inputs
    document.getElementById('websiteUrl')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkWebsite();
    });
    
    document.getElementById('wifiName')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkWifi();
    });
    
    document.getElementById('emailSender')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkEmail();
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl + Shift + C: Check current tab
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            checkCurrentTab();
        }
        
        // Ctrl + Shift + S: Show stats
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            const reportsBtn = document.querySelector('[data-tab="reports"]');
            if (reportsBtn) reportsBtn.click();
        }
        
        // Ctrl + Shift + A: Clear alerts
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            clearAllAlerts();
        }
    });
}

// ==================== LOAD INITIAL DATA ====================
async function loadInitialData() {
    try {
        await loadThreats();
        await showStats();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}



// ==================== UPDATE DASHBOARD WITH STATS ====================
async function updateDashboardWithStats(stats) {
    // Update total threats
    document.getElementById('totalThreats').textContent = stats.total_threats || 0;
    
    // Update overall score
    const avgScore = stats.average_score || 0;
    const overallScoreElement = document.getElementById('overallScore');
    overallScoreElement.textContent = Math.round(avgScore);
    overallScoreElement.className = getScoreClass(avgScore) + ' big-number';
    
    // Update website score
    const websiteScore = stats.website_avg_score || 0;
    const websiteScoreElement = document.getElementById('websiteScore');
    websiteScoreElement.textContent = websiteScore > 0 ? Math.round(websiteScore) + '%' : '0%';
    websiteScoreElement.className = getScoreClass(websiteScore) + ' big-number';
    
    // Update scanned sites count
    document.getElementById('scannedSites').textContent = stats.scanned_sites || 0;
    
    // Update WiFi score
    const wifiScore = stats.wifi_avg_score || 0;
    const wifiScoreElement = document.getElementById('wifiScore');
    wifiScoreElement.textContent = wifiScore > 0 ? Math.round(wifiScore) + '%' : '0%';
    wifiScoreElement.className = getScoreClass(wifiScore) + ' big-number';
    
    // Update detected networks count
    document.getElementById('detectedNetworks').textContent = stats.detected_networks || 0;
    
    // Update email score
    const emailScore = stats.email_avg_score || 0;
    const emailScoreElement = document.getElementById('emailScore');
    emailScoreElement.textContent = emailScore > 0 ? Math.round(emailScore) + '%' : '0%';
    emailScoreElement.className = getScoreClass(emailScore) + ' big-number';
    
    // Update scanned emails count
    document.getElementById('scannedEmails').textContent = stats.scanned_emails || 0;
    
    // Update last update time
    document.getElementById('lastUpdate').textContent = 
        stats.last_updated || new Date().toLocaleString();
    
    // Update score circle
    const scoreCircle = document.querySelector('.score-circle');
    if (scoreCircle) {
        const safePercentage = Math.min(100, Math.max(0, avgScore));
        scoreCircle.style.background = 
            `conic-gradient(#10b981 0% ${safePercentage}%, #f59e0b ${safePercentage}% ${Math.min(100, safePercentage + 30)}%, #ef4444 ${Math.min(100, safePercentage + 30)}% 100%)`;
    }
    
    // Update threat chart
    if (threatsChart && stats.risk_distribution) {
        threatsChart.data.datasets[0].data = [
            stats.risk_distribution.safe || 0,
            stats.risk_distribution.warning || 0,
            stats.risk_distribution.danger || 0
        ];
        threatsChart.update();
    }
}

// ==================== LOAD DASHBOARD DATA ====================
async function loadDashboardData() {
    try {
        const response = await fetch(`${BACKEND_URL}/stats`);
        
        if (!response.ok) {
            throw new Error(`Failed to load dashboard data: ${response.status}`);
        }
        
        const data = await response.json();
        updateDashboardWithStats(data);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values
        updateDashboardWithStats({
            total_threats: 0,
            average_score: 0,
            website_avg_score: 0,
            wifi_avg_score: 0,
            email_avg_score: 0,
            scanned_sites: 0,
            detected_networks: 0,
            scanned_emails: 0,
            last_updated: new Date().toLocaleString()
        });
    }
}

// ==================== INITIAL LOAD ====================
document.addEventListener('DOMContentLoaded', function() {
    // Other initialization code...
    
    // Load dashboard data
    loadDashboardData();
    
    // Refresh dashboard every 30 seconds
    setInterval(loadDashboardData, 30000);
});

// ==================== EXPORT FUNCTIONS ====================
// Make functions available globally
window.checkWebsite = checkWebsite;
window.checkWebsiteAdvanced = checkWebsiteAdvanced;
window.checkMultipleUrls = checkMultipleUrls;
window.checkCurrentTab = checkCurrentTab;
window.checkWifi = checkWifi;
window.detectWifi = detectWifi;
window.checkEmail = checkEmail;
window.checkEmailAdvanced = checkEmailAdvanced;
window.checkApiStatus = checkApiStatus;
window.loadThreats = loadThreats;
window.clearHistory = clearHistory;
window.showStats = showStats;
window.generateReport = generateReport;
window.exportCSV = exportCSV;
window.toggleAutoDetection = toggleAutoDetection;
window.scanNow = scanNow;
window.clearAllAlerts = clearAllAlerts;

console.log('✅ SafeSurf AI Frontend Initialized Successfully');