//Este é o novo background script para Manifest V3
// Definindo a classe Redirect diretamente no background script
// para evitar problemas de carregamento de módulos

/*
  INFORMAÇÕES SOBRE WILDCARDS:
  
  A extensão Redirector agora suporta dois formatos para wildcards:
  
  1. Com delimitador antes do asterisco: exemplo/path/*
  2. Sem delimitador antes do asterisco: exemplo/path*
  
  Ambos os formatos funcionam da mesma maneira. O texto após o asterisco
  é capturado e pode ser inserido na URL de destino usando $1.
  
  Se a URL de destino não contiver $1, a parte variável será automaticamente
  adicionada ao final da URL.
  
  Exemplos:
  - Padrão: https://example.com/path/* → https://newsite.com/newpath/$1
  - Padrão: https://example.com/path* → https://newsite.com/newpath$1
  
  Em ambos os casos, a URL https://example.com/path/test.html será
  redirecionada para https://newsite.com/newpath/test.html
*/

function Redirect(o) {
  if (!o) return;
  
  // Copiar propriedades do objeto
  for (var prop in o) {
    if (o.hasOwnProperty(prop)) {
      this[prop] = o[prop];
    }
  }
}

// Constantes estáticas
Redirect.WILDCARD = 'W';
Redirect.REGEX = 'R';

// Tipos de requisição
Redirect.requestTypes = {
  main_frame: "Main window (address bar)",
  sub_frame: "IFrames",
  stylesheet: "Stylesheets",
  font: "Fonts",
  script: "Scripts",
  imageset: "Responsive Images in Firefox",
  media: "Media (audio and video)",
  object: "Objects (e.g. Flash content, Java applets)",
  object_subrequest: "Object subrequests",
  xmlhttprequest: "XMLHttpRequests (Ajax)",
  history: "HistoryState",
  other: "Other"
};

