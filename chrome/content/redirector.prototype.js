//// $Id$

Cc = Components.classes;
Ci = Components.interfaces;
Cr = Components.results;
kRedirectorWildcard = 'W';
kRedirectorRegex= 'R';
nsIContentPolicy = Ci.nsIContentPolicy;


Redirector.prototype = {
    prefBranch : null,
    list : null,
    strings : null,
    cout : Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),

    init : function() {
	    this.prefBranch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.redirector.");
	
	    //Check if we need to update existing redirects
	
	    var data = this.prefBranch.getCharPref('redirects');
	    var version = this.prefBranch.getCharPref('version');
	    this.debugEnabled = this.prefBranch.getBoolPref('debug');
	    this.enabled = this.prefBranch.getBoolPref('enabled');
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
	            this.prefBranch.setCharPref('redirects', newArr.join(':::'));
	        }
	        this.prefBranch.setCharPref('version', '2.0');
	    }
	    //Update finished
	    
	    //Now get from the new format
	    data = this.prefBranch.getCharPref('redirects');
	    var arr;
	    this.list = [];
	    if (data != '') {
	        for each (redirectString in data.split(':::')) {
	            arr = redirectString.split(',,,');
	            this.list.push({
	                exampleUrl          : arr[0],
	                pattern             : arr[1],
	                redirectUrl         : arr[2],
	                patternType         : arr[3],
	                excludePattern      : arr[4],
	                unescapeMatches		: !!arr[5] //This might be undefined for those upgrading from 1.7.1 but that's ok
	            });
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
        if (this.debugEnabled) {
            this.cout.logStringMessage('REDIRECTOR: ' + msg);
        }
    },
    
    // nsIContentPolicy interface implementation
    shouldLoad: function(contentType, contentLocation, requestOrigin, aContext, mimeTypeGuess, extra) {
        if (!this.enabled) {
            return nsIContentPolicy.ACCEPT;
        }
        if (contentLocation.scheme != "http" && contentLocation.scheme != "https") {
            return nsIContentPolicy.ACCEPT;
        }

        if (contentType != nsIContentPolicy.TYPE_DOCUMENT) {
            return nsIContentPolicy.ACCEPT;
        }
        
        if (!aContext || !aContext.loadURI) {
            return nsIContentPolicy.ACCEPT;
        }
        this.debug("CHECK: " + contentLocation.spec);
        
        var url = contentLocation.spec;
        
        for each (var redirect in this.list) {
            var redirectUrl = this.getRedirectUrl(url, redirect);
            if (redirectUrl) {
                redirectUrl = this.makeAbsoluteUrl(url, redirectUrl);
                this.debug('Redirecting ' + url + ' to ' + redirectUrl);
                aContext.loadURI(redirectUrl, requestOrigin, null);
                return nsIContentPolicy.REJECT_REQUEST;
            }
        }
        return nsIContentPolicy.ACCEPT;
    },

    // nsIContentPolicy interface implementation
    shouldProcess: function(contentType, contentLocation, requestOrigin, insecNode, mimeType, extra) {
        return nsIContentPolicy.ACCEPT;
    },

    setEnabled : function(val) {
        this.enabled = val;
        this.prefBranch.setBoolPref('enabled', val);
    },
    
    reload : function() {
		Cc["@mozilla.org/moz/jssubscript-loader;1"]
			.getService(Ci.mozIJSSubScriptLoader)
				.loadSubScript('chrome://redirector/content/redirector.prototype.js');
		
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
        var r
          , tempList = [];

        for each (r in this.list) {
            tempList.push([r.exampleUrl, r.pattern, r.redirectUrl, r.patternType, r.excludePattern, r.unescapeMatches].join(',,,'));
        }
        this.prefBranch.setCharPref('redirects', tempList.join(':::'));
    },
    
    getBoolPref : function(name) {
        return this.prefBranch.getBoolPref(name);
    },
    
    regexMatch : function(pattern, text, redirectUrl, unescapeMatches) {

        if (!pattern) {
            return null;
        }
        var strings, rx, match;
        try {
            rx = new RegExp(pattern, 'gi');
            match = rx.exec(text);
        } catch(e) {
            this.msgBox(this.strings.GetStringFromName('extensionName'), this.strings.formatStringFromName('regexPatternError', [pattern, e.toString()],2));
            return null;
        }

        var rxrepl;

        if (match) {
            for (var i = 1; i < match.length; i++) {
                rxrepl = new RegExp('\\$' + i, 'gi');
                redirectUrl = redirectUrl.replace(rxrepl, unescapeMatches ? unescape(match[i]) : match[i]);
            }
            return redirectUrl;
        }

        return null;

    },

    msgBox : function(title, text) {
        Cc["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Ci.nsIPromptService)
                .alert(null, title, text);
    },

    getRedirectUrl: function(url, redirect) {
    
        if (redirect.patternType == kRedirectorWildcard) {
            if (this.wildcardMatch(redirect.excludePattern, url, 'whatever')) {
                this.debug(url + ' matches exclude pattern ' + redirect.excludePattern);
                return null;
            }
            return this.wildcardMatch(redirect.pattern, url, redirect.redirectUrl, redirect.unescapeMatches);
        } else if (redirect.patternType == kRedirectorRegex) {
            if (this.regexMatch(redirect.excludePattern, url, 'whatever')) {
                this.debug(url + ' matches exclude pattern ' + redirect.excludePattern);
                return null;
            }
            return this.regexMatch(redirect.pattern, url, redirect.redirectUrl, redirect.unescapeMatches);
        }
        return null;
    },

    makeAbsoluteUrl : function(currentUrl, relativeUrl) {
        
        if (relativeUrl.match(/https?:/)) {
            return relativeUrl;
        } 
        
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        //this.debug(currentUrl);
        var uri = ioService.newURI(currentUrl, null, null); 
        
        return uri.resolve(relativeUrl);
    },
    
    wildcardMatch : function(pattern, text, redirectUrl, unescapeMatches) {

	    if (!pattern || !text) {
	    	return null;
		}
		if (pattern.indexOf('*') == -1) {
			return (pattern == text) ? redirectUrl : null;
		}
		
		var parts = pattern.split('*');  
		var first = parts[0], 
		    last  = parts[parts.length-1];

		if (first) {
			if (text.substr(0, first.length) != first) {
				return null;
			}
			text = text.substr(first.length);
		}

		if (last) {
			if (text.substr(text.length-last.length) != last) {
				return null;
			}
			text = text.substr(0, text.length-last.length);
		}
		
		if ((first || last) && parts.length == 2) {
			return redirectUrl.replace('$1', text);
		}
		parts.splice(0,1);
		parts.splice(parts.length-1,1);
		var pos = 0, lastPos = 0;
    	var matches = [];
		for each(part in parts) {
            pos = text.indexOf(part, lastPos);
            if (pos == -1) {
                return null;
            }
            var match = text.substr(lastPos, pos-lastPos);
            matches.push(match);
            lastPos = pos + part.length;
        }
        matches.push(text.substr(lastPos));
        for (var i = 1; i <= matches.length; i++) {
            redirectUrl = redirectUrl.replace(new RegExp('\\$' + i, 'gi'), unescapeMatches ? unescape(matches[i-1]) : matches[i-1]);
        }

        return redirectUrl;
    }
};
