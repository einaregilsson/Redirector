Components.utils.import("chrome://redirector/content/js/xpcom.js");
Components.utils.import("chrome://redirector/content/js/redirect.js");
Components.utils.import("chrome://redirector/content/js/redirectorprefs.js");
Components.utils.import("chrome://redirector/content/js/proxyserver.js");

var EXPORTED_SYMBOLS = ['Redirector', 'rdump'];

function rdump(msg) {
	//dump(msg + '\n');
}

Redirector = {
	
	get enabled() {
		return this._prefs && this._prefs.enabled;	
	},
	
	set enabled(value) {
		if (this._prefs) {
			this._prefs.enabled = value;
		}
	},

	get redirectCount() {
		return this._list.length;
	},
	
	toString : function() {
		return "Redirector";
	},
	
	addRedirect : function(redirect) {
		this._list.push(redirect);
		this.save();
	},

	debug : function(msg) {
		if (this._prefs.debugEnabled) {
			ConsoleService.logStringMessage('REDIRECTOR: ' + msg);
		}
	},
	
	deleteRedirect : function(redirect) {
		this._list.splice(this._list.indexOf(redirect), 1);
		this.save();
	},
	
	exportRedirects : function(file) {
		const PR_WRONLY 	 = 0x02;
		const PR_CREATE_FILE = 0x08;
		const PR_TRUNCATE	 = 0x20;

		var fileStream = new FileOutputStream(file, PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE, 0644, 0);
		var stream = new ConverterOutputStream(fileStream, "UTF-8", 16384, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		var rjson = { createdBy : 'Redirector v' + this._prefs.version, createdAt : new Date(), redirects :[]};
		for each (var re in this._list) {
			rjson.redirects.push(re.toObject());
		}
		stream.writeString(JSON.stringify(rjson, null, 4));
		stream.close();
	},
	
	getRedirectAt : function(index) {
		return this._list[index];	
	},
	
	//Get the redirect url for the given url. This will not check if we are enabled, and
	//not do any verification on the url, just assume that it is a good string url that is for http/s
	getRedirectUrl : function(url) {
		this.debug("Checking " + url);
		
		for each (var redirect in this._list) {
			var result = redirect.getMatch(url);
			if (result.isExcludeMatch) {
				this.debug(url + ' matched exclude pattern ' + redirect.excludePattern + ' so the redirect ' + redirect.includePattern + ' will not be used');
			} else if (result.isDisabledMatch) {
				this.debug(url + ' matched pattern ' + redirect.includePattern + ' but the redirect is disabled');
			} else if (result.isMatch) {
				redirectUrl = this._makeAbsoluteUrl(url, result.redirectTo);
				
				//check for loops...
				result = redirect.getMatch(redirectUrl);
				if (result.isMatch) {
					var title = this._getString('invalidRedirectTitle');
					var msg = this._getFormattedString('invalidRedirectText', [redirect.includePattern, url, redirectUrl]);
					this.debug(msg);
					redirect.disabled = true;
					this.save();					
					this._msgBox(title, msg);
				} else {
					this.debug('Redirecting ' + url + ' to ' + redirectUrl);
					return redirectUrl;
				}
			}
		}
		return null;
	},
	
	QueryInterface: function(iid) {
		if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIContentPolicy) || iid.equals(Ci.nsIChannelEventSink)) {
			return this;
		}
		throw Cr.NS_ERROR_NO_INTERFACE;
	},
	
	_getRedirectsFile : function() {
		var file = DirectoryService.get("ProfD", Ci.nsIFile);
		file.append('redirector.rjson');
		return file;
	},	
	
	handleUpgrades : function(){
		var currentVersion = '3.0';
		this._list = [];

		if (this._prefs.version == currentVersion) {
			return;
		}
		//Here update checks are handled
			
		try {
			var branch = PrefService.getBranch("extensions.redirector.");
			var data = branch.getCharPref("redirects");
		} catch(e) {
			this._prefs.version = currentVersion;
			return;
		}
		var arr;
		this._list = [];
		if (data != '') {
			for each (redirectString in data.split(':::')) {
				if (!redirectString || !redirectString.split) {
					continue;
					rdump('Invalid old redirect: ' + redirectString);
				}	
				var parts = redirectString.split(',,,');
				if (parts.length < 5) {
					throw Error("Invalid serialized redirect, too few fields: " + redirectString);
				}
				var redirect = new Redirect();
				redirect._init.apply(redirect, parts);
				this._list.push(redirect);
			}
			this.save();
			this._list = []; //Let the real loading start this properly
		}
		branch.deleteBranch('redirects');
		this._prefs.version = currentVersion;
	},	
	
	importRedirects : function(file) {
		var fileStream = new FileInputStream(file, 0x01, 0444, 0);
		var stream = new ConverterInputStream(fileStream, "UTF-8", 16384, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		var str = {};
		var rjson = '';
		while (stream.readString(4096, str) != 0) {
			rjson += str.value;
		}
		stream.close();
		var importCount = 0, existsCount = 0;
		rjson = JSON.parse(rjson);
		for each (var rd in rjson.redirects) {
			var redirect = new Redirect();
			redirect.fromObject(rd);
			if (this._containsRedirect(redirect)) {
				existsCount++;
			} else {
				this._list.push(redirect);
				importCount++;
			}
		}
		this.save();
		return importCount | (existsCount << 16);
	},

	save : function() {
		var file = this._getRedirectsFile();
		this.exportRedirects(file);
	},
	
	sortRedirects : function(sortFunc) {
		this._list.sort(sortFunc);
		this.save();
	},
	
	// nsIContentPolicy implementation
	shouldLoad: function(contentType, contentLocation, requestOrigin, aContext, mimeTypeGuess, extra) {
		if (contentLocation.scheme != "http" && contentLocation.scheme != "https") {
			return Ci.nsIContentPolicy.ACCEPT;
		} //Immediately, otherwise we will log all sorts of crap
			
		rdump('nsIContentPolicy::ShouldLoad ' + contentLocation.spec);
		try {
			//This is also done in getRedirectUrl, but we want to exit as quickly as possible for performance
			if (!this._prefs.enabled) {
				return Ci.nsIContentPolicy.ACCEPT;
			}
			
			if (contentType != Ci.nsIContentPolicy.TYPE_DOCUMENT) {
				return Ci.nsIContentPolicy.ACCEPT;
			}

			if (contentLocation.scheme != "http" && contentLocation.scheme != "https") {
				return Ci.nsIContentPolicy.ACCEPT;
			}
			
			if (!aContext || !aContext.loadURI) {
				return Ci.nsIContentPolicy.ACCEPT;
			}
			
			var redirectUrl = this.getRedirectUrl(contentLocation.spec);

			if (!redirectUrl) {
				return Ci.nsIContentPolicy.ACCEPT;
			}			

			aContext.loadURI(redirectUrl, requestOrigin, null);
			return Ci.nsIContentPolicy.REJECT_REQUEST;
		} catch(e) {
			this.debug(e);	 
		}
		
	},
	
	shouldProcess: function(contentType, contentLocation, requestOrigin, insecNode, mimeType, extra) {
		return Ci.nsIContentPolicy.ACCEPT;
	},
	//end nsIContentPolicy

	//nsIChannelEventSink implementation
	
	//For FF4.0. Got this from a thread about adblock plus, https://adblockplus.org/forum/viewtopic.php?t=5895
	asyncOnChannelRedirect: function(oldChannel, newChannel, flags, redirectCallback) {
		this.onChannelRedirect(oldChannel, newChannel, flags);
		redirectCallback.onRedirectVerifyCallback(0);
	},	
	
	onChannelRedirect: function(oldChannel, newChannel, flags)
	{
		try {
			let newLocation = newChannel.URI.spec;
			rdump('nsIChannelEventSink::onChannelRedirect ' + newLocation);

			if (!(newChannel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI)) {
				//We only redirect documents...
				return; 
			}

			if (!this._prefs.enabled) {
				return;
			}
			
			if (!newLocation) {
				return;
			}
			let callbacks = [];
			if (newChannel.notificationCallbacks) {
				callbacks.push(newChannel.notificationCallbacks);
			}
			if (newChannel.loadGroup && newChannel.loadGroup.notificationCallbacks) {
				callbacks.push(newChannel.loadGroup.notificationCallbacks);
			}
			var win;
			var webNav;
			for each (let callback in callbacks)
			{
				try {
					win = callback.getInterface(Ci.nsILoadContext).associatedWindow;
					webNav = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
					break;
				} catch(e) {}
			}
			if (!webNav) {
				return; 
			}
			var redirectUrl = this.getRedirectUrl(newLocation);

			if (redirectUrl) {
				webNav.loadURI(redirectUrl,null,null,null,null);
				throw Cr.NS_BASE_STREAM_WOULD_BLOCK; //Throw this because the real error we should throw shows up in console...
			}			
			
		} catch (e if (e != Cr.NS_BASE_STREAM_WOULD_BLOCK)) {
			// We shouldn't throw exceptions here - this will prevent the redirect.
			rdump("Redirector: Unexpected error in onChannelRedirect: " + e + "\n");
		}
	},
	//end nsIChannelEventSink
	
	//Private members and methods
			
	_prefs : null,
	_list : null,
	_strings : null,

	init : function() {
		if (this._prefs) {
			this._prefs.dispose();
		}
		ConsoleService.logStringMessage('REDIRECTOR CREATED');
		this._prefs = new RedirectorPrefs();
		//Check if we need to update existing redirects
		var data = this._prefs.redirects;
		var version = this._prefs.version;
		this._loadStrings();
		this._list = [];
		this.handleUpgrades();
		var redirectsFile = this._getRedirectsFile();
		if (redirectsFile.exists()) {
			this.importRedirects(redirectsFile);
		}
		
		RedirectorProxy.start(this._prefs.proxyServerPort);
		rdump('Registering as Proxy Filter');
		//var pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(Ci.nsIProtocolProxyService);		
		//pps.registerFilter(this, 0);
	},
	
	_loadStrings : function() {
		var src = 'chrome://redirector/locale/redirector.properties';
		var appLocale = LocaleService.getApplicationLocale();
		this._strings = StringBundleService.createBundle(src, appLocale);	 
	},	  
	
	_containsRedirect : function(redirect) {
		for each (var existing in this._list) {
			if (existing.equals(redirect)) {
				return true;
			}	
		}
		return false;
	},
	
	_getString : function(name) {
		return this._strings.GetStringFromName(name);
	},
	
	_getFormattedString : function(name, params) {
		return this._strings.formatStringFromName(name, params, params.length);
	},
	
	_msgBox : function(title, text) {
		PromptService.alert(null, title, text);
	},

	_makeAbsoluteUrl : function(currentUrl, relativeUrl) {
		
		if (relativeUrl.match(/https?:/)) {
			return relativeUrl;
		} 
		
		var uri = IOService.newURI(currentUrl, null, null); 
		return uri.resolve(relativeUrl);
	}
};

Redirector.init();