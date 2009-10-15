//// $Id$

Cc = Components.classes;
Ci = Components.interfaces;
Cr = Components.results;
nsIContentPolicy = Ci.nsIContentPolicy;

Redirector.prototype = {

	prefs : null,
	list : null,
    strings : null,
    cout : Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),
    
    

    init : function() {
	    this.prefs = new Prefs();
	    //Check if we need to update existing redirects
	
	    var data = this.prefs.redirects;
	    var version = this.prefs.version;
	    this.loadStrings();
	    //Here update checks are handled
	    if (version == 'undefined') { //Either a fresh install of Redirector, or first time install of v2.0
	        if (data) { //There is some data in redirects, we are upgrading from a previous version, need to upgrade data
	            var tempList = eval(data);
	            var arr;
	            var newArr = []
	            for each (arr in tempList) {
	                if (arr.length == 5) {
	                    arr.push(''); //For those that don't have an exclude pattern. Backwards compatibility is a bitch!
	                }
	                arr.splice(3,1); //Remove the "only if link exists" data
	                newArr.push(arr.join(',,,'));
	            }
	            this.prefs.redirects = newArr.join(':::');
	        }
	        this.prefs.version = '2.0';
	    }
	    //Update finished
	    
	    //Now get from the new format
	    data = this.prefs.redirects;
	    var arr;
	    this.list = [];
	    if (data != '') {
	        for each (redirectString in data.split(':::')) {
		        var redirect = new Redirect();
		        redirect.deserialize(redirectString);
		        this.list.push(redirect);
	        }
	    }
    },
    
    loadStrings : function() {
        var src = 'chrome://redirector/locale/redirector.properties';
        var localeService = Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService);
        var appLocale = localeService.getApplicationLocale();
        var stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
        this.strings = stringBundleService.createBundle(src, appLocale);    
    },    
    
    debug : function(msg) {
        if (this.prefs.debugEnabled) {
            this.cout.logStringMessage('REDIRECTOR: ' + msg);
        }
    },
    
    // nsIContentPolicy interface implementation
    shouldLoad: function(contentType, contentLocation, requestOrigin, aContext, mimeTypeGuess, extra) {
	    try {
		    if (!this.prefs.enabled) {
	            return nsIContentPolicy.ACCEPT;
	        }
	        
	        if (contentType != nsIContentPolicy.TYPE_DOCUMENT) {
	            return nsIContentPolicy.ACCEPT;
	        }

	        if (contentLocation.scheme != "http" && contentLocation.scheme != "https") {
	            return nsIContentPolicy.ACCEPT;
	        }
	        
	        if (!aContext || !aContext.loadURI) {
	            return nsIContentPolicy.ACCEPT;
	        }
	        this.debug("Checking " + contentLocation.spec);
	        
	        var url = contentLocation.spec;
	        
	        for each (var redirect in this.list) {
		        //this.debug(redirect);
	            var result = redirect.getMatch(url);
	            if (result.isExcludeMatch) {
		        	this.debug(url + ' matched exclude pattern ' + redirect.excludePattern + ' so the redirect ' + redirect.includePattern + ' will not be used');
	            } else if (result.isDisabledMatch) {
		        	this.debug(url + ' matched pattern ' + redirect.includePattern + ' but the redirect is disabled');
	            } else if (result.isMatch) {
	                redirectUrl = this.makeAbsoluteUrl(url, result.redirectTo);
	                this.debug('Redirecting ' + url + ' to ' + redirectUrl);
	                aContext.loadURI(redirectUrl, requestOrigin, null);
	                return nsIContentPolicy.REJECT_REQUEST;
	            }
	        }
        } catch(e) {
	    	this.debug(e);   
        }
        return nsIContentPolicy.ACCEPT;
    },

    // nsIContentPolicy interface implementation
    shouldProcess: function(contentType, contentLocation, requestOrigin, insecNode, mimeType, extra) {
        return nsIContentPolicy.ACCEPT;
    },

    reload : function() {
		loader.loadSubScript('chrome://redirector/content/code/redirector.prototype.js');
		loader.loadSubScript('chrome://redirector/content/code/redirect.js');
		
		for (var key in Redirector.prototype) {
			this[key] = Redirector.prototype[key];
		}
		this.init();
    }, 
    
    addRedirect : function(redirect) {
        this.list.push(redirect);
        this.save();
    },

    deleteAt : function(index) {
        this.list.splice(index, 1);
        this.save();
    },
    
    save : function() {
        this.prefs.redirects = this.redirectsAsString(':::');
    },
    
    redirectsAsString : function(seperator) {
		return [r.serialize() for each (r in this.list)].join(seperator);
    },
    
	exportRedirects : function(file) {
		var fileStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
		const PR_WRONLY      = 0x02;
		const PR_CREATE_FILE = 0x08;
		const PR_TRUNCATE    = 0x20;

		fileStream.init(file, PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE, 0644, 0);
		var stream = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
		stream.init(fileStream, "UTF-8", 16384, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
		stream.writeString(this.redirectsAsString('\n'));
		stream.close();
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
			if (this.containsRedirect(redirect)) {
				existsCount++;
			} else {
				this.list.push(redirect);
				importCount++;
			}
			stream.readLine(line);
		}
		stream.close();
		this.save();
		return { imported : importCount, existed : existsCount };	
	},
	
	containsRedirect : function(redirect) {
		for each (var existing in this.list) {
			this.debug("EXAMPLEURL: " + (redirect.exampleUrl == existing.exampleUrl));
			this.debug("INCLUDEPATTERN: " + (redirect.includePattern == existing.includePattern));
			this.debug("EXCLUDEPATTERN: " + (redirect.excludePattern == existing.excludePattern));
			this.debug("unescape: " + (redirect.unescapeMatches == existing.unescapeMatches));
			this.debug("REDIRECTTO: " + (redirect.redirectUrl == existing.redirectUrl));
			this.debug("PATTERNTYPE: " + (redirect.patternType == existing.patternType));
			if (existing.equals(redirect)) {
				return true;
			}	
		}
		return false;
	},
	
    getString : function(name) {
	    return this.strings.GetStringFromName(name);
    },
    
    msgBox : function(title, text) {
        Cc["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Ci.nsIPromptService)
                .alert(null, title, text);
    },

    makeAbsoluteUrl : function(currentUrl, relativeUrl) {
        
        if (relativeUrl.match(/https?:/)) {
            return relativeUrl;
        } 
        
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var uri = ioService.newURI(currentUrl, null, null); 
        
        return uri.resolve(relativeUrl);
    }
};
