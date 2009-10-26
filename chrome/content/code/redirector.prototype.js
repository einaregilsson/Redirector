//// $Id$

Redirector.prototype = {
	
	//rdIRedirector implementation
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
	
    addRedirect : function(redirect) {
        this._list.push(redirect);
        this.save();
    },

    debug : function(msg) {
        if (this._prefs.debugEnabled) {
            this._cout.logStringMessage('REDIRECTOR: ' + msg);
        }
    },
    
    deleteRedirectAt : function(index) {
        this._list.splice(index, 1);
        this.save();
    },
    
   	exportRedirects : function(file) {
		var fileStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
		const PR_WRONLY      = 0x02;
		const PR_CREATE_FILE = 0x08;
		const PR_TRUNCATE    = 0x20;

		fileStream.init(file, PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE, 0644, 0);
		var stream = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
		stream.init(fileStream, "UTF-8", 16384, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		stream.writeString(this._redirectsAsString('\n'));
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
    
	importRedirects : function(file) {
		var fileStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		fileStream.init(file, 0x01, 0444, 0); //TODO: Find the actual constants for these magic numbers

		var stream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
		stream.init(fileStream, "UTF-8", 16384, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		stream = stream.QueryInterface(Ci.nsIUnicharLineInputStream);

		var importCount = 0, existsCount = 0;
		var lines = [];
		var line = {value: null};
		stream.readLine(line);
		while (line.value) {
			var redirect = new Redirect();
			redirect.deserialize(line.value.replace('\n', ''));
			if (this._containsRedirect(redirect)) {
				existsCount++;
			} else {
				this._list.push(redirect);
				importCount++;
			}
			stream.readLine(line);
		}
		stream.close();
		this.save();
		return importCount | (existsCount << 16);
	},
    
    reload : function() {
		loader.loadSubScript('chrome://redirector/content/code/redirector.prototype.js');
		loader.loadSubScript('chrome://redirector/content/code/redirect.js');
		var oldEnabled = this.enabled;
		for (var key in Redirector.prototype) {
			if (key != 'redirectCount' && key != 'enabled') {
				this[key] = Redirector.prototype[key];
			}
		}
		this._init();
		this.enabled = oldEnabled;
    }, 
    
    save : function() {
        this._prefs.redirects = this._redirectsAsString(':::');
    },

	switchItems : function(index1, index2) {
		var item = this._list[index1];
		this._list[index1] = this._list[index2];
		this._list[index2] = item;
		this.save();
	},
    
    //End rdIRedirector    
    
    // nsIContentPolicy implementation
    shouldLoad: function(contentType, contentLocation, requestOrigin, aContext, mimeTypeGuess, extra) {
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
	onChannelRedirect: function(oldChannel, newChannel, flags)
	{
		try {
			let newLocation = newChannel.URI.spec;
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
			dump("Redirector: Unexpected error in onChannelRedirect: " + e + "\n");
		}
	},
	//end nsIChannelEventSink
	
	//Private members and methods
			
	_prefs : null,
	_list : null,
    _strings : null,
    _cout : Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),

    _init : function() {
	    if (this._prefs) {
		    this._prefs.dispose();
	    }
	    this._prefs = new Prefs();
	    //Check if we need to update existing redirects
		var data = this._prefs.redirects;
	    var version = this._prefs.version;
	    this._loadStrings();
	    
	    //Here update checks are handled
	    if (version == 'undefined') { //Either a fresh install of Redirector, or first time install of v2.0
	        if (data) { //There is some data in redirects, we are upgrading from a previous version, need to upgrade data
	            var tempList = JSON.parse(data);
	            var arr;
	            var newArr = []
	            for each (arr in tempList) {
	                if (arr.length == 5) {
	                    arr.push(''); //For those that don't have an exclude pattern. Backwards compatibility is a bitch!
	                }
	                arr.splice(3,1); //Remove the "only if link exists" data
	                newArr.push(arr.join(',,,'));
	            }
	            this._prefs.redirects = newArr.join(':::');
	        }
	        this._prefs.version = '2.0';
	    }
	    //Update finished
	    
	    //Now get from the new format
	    data = this._prefs.redirects;
	    var arr;
	    this._list = [];
	    if (data != '') {
	        for each (redirectString in data.split(':::')) {
		        var redirect = new Redirect();
		        redirect.deserialize(redirectString);
		        this._list.push(redirect);
	        }
	    }
    },
    
    _loadStrings : function() {
        var src = 'chrome://redirector/locale/redirector.properties';
        var localeService = Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService);
        var appLocale = localeService.getApplicationLocale();
        var stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
        this._strings = stringBundleService.createBundle(src, appLocale);    
    },    

    _redirectsAsString : function(seperator) {
		return [r.serialize() for each (r in this._list)].join(seperator);
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
        Cc["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Ci.nsIPromptService)
                .alert(null, title, text);
    },

    _makeAbsoluteUrl : function(currentUrl, relativeUrl) {
        
        if (relativeUrl.match(/https?:/)) {
            return relativeUrl;
        } 
        
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var uri = ioService.newURI(currentUrl, null, null); 
        
        return uri.resolve(relativeUrl);
    }
};