// Prototype
Redirect.prototype = {
  // Atributos
  description: '',
  exampleUrl: '',
  exampleResult: '',
  error: null,
  includePattern: '',
  excludePattern: '',
  patternDesc: '',
  redirectUrl: '',
  patternType: '',
  processMatches: 'noProcessing',
  disabled: false,
  grouped: false,
  
  // Métodos
  compile: function() {
    // Compila o padrão baseado no tipo (Wildcard ou Regex)
    if (this.patternType === Redirect.WILDCARD) {
      // Prepara o padrão wildcard para uso mais eficiente
      const wildcardIndex = this.includePattern.indexOf('*');
      
      if (wildcardIndex !== -1) {
        // A parte fixa é tudo antes do *
        this._fixedPart = this.includePattern.substring(0, wildcardIndex);
        
        // Verifica se o wildcard tem um delimitador ou não
        const lastCharBeforeWildcard = this._fixedPart.charAt(this._fixedPart.length - 1);
        this._hasDelimiter = (lastCharBeforeWildcard === '/');
        
        // Verificar se o redirectUrl inclui $1 para wildcards com asterisco
        if (this.redirectUrl && !this.redirectUrl.includes('$1')) {
          // Para facilitar o processamento, marcamos que precisamos adicionar a parte variável
          this._appendVariablePart = true;
          
          // Se o padrão original tinha um delimitador antes do wildcard (como '/'),
          // mas a URL de redirecionamento não termina com esse delimitador,
          // adicionar o delimitador apropriado na URL de redirecionamento
          if (this._hasDelimiter && !this.redirectUrl.endsWith('/')) {
            this.redirectUrl = this.redirectUrl + '/';
          }
          
          console.log('Wildcard detectado sem $1 na URL de redirecionamento - será adicionado automaticamente');
        }
      }
    } else if (this.patternType === Redirect.REGEX) {
      // Para regex, podemos compilar a expressão regular
      try {
        this._rxInclude = new RegExp(this.includePattern);
      } catch (e) {
        console.error('Erro ao compilar regex:', e);
        // Em caso de erro, definir como regex vazio que não corresponde a nada
        this._rxInclude = new RegExp('(?!)');
      }
    }
    return true;
  },
  
  toObject: function() {
    var obj = {};
    for (var prop in this) {
      if (this.hasOwnProperty(prop) && typeof this[prop] !== 'function' && prop[0] !== '_') {
        obj[prop] = this[prop];
      }
    }
    return obj;
  },
  
  getMatch: function(url) {
    // Implementação básica para compatibilidade
    var isMatch = false;
    var redirectTo = url;
    
    // Lógica simplificada para verificar correspondência
    if (this.patternType === Redirect.WILDCARD) {
      try {
        // Extrai a parte antes do wildcard
        const wildcardIndex = this.includePattern.indexOf('*');
        
        if (wildcardIndex !== -1) {
          // A parte fixa é tudo antes do *
          const fixedPart = this.includePattern.substring(0, wildcardIndex);
          
          // Verifica se a URL começa com a parte fixa
          if (url.startsWith(fixedPart)) {
            isMatch = true;
            
            // Captura a parte variável (o que vem após a parte fixa)
            const variablePart = url.substring(fixedPart.length);
            
            // Substitui $1 na URL de redirecionamento pela parte variável capturada
            if (this.redirectUrl) {
              // Verificar se a URL de redirecionamento já contém $1
              if (this.redirectUrl.includes('$1')) {
                redirectTo = this.redirectUrl.replace(/\$1/g, variablePart);
              } else {
                // Se não há $1 na URL de redirecionamento, adiciona a parte variável
                // com base na análise do padrão feita durante a compilação
                const lastCharBeforeWildcard = fixedPart.charAt(fixedPart.length - 1);
                const hasDelimiter = (lastCharBeforeWildcard === '/');
                
                if (hasDelimiter && !this.redirectUrl.endsWith('/')) {
                  // Se o padrão original tinha delimitador mas a URL de redirecionamento não termina com /
                  redirectTo = this.redirectUrl + '/' + variablePart;
                } else {
                  redirectTo = this.redirectUrl + variablePart;
                }
              }
              
              console.log('Redirecionamento wildcard:', {
                url,
                pattern: this.includePattern,
                fixedPart,
                variablePart,
                redirectTo
              });
            }
          }
        } else if (url === this.includePattern) {
          // Corresponde exata sem wildcard
          isMatch = true;
        }
      } catch (e) {
        console.error('Erro ao processar wildcard:', e);
      }
    } 
    else if (this.patternType === Redirect.REGEX) {
      try {
        var regex = new RegExp(this.includePattern);
        isMatch = regex.test(url);
        
        if (isMatch && this.redirectUrl) {
          redirectTo = url.replace(regex, this.redirectUrl);
        }
      } catch (e) {
        console.error('Erro na expressão regular:', e);
      }
    }
    
    return {
      isMatch: isMatch,
      redirectTo: redirectTo
    };
  }
};

function log(msg, force) {
  if (log.enabled || force) {
    console.log('REDIRECTOR: ' + msg);
  }
}
log.enabled = true; // Ativamos o log por padrão para diagnosticar problemas
var enableNotifications = true; // Ativamos notificações para ver quando o redirecionamento ocorre

function isDarkMode() {
  // No service worker não temos acesso ao window.matchMedia
  // Usamos a variável global darkModeEnabled que é atualizada via mensagens
  return darkModeEnabled;
}

// Variável global para armazenar o estado do tema
var darkModeEnabled = false;
var isFirefox = !!navigator.userAgent.match(/Firefox/i);

var storageArea = chrome.storage.local;

// Função para converter os tipos de recursos para os tipos compatíveis com declarativeNetRequest
function mapResourceTypes(redirectAppliesTo) {
  const typeMap = {
    'main_frame': 'main_frame',
    'sub_frame': 'sub_frame',
    'stylesheet': 'stylesheet',
    'script': 'script',
    'image': 'image',
    'font': 'font',
    'object': 'object',
    'xmlhttprequest': 'xmlhttprequest',
    'media': 'media',
    'other': 'other'
  };
  
  return redirectAppliesTo
    .filter(type => typeMap[type])
    .map(type => typeMap[type]);
}

