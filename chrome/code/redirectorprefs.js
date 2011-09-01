var EXPORTED_SYMBOLS = ['RedirectorPrefs'];

function RedirectorPrefs() {
	this.init();	
}

RedirectorPrefs.prototype = {

	_listeners : null,
	init : function() {
		this._prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.redirector.");
		this.reload();
		this._listeners = [];
		this.service.addObserver('extensions.redirector', this, false);
	},

	dispose : function() {
		this._listeners = null;
		this.service.removeObserver('extensions.redirector', this);
	},
	
	reload : function(addWatch) {
		var b = this._prefBranch;
		for each (var name in b.getChildList('')){
			this.unwatch(name);
			var type = b.getPrefType(name);
			if (type == b.PREF_STRING) {
				this[name] = b.getCharPref(name);
			} else if (type == b.PREF_INT) {
				this[name] = b.getIntPref(name);
			} else if (type == b.PREF_BOOL) {
				this[name] = b.getBoolPref(name);
			}
			
			this.watch(name, function(id,oldval,newval) {
				var type = b.getPrefType(id);
				if (type == b.PREF_STRING) {
					b.setCharPref(id,newval);
				} else if (type == b.PREF_INT) {
					b.setIntPref(id, newval);
				} else if (type == b.PREF_BOOL) {
					dump(id+ ' ' + newval)
					b.setBoolPref(id, newval);
				}
				return newval;
			});
		}
	},
	
	get service() {
		return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranchInternal);
	},

	observe : function(subject, topic, data) {
		if (topic != 'nsPref:changed') {
			return;
		}
		this.reload(false);
		for each (var listener in this._listeners) {
			listener && listener.changedPrefs && listener.changedPrefs(this);	 
		}
	},

	addListener : function(listener) {
		this._listeners.push(listener);
	},
	
	removeListener : function(listener) {
		for (var i = 0; i < this._listeners.length; i++) {
				this._listeners.splice(i,1);
			if (this._listeners[i] == listener) {
				return;
			}
		}
	},
}