// theme-detector-redirectorpage.js
// Este script detecta o tema do sistema e atualiza o ícone na página de redirecionamento

function updateFavicon(e) {
    try {
        let type = e.matches ? 'dark' : 'light';
        let favicon = document.querySelector('link[rel="shortcut icon"]');
        if (favicon) {
            favicon.href = chrome.runtime.getURL(`images/icon-${type}-theme-32.png`);
        }
        
        // Enviar mensagem para o service worker sobre a mudança de tema
        chrome.runtime.sendMessage({
            type: "set-theme", 
            isDarkMode: e.matches
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Erro ao enviar mensagem de tema:', chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar ícone:', error);
    }
}

// Detectar tema inicial - usamos try-catch para tratamento de erros
try {
    let mql = window.matchMedia('(prefers-color-scheme:dark)');
    updateFavicon(mql);

    // Adicionar listener para mudanças de tema - preferimos addEventListener para compatibilidade
    if (mql.addEventListener) {
        mql.addEventListener('change', updateFavicon);
    } else if (mql.addListener) {
        // Fallback para browsers mais antigos
        mql.addListener(updateFavicon);
    }

    // Informar ao service worker sobre o tema atual ao carregar a página
    setTimeout(function() {
        chrome.runtime.sendMessage({
            type: "set-theme",
            isDarkMode: window.matchMedia('(prefers-color-scheme:dark)').matches
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Erro ao enviar mensagem inicial de tema:', chrome.runtime.lastError);
            }
        });
    }, 500); // Pequeno delay para garantir que o service worker esteja pronto
} catch (error) {
    console.error('Erro ao configurar detector de tema:', error);
}
