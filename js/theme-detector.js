// Este script detecta o tema do sistema e envia para o service worker
// Precisa ser carregado em um contexto de página, não de service worker

// Função para verificar o tema e enviar para o service worker
function checkAndSendTheme() {
  try {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    chrome.runtime.sendMessage({
      type: 'theme-changed',
      isDarkMode: isDarkMode
    });
  } catch (e) {
    console.error('Erro ao detectar tema:', e);
  }
}

// Verificar o tema quando a página carregar
checkAndSendTheme();

// Adicionar listener para mudanças de tema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkAndSendTheme);