// Função para converter um redirecionamento para uma regra declarativeNetRequest
function convertRedirectToRule(redirect, id) {
  try {
    const resourceTypes = mapResourceTypes(redirect.appliesTo);
    
    let regexFilter = '';
    if (redirect.patternType === 'W') { // Redirect.WILDCARD
      // Extrair a parte base da URL e a parte do wildcard
      const wildcardIndex = redirect.includePattern.indexOf('*');
      if (wildcardIndex !== -1) {
        // Se houver um wildcard, extraímos a parte antes dele
        const baseUrl = redirect.includePattern.substring(0, wildcardIndex);
        log(`URL base: ${baseUrl}`, true);
        
        // Construir o padrão regex que captura tudo após a base
        // Escape de caracteres especiais na parte fixa da URL
        const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Construir o regex com grupo de captura
        regexFilter = escapedBaseUrl + '(.*)';
        
        log(`Padrão de URL com wildcard convertido para regex: ${regexFilter}`, true);
      } else {
        // Se não houver wildcard, usamos o padrão como está
        regexFilter = redirect.includePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    } else if (redirect.patternType === 'R') { // Redirect.REGEX
      regexFilter = redirect.includePattern;
    }
    
    // Criar regexSubstitution baseado no redirectUrl
    let regexSubstitution = redirect.redirectUrl;
    
    // Verificar se a URL de redirecionamento contém $1 para wildcards
    if (redirect.patternType === 'W' && redirect.includePattern.includes('*')) {
      // Para wildcards, precisamos garantir que a parte variável seja capturada corretamente
      if (!regexSubstitution.includes('$1')) {
        // Se não contém $1, adicionar ao final para capturar a parte variável
        // Verificar se precisamos adicionar uma barra antes
        const baseUrl = redirect.includePattern.substring(0, redirect.includePattern.indexOf('*'));
        const lastCharBeforeWildcard = baseUrl.charAt(baseUrl.length - 1);
        
        if (lastCharBeforeWildcard === '/' && !regexSubstitution.endsWith('/')) {
          regexSubstitution = regexSubstitution + '/$1';
        } else {
          regexSubstitution = regexSubstitution + '$1';
        }
        log('URL de redirecionamento não continha $1, adicionado: ' + regexSubstitution, true);
      }
      
      // Verificar se é preciso modificar o $1 para \\1 na versão final da regra de substituição
      // Algumas versões do Chrome exigem \\1 em vez de $1 na regexSubstitution
      if (regexSubstitution.includes('$1')) {
        // Criar uma cópia para teste que usa \\1 em vez de $1
        const alternativeSubstitution = regexSubstitution.replace(/\$1/g, '\\1');
        log('Criando formato alternativo de substituição: ' + alternativeSubstitution, true);
        regexSubstitution = alternativeSubstitution;
      }
    }
    
    // Teste detalhado da expressão regular com um exemplo
    log(`\n=== TESTE DETALHADO DE REGRA ===`, true);
    log(`Padrão original: ${redirect.includePattern}`, true);
    log(`Regex gerado: ${regexFilter}`, true);
    log(`URL de redirecionamento: ${regexSubstitution}`, true);
    
    // Verificar se a URL é um exemplo válido para testar a regra
    const testUrl = redirect.exampleUrl || 'https://iexpress.ingty.com/MyLibDev/iexpress/test.html';
    
    try {
      log(`Testando com URL: ${testUrl}`, true);
      const regex = new RegExp(regexFilter);
      const matches = testUrl.match(regex);
      
      if (matches) {
        log(`Match encontrado!`, true);
        log(`Grupos capturados: ${JSON.stringify(matches)}`, true);
        
        // Simular a substituição que o Chrome faria
        let resultUrl = "";
        
        // Se estamos usando o formato \\1 para substituição
        if (regexSubstitution.includes('\\1')) {
          // Simular o processamento com o formato \\n
          resultUrl = testUrl.replace(new RegExp(regexFilter), regexSubstitution);
          log(`Substituição simulada usando \\n: ${resultUrl}`, true);
        } 
        // Se estamos usando o formato $1 para substituição
        else if (regexSubstitution.includes('$1')) {
          resultUrl = regexSubstitution;
          // Substituir $n pelo grupo capturado correspondente
          for (let i = 1; i < matches.length + 1; i++) {
            const placeholder = `\\$${i}`;
            const replacement = matches[i] || '';
            log(`Substituindo $${i} por "${replacement}"`, true);
            resultUrl = resultUrl.replace(new RegExp(placeholder, 'g'), replacement);
          }
        }
        // Se não contém $1 nem \\1, fazer a substituição manualmente
        else {
          const capturedPart = matches[1] || '';
          resultUrl = regexSubstitution + capturedPart;
          log(`Adicionando "${capturedPart}" ao final de ${regexSubstitution}`, true);
        }
        
        log(`Resultado esperado: ${resultUrl}`, true);
      } else {
        log(`Nenhum match encontrado para o padrão`, true);
      }
    } catch (e) {
      log(`Erro ao testar regex: ${e.message}`, true);
    }
    
    log(`=== FIM DO TESTE ===\n`, true);
    
    const rule = {
      id: id,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: regexSubstitution
        }
      },
      condition: {
        regexFilter: regexFilter,
        resourceTypes: resourceTypes
      }
    };
    
    // Log da regra para diagnóstico
    log(`Regra convertida: ${JSON.stringify({
      id: id, 
      includePattern: redirect.includePattern,
      redirectUrl: redirect.redirectUrl,
      regexFilter: regexFilter,
      regexSubstitution: regexSubstitution
    })}`, true);
    
    return rule;
  } catch (e) {
    log('Erro ao converter regra: ' + e.message);
    return null;
  }
}

// Configurar as regras de redirecionamento
async function setupRedirectRules() {
  try {
    log('Configurando regras de redirecionamento...', true);
    const data = await chrome.storage.local.get({redirects: [], disabled: false});
    
    if (data.disabled) {
      log('Redirector está desativado, removendo todas as regras', true);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: await getCurrentRuleIds()
      });
      return;
    }
    
    const redirects = data.redirects;
    if (redirects.length === 0) {
      log('Sem redirecionamentos definidos', true);
      return;
    }
    
    // Imprimir todos os redirecionamentos para diagnóstico
    redirects.forEach((redirect, index) => {
      if (!redirect.disabled) {
        log(`Redirecionamento #${index + 1}:`, true);
        log(`  Padrão: ${redirect.includePattern}`, true);
        log(`  URL de redirecionamento: ${redirect.redirectUrl}`, true);
        log(`  Tipo de padrão: ${redirect.patternType === 'W' ? 'Wildcard' : 'Regex'}`, true);
        log(`  Aplica-se a: ${redirect.appliesTo.join(', ')}`, true);
      }
    });
    
    // Obter IDs de regras existentes para removê-las
    const existingRuleIds = await getCurrentRuleIds();
    
    // Converter redirecionamentos para regras
    const rules = redirects
      .filter(r => !r.disabled)
      .map((r, index) => {
        if (typeof Redirect === 'function') {
          const redirect = new Redirect(r);
          redirect.compile();
          const rule = convertRedirectToRule(redirect, index + 1);
          
          // Log detalhado da regra para diagnóstico
          if (rule) {
            log('Regra convertida: ' + JSON.stringify({
              id: rule.id,
              includePattern: redirect.includePattern,
              redirectUrl: redirect.redirectUrl,
              regexFilter: rule.condition.regexFilter,
              regexSubstitution: rule.action.redirect.regexSubstitution
            }), true);
          }
          
          return rule;
        } else {
          // Se Redirect ainda não foi carregado, retornamos null
          log('Redirect ainda não foi carregado');
          return null;
        }
      })
      .filter(rule => rule !== null); // Remover regras que não puderam ser convertidas
    
    log('Configurando ' + rules.length + ' regras de redirecionamento');
    
    // Aplicar as regras
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: rules
    });
    
    // Verificar regras ativas
    const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
    log('Regras ativas após configuração: ' + JSON.stringify(activeRules), true);
    
    // Configurar ouvinte para história de navegação (para Facebook, Twitter, etc.)
    setupHistoryStateListener(redirects);
    
    log('Regras de redirecionamento configuradas com sucesso');
  } catch (error) {
    log('Erro ao configurar regras: ' + error.message);
  }
}

// Obter IDs das regras atuais
async function getCurrentRuleIds() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules.map(rule => rule.id);
}

