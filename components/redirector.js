//// $Id$
const CSSB_CONTRACTID = "@einaregilsson.com/redirector;1";
const CSSB_CID = Components.ID("{b7a7a54f-0581-47ff-b086-d6920cb7a3f7}");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const kRedirectorWildcard = 'W';
const kRedirectorRegex= 'R';

const nsIContentPolicy = Ci.nsIContentPolicy;
function RedirectorPolicy() {
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
                excludePattern      : arr[4]
            });
        }
    }
}

RedirectorPolicy.prototype = {
    prefBranch : null,
    list : null,
    strings : null,
    cout : Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),

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

    shouldProcess: function(contentType, contentLocation, requestOrigin, insecNode, mimeType, extra) {
        return nsIContentPolicy.ACCEPT;
    },

    setEnabled : function(val) {
        this.enabled = val;
        this.prefBranch.setBoolPref('enabled', val);
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
            tempList.push([r.exampleUrl, r.pattern, r.redirectUrl, r.patternType, r.excludePattern].join(',,,'));
        }
        this.prefBranch.setCharPref('redirects', tempList.join(':::'));
    },
    
    getBoolPref : function(name) {
        return this.prefBranch.getBoolPref(name);
    },
    
    regexMatch : function(pattern, text, redirectUrl) {

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
                redirectUrl = redirectUrl.replace(rxrepl, match[i]);
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
            return this.wildcardMatch(redirect.pattern, url, redirect.redirectUrl);
        } else if (redirect.patternType == kRedirectorRegex) {
            if (this.regexMatch(redirect.excludePattern, url, 'whatever')) {
                this.debug(url + ' matches exclude pattern ' + redirect.excludePattern);
                return null;
            }
            return this.regexMatch(redirect.pattern, url, redirect.redirectUrl);
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

    wildcardMatch : function(pattern, text, redirectUrl) {
        var parts
          , part
          , i
          , pos
          , originalText
          , stars;

        if (!pattern) {
            return null;
        }
        parts = pattern.split('*');

        stars = [];
        originalText = text;
        var starStart = -1;

        for (i in parts) {

            part = parts[i];

            pos = text.lastIndexOf(part);

            if (pos == -1) {
                return null;
            }

            if (i == 0 && pos != 0) {
                return null;
            }

            if (i == parts.length -1 && i != "" && text.substr(text.length - part.length) != part) {
                return null;

            }
            
            if (i == 0) {
                //Do nothing, part will be added on next run
            } else if (i == parts.length-1 && parts[i] == '') {
                stars.push(text);
            } else {
                stars.push(text.substr(0, pos));
            }
            
            text = text.substr(pos + part.length);
        }
        
        for (var i = 1; i <= stars.length; i++) {
            redirectUrl = redirectUrl.replace(new RegExp('\\$' + i, 'gi'), stars[i-1]);
        }

        return redirectUrl;
    }
};

/*
 * Factory object
 */

var redirectorInstance = null;

const factory = {
    // nsIFactory interface implementation
    createInstance: function(outer, iid) {
        if (outer != null) {
           Components.returnCode = Cr.NS_ERROR_NO_AGGREGATION;
           return null;
       }

        if (!iid.equals(Ci.nsIContentPolicy) &&
                !iid.equals(Ci.nsISupports)) {
            Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;          
            return null;
        }

        if(!redirectorInstance) {
            redirectorInstance = new RedirectorPolicy();
            redirectorInstance.wrappedJSObject = redirectorInstance;
        }

        return redirectorInstance;
    },

    // nsISupports interface implementation
    QueryInterface: function(iid) {
        if (iid.equals(Ci.nsISupports) ||
                iid.equals(Ci.nsIModule) ||
                iid.equals(Ci.nsIFactory)) {
            return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;          
        return null;   
    }
}


/*
 * Module object
 */
const module = {
    registerSelf: function(compMgr, fileSpec, location, type) {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CSSB_CID, 
                                        "Redirector content policy",
                                        CSSB_CONTRACTID,
                                        fileSpec, location, type);

        var catman = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
        catman.addCategoryEntry("content-policy", CSSB_CONTRACTID, CSSB_CONTRACTID, true, true);
    },

    unregisterSelf: function(compMgr, fileSpec, location) {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar).unregisterFactoryLocation(CSSB_CID, fileSpec);
        Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager).deleteCategoryEntry("content-policy", CSSB_CONTRACTID, true);
    },

    getClassObject: function(compMgr, cid, iid) {
        if (cid.equals(CSSB_CID)) {
            return factory;
        }

        Components.returnCode = Cr.NS_ERROR_NOT_REGISTERED;
        return null;
    },

    canUnload: function(compMgr) {
        return true;
    }
};

function NSGetModule(comMgr, fileSpec) {
    return module;
}