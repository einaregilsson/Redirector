// Cria um redirect.js simplificado para servir como polyfill global
// Esta versão é menos elegante, mas mais compatível com o Manifest V3

// Define a classe Redirect globalmente
window.Redirect = function(o) {
  this._init(o);
};

// Adiciona as constantes estáticas
window.Redirect.WILDCARD = 'W';
window.Redirect.REGEX = 'R';

window.Redirect.requestTypes = {
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

// Prototype com os métodos da classe
window.Redirect.prototype = {
  // Adicionar os métodos necessários do redirect.js original
  // Implementação básica para funcionar com o service worker
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

  _init: function(o) {
    if (!o) {
      return;
    }

    // Copiar as propriedades do objeto
    for (var prop in o) {
      if (o.hasOwnProperty(prop)) {
        this[prop] = o[prop];
      }
    }
  },

  compile: function() {
    // Implementação básica, apenas para evitar erros
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
    return {
      isMatch: false,
      redirectTo: ''
    };
  }
};

// Permite ser importado como um módulo
if (typeof exports !== 'undefined') {
  exports.Redirect = window.Redirect;
}