// Monitorar alterações nos dados e reconfigurar
function monitorChanges(changes, namespace) {
  if (changes.disabled || changes.redirects) {
    log('Redirecionamentos ou status foram alterados, reconfigurando...');
    setupRedirectRules();
    updateIcon();
  }

  if (changes.logging) {
    log.enabled = changes.logging.newValue;
    log('Configurações de log alteradas para ' + changes.logging.newValue, true);
  }
  
  if (changes.enableNotifications) {
    log('Configuração de notificações alterada para ' + changes.enableNotifications.newValue);
    enableNotifications = changes.enableNotifications.newValue;
  }
}
chrome.storage.onChanged.addListener(monitorChanges);

// Configurar o ícone
function updateIcon() {
  try {
    chrome.storage.local.get({disabled: false}, function(obj) {
      try {
        if (!isFirefox) {
          if (isDarkMode()) {
            setIcon('icon-dark-theme');
          } else {
            setIcon('icon-light-theme');
          }
        }

        // Definir o texto do badge independentemente do ícone
        if (obj.disabled) {
          chrome.action.setBadgeText({text: 'off'});
          chrome.action.setBadgeBackgroundColor({color: '#fc5953'});
        } else {
          chrome.action.setBadgeText({text: 'on'});
          chrome.action.setBadgeBackgroundColor({color: '#35b44a'});
        }
      } catch (error) {
        console.error('Erro ao atualizar ícone:', error);
      }
    });
  } catch (error) {
    console.error('Erro ao acessar storage para atualizar ícone:', error);
  }
}

