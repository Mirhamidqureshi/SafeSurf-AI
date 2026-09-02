// background.js - Simple Background Service
console.log('SafeSurf background service started');

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        console.log('Tab loaded:', tab.url);
        
        // Optional: Auto-scan can be implemented here
        // For now, just log
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'scanUrl') {
        // Handle URL scanning
        scanUrl(request.url).then(sendResponse);
        return true; // Keep message channel open
    }
    
    sendResponse({ success: false, error: 'Unknown action' });
});

async function scanUrl(url) {
    try {
        const response = await fetch('http://localhost:5000/api/quick-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, user_id: 'background_user' })
        });
        
        const data = await response.json();
        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Optional: Auto-scan every 30 seconds
setInterval(async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true });
        const activeTab = tabs[0];
        
        if (activeTab && activeTab.url && activeTab.url.startsWith('http')) {
            console.log('Auto-checking:', activeTab.url);
            
            // Could perform periodic checks here
        }
    } catch (error) {
        console.error('Auto-scan error:', error);
    }
}, 30000);