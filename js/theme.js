// Theme detection and management
function detectTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Notify background script of theme
  chrome.runtime.sendMessage({ 
    type: 'theme-changed',
    isDarkMode: isDarkMode 
  });

  // Also listen for theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: 'theme-changed',
      isDarkMode: e.matches
    });
  });
}

// Initialize theme detection when popup loads
detectTheme();