function setIcon(image) {
  try {
    const data = { 
      path: {}
    };

    // Definindo caminhos relativos para os ícones
    for (let nr of [16,19,32,38,48,64,128]) {
      data.path[nr] = chrome.runtime.getURL(`images/${image}-${nr}.png`);
    }

    chrome.action.setIcon(data, () => {
      if (chrome.runtime.lastError) {
        console.error('Erro ao definir ícone:', chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Erro ao definir ícone:', error);
  }
}

// Configurar ouvinte para redirecionamentos de estado de história (para sites SPA)
function setupHistoryStateListener(redirects) {
  // Remover ouvinte existente
  if (chrome.webNavigation.onHistoryStateUpdated.hasListeners()) {
    chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);
  }
  
  // Filtrar apenas redirecionamentos para o tipo 'history'
  const historyRedirects = redirects.filter(r => 
    r.appliesTo.includes('history') && !r.disabled
  );
  
  if (historyRedirects.length > 0) {
    log('Adicionando ouvinte para redirecionamentos de estado de história');
    chrome.webNavigation.onHistoryStateUpdated.addListener(
      checkHistoryStateRedirects
    );
  }
  
  // Também adicionar um listener para webNavigation.onBeforeNavigate
  // para capturar e processar todas as navegações, independentemente do declarativeNetRequest
  const allRedirects = redirects.filter(r => !r.disabled);
  if (allRedirects.length > 0) {
    // Remover ouvinte existente
    if (chrome.webNavigation.onBeforeNavigate.hasListeners()) {
      chrome.webNavigation.onBeforeNavigate.removeListener(checkManualRedirects);
    }
    
    log('Adicionando ouvinte para redirecionamentos manuais');
    chrome.webNavigation.onBeforeNavigate.addListener(
      checkManualRedirects,
      { url: [{ urlContains: '' }] } // Capturar todas as URLs
    );
  }
}

// Redirecionar URLs em lugares como Facebook e Twitter
function checkHistoryStateRedirects(details) {
  log('Verificando redirecionamento de estado de história: ' + details.url);
  
  chrome.storage.local.get({redirects: [], disabled: false}, function(obj) {
    if (obj.disabled) {
      return;
    }
    
    const historyRedirects = obj.redirects.filter(r => 
      r.appliesTo.includes('history') && !r.disabled
    );
    
    for (const r of historyRedirects) {
      if (typeof Redirect === 'function') {
        const redirect = new Redirect(r);
        redirect.compile();
        const result = redirect.getMatch(details.url);
        
        if (result.isMatch) {
          log('Redirecionamento detectado!', true);
          log('URL original: ' + details.url, true);
          log('URL de destino: ' + result.redirectTo, true);
          
          if (enableNotifications) {
            sendNotifications(redirect, details.url, result.redirectTo);
          }
          chrome.tabs.update(details.tabId, {url: result.redirectTo});
          break;
        }
      }
    }
  });
}

// Função para processar redirecionamentos manualmente, como backup para declarativeNetRequest
function checkManualRedirects(details) {
  // Skip frames that are not the main frame (só processar main_frame)
  if (details.frameId !== 0) {
    return;
  }
  
  chrome.storage.local.get({redirects: [], disabled: false}, function(obj) {
    if (obj.disabled) {
      return;
    }
    
    log('Verificando redirecionamento manual para: ' + details.url);
    
    // Pegar todos os redirecionamentos ativos
    const allRedirects = obj.redirects.filter(r => !r.disabled && r.patternType === 'W');
    
    for (const r of allRedirects) {
      if (typeof Redirect === 'function') {
        const redirect = new Redirect(r);
        redirect.compile();
        const result = redirect.getMatch(details.url);
        
        if (result.isMatch) {
          log('Redirecionamento manual detectado!', true);
          log('URL original: ' + details.url, true);
          log('URL de destino: ' + result.redirectTo, true);
          
          if (enableNotifications) {
            sendNotifications(redirect, details.url, result.redirectTo);
          }
          
          // Usar chrome.tabs.update para redirecionar
          chrome.tabs.update(details.tabId, {url: result.redirectTo});
          break;
        }
      }
    }
  });
}

// Lidar com mensagens da interface do usuário
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    try {
        log('Mensagem recebida: ' + JSON.stringify(request));
        
        if (request.type === 'ping') {
            // Responder ao ping para confirmar que o service worker está ativo
            sendResponse({status: "ok"});
            return false;
        }
        
        if (request.type === 'get-redirects') {
            log('Obtendo redirecionamentos do armazenamento');
            storageArea.get({
                redirects: []
            }, function(obj) {
                try {
                    log('Redirecionamentos obtidos: ' + JSON.stringify(obj));
                    sendResponse(obj);
                } catch (error) {
                    console.error('Erro ao processar redirecionamentos:', error);
                    sendResponse({error: error.message});
                }
            });
            return true;
        } 
        
        if (request.type === 'save-redirects') {
            console.log('Salvando redirecionamentos, contagem=' + request.redirects.length);
            delete request.type;
            storageArea.set(request, function(a) {
                try {
                    if (chrome.runtime.lastError) {
                        if (chrome.runtime.lastError.message.indexOf("QUOTA_BYTES_PER_ITEM quota exceeded") > -1) {
                            log("Falha ao salvar redirecionamentos - tamanho maior que o limite permitido pela Sincronização");
                            sendResponse({
                                message: "Falha ao salvar redirecionamentos - tamanho maior que o limite permitido pela Sincronização. Consulte a página de Ajuda"
                            });
                        }
                    } else {
                        log('Redirecionamentos salvos com sucesso');
                        setupRedirectRules(); // Reconfigurar regras após salvar
                        sendResponse({
                            message: "Redirecionamentos salvos"
                        });
                    }
                } catch (error) {
                    console.error('Erro ao salvar redirecionamentos:', error);
                    sendResponse({message: "Erro ao salvar: " + error.message});
                }
            });
            return true;
        }
        
        if (request.type === 'update-icon') {
            updateIcon();
            sendResponse({status: "ok"});
            return true;
        }
        
        if (request.type === 'set-theme') {
            // Atualiza a variável global de tema a partir da mensagem
            darkModeEnabled = request.isDarkMode;
            log('Tema atualizado para: ' + (darkModeEnabled ? 'escuro' : 'claro'));
            updateIcon();
            sendResponse({status: "ok"});
            return true;
        }
        
        if (request.type === 'toggle-sync') {
            delete request.type;
            log('Alternando sync para ' + request.isSyncEnabled);
            
            chrome.storage.local.set({
                isSyncEnabled: request.isSyncEnabled
            }, function() {
                if (request.isSyncEnabled) {
                    storageArea = chrome.storage.sync;
                    log('Tamanho da área de armazenamento para sync é 5 MB, mas um objeto (redirects) só pode conter ' + storageArea.QUOTA_BYTES_PER_ITEM / 1000000 + ' MB');
                    
                    chrome.storage.local.getBytesInUse("redirects", function(size) {
                        log("Tamanho dos redirecionamentos é " + size + " bytes");
                        
                        if (size > storageArea.QUOTA_BYTES_PER_ITEM) {
                            log("Tamanho dos redirecionamentos " + size + " é maior que o permitido para Sync: " + storageArea.QUOTA_BYTES_PER_ITEM);
                            storageArea = chrome.storage.local; 
                            sendResponse({
                                message: "Sync Não Possível - tamanho dos Redirecionamentos maior que o permitido pelo Sync. Consulte a página de Ajuda"
                            });
                        } else {
                            chrome.storage.local.get({
                                redirects: []
                            }, function(obj) {
                                if (obj.redirects.length > 0) {
                                    chrome.storage.sync.set(obj, function(a) {
                                        log('Redirecionamentos movidos de Local para Área de Armazenamento Sync');
                                        chrome.storage.local.remove("redirects");
                                        setupRedirectRules();
                                        sendResponse({
                                            message: "sync-enabled"
                                        });
                                    });
                                } else {
                                    log('Nenhum redirecionamento configurado atualmente em Local, apenas habilitando Sync');
                                    sendResponse({
                                        message: "sync-enabled"
                                    });
                                }
                            });
                        }
                    });
                } else {
                    storageArea = chrome.storage.local;
                    log('Tamanho da área de armazenamento para local é ' + storageArea.QUOTA_BYTES / 1000000 + ' MB');
                    
                    chrome.storage.sync.get({
                        redirects: []
                    }, function(obj) {
                        if (obj.redirects.length > 0) {
                            chrome.storage.local.set(obj, function(a) {
                                log('Redirecionamentos movidos de Sync para Área de Armazenamento Local');
                                chrome.storage.sync.remove("redirects");
                                setupRedirectRules();
                                sendResponse({
                                    message: "sync-disabled"
                                });
                            });
                        } else {
                            sendResponse({
                                message: "sync-disabled"
                            });
                        }
                    });
                }
            });
            return true;
        }
        
        log('Mensagem inesperada: ' + JSON.stringify(request));
        return false;
        
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        sendResponse({error: error.message});
        return false;
    }
});

// Função para enviar notificações
function sendNotifications(redirect, originalUrl, redirectedUrl) {
  log("Mostrando notificação de sucesso de redirecionamento");
  
  try {
    let iconPath = isDarkMode() ? 
      chrome.runtime.getURL("images/icon-dark-theme-48.png") : 
      chrome.runtime.getURL("images/icon-light-theme-48.png");
    
    const isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1 && 
                    navigator.userAgent.toLowerCase().indexOf("opr") < 0;
    
    if (isChrome) {
      var items = [
        {title: "Página original: ", message: originalUrl},
        {title: "Redirecionado para: ", message: redirectedUrl}
      ];
      var head = "Redirector - Regra aplicada: " + redirect.description;
      
      chrome.notifications.create({
        type: "list",
        items: items,
        title: head,
        message: head,
        iconUrl: iconPath
      });
    } else {
      var message = "Regra aplicada: " + redirect.description + " e redirecionou a página original " + originalUrl + " para " + redirectedUrl;
      
      chrome.notifications.create({
        type: "basic",
        title: "Redirector",
        message: message,
        iconUrl: iconPath
      });
    }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}

// Configuração inicial - será chamada após carregar o Redirect
function setupInitial() {
  chrome.storage.local.get({logging: false}, function(obj) {
    log.enabled = obj.logging;
  });

  chrome.storage.local.get({
    isSyncEnabled: false
  }, function(obj) {
    if (obj.isSyncEnabled) {
      storageArea = chrome.storage.sync;
    } else {
      storageArea = chrome.storage.local;
    }
    
    chrome.storage.local.get({enableNotifications: false}, function(obj) {
      enableNotifications = obj.enableNotifications;
    });
    
    updateIcon();
    setupRedirectRules();
  });
}

chrome.runtime.onStartup.addListener(handleStartup);

function handleStartup() {
  enableNotifications = false;
  chrome.storage.local.set({
    enableNotifications: false
  });
  
  updateIcon();
  
  // Em service workers, não podemos usar window.matchMedia
  // Usamos mensagens das páginas da extensão para obter o tema
  log('Service worker iniciado, aguardando mensagens de tema...');
}

log('Redirector iniciando...');

// Chamar setupInitial imediatamente, já que temos a classe Redirect definida
setupInitial();
