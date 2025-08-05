// Script para garantir que o favicon carregue corretamente
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (chrome && chrome.runtime && chrome.runtime.getURL) {
            var faviconUrl = chrome.runtime.getURL('images/icon-light-theme-32.png');
            document.getElementById('favicon').href = faviconUrl;
        }
    } catch (e) {
        console.log('Erro ao carregar favicon:', e);
    }
});
