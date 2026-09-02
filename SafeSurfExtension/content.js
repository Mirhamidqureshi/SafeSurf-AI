// content.js - Page monitoring
console.log('SafeSurf content script loaded');

// Monitor for form submissions
document.addEventListener('submit', (event) => {
    const form = event.target;
    const inputs = form.querySelectorAll('input[type="password"], input[type="email"], input[type="text"]');
    
    if (inputs.length > 0) {
        console.log('Form submission detected:', form.action || 'unknown');
        // Could send warning to popup
    }
});

// Monitor for password fields
const passwordFields = document.querySelectorAll('input[type="password"]');
if (passwordFields.length > 0) {
    console.log('Password fields detected on page');
}

// Send page info to background
setTimeout(() => {
    const pageInfo = {
        url: window.location.href,
        title: document.title,
        hasPasswordFields: passwordFields.length > 0,
        formsCount: document.forms.length
    };
    
    chrome.runtime.sendMessage({
        type: 'PAGE_INFO',
        data: pageInfo
    });
}, 1000);