// Theme detection and management
function detectTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Notify background script of theme
  chrome.runtime.sendMessage(
    {
      type: 'theme-changed',
      isDarkMode: isDarkMode
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Theme message failed:', chrome.runtime.lastError.message);
      }
    }
  );

  // Also listen for theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.runtime.sendMessage(
      {
        type: 'theme-changed',
        isDarkMode: e.matches
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            'Theme change message failed:',
            chrome.runtime.lastError.message
          );
        }
      }
    );
  });
}

// Initialize theme detection when popup loads
detectTheme();
