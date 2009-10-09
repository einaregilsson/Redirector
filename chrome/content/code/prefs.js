// $Id$

function Prefs() {
	this.init();	
}

Prefs.prototype = {

    //Preferences:
    _version : null,
    _enabled : null,
    _showStatusBarIcon : null,
    _showContextMenu : null,
    _debugEnabled : null,
    _defaultDir : null,
    _redirects : null,
    
    _prefBranch : null,
    
    _listeners : null,
    
    //Preferences props
    
    get version() { return this._version; },
    set version(value) { this._prefBranch.setCharPref('version', value); },

    get enabled() { return this._enabled; },
    set enabled(value) { this._prefBranch.setBoolPref('enabled', value); },
    
    get showStatusBarIcon() { return this._showStatusBarIcon; },
    set showStatusBarIcon(value) { this._prefBranch.setBoolPref('showStatusBarIcon', value); },

    get showContextMenu() { return this._showContextMenu; },
    set showContextMenu(value) { this._prefBranch.setBoolPref('showContextMenu', value); },
		
    get debugEnabled() { return this._debugEnabled; },
    set debugEnabled(value) { this._prefBranch.setBoolPref('debugEnabled', value); },

    get defaultDir() { return this._defaultDir; },
    set defaultDir(value) { this._prefBranch.setCharPref('defaultDir', value); },

    get redirects() { return this._redirects; },
    set redirects(value) { this._prefBranch.setCharPref('redirects', value); },

	init : function() {
	    this._prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.redirector.");
		this.reload();
		this._listeners = [];
        this.service.addObserver('extensions.redirector', this, false);
    },

    destroy : function() {
        this.service.removeObserver('extensions.redirector', this);
	},
	
	reload : function() {
	    this._version = this._prefBranch.getCharPref('version');
	    this._enabled = this._prefBranch.getBoolPref('enabled');
	    this._showStatusBarIcon = this._prefBranch.getBoolPref('showStatusBarIcon');
	    this._showContextMenu = this._prefBranch.getBoolPref('showContextMenu');
	    this._debugEnabled = this._prefBranch.getBoolPref('debugEnabled');
	    this._defaultDir = this._prefBranch.getCharPref('defaultDir');
	    this._redirects = this._prefBranch.getCharPref('redirects');
	},
	
    get service() {
        return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranchInternal);
    },

    observe : function(subject, topic, data) {
        if (topic != 'nsPref:changed') {
	        return;
        }
        this.reload();
        for each (var listener in this._listeners) {
	    	listener && listener.changedPrefs && listener.changedPrefs(this);    
        }
    },

	addListener : function(listener) {
		this._listeners.push(listener);
	},
	
	removeListener : function(listener) {
		for (var i = 0; i < this._listeners.length; i++) {
			if (this._listeners[i] == listener) {
				this._listeners.splice(i,1);
				return;
			}
		}
	},
}