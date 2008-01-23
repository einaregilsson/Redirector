const kRedirectorWildcard = 'W';
const kRedirectorRegex= 'R';

var Redirector = {

    list : [],

    enabled : true,

    init : function() {
        this.load();
        this.prefObserver.register();
    },
    
    unload : function() {
        this.prefObserver.unregister();
    },

    save : function() {
        var r
          , tempList = [];

        for each (r in this.list) {
            tempList.push([r.exampleUrl, r.pattern, r.redirectUrl, r.onlyIfLinkExists, r.patternType, r.excludePattern]);
        }
        RedirLib.setCharPref('redirects', tempList.toSource());
    },

    load : function() {
        var tempList = eval(RedirLib.getCharPref('redirects'));
        var arr;

        this.list = [];

        for each (arr in tempList) {
            this.list.push({
                exampleUrl          : arr[0],
                pattern             : arr[1],
                redirectUrl         : arr[2],
                onlyIfLinkExists    : arr[3],
                patternType         : arr[4],
                excludePattern      : arr[5] || ''
            });
        }

    },

    addRedirect : function(redirect) {
        this.list.push(redirect);
        this.save();
    },

    deleteAt : function(index) {
        this.list.splice(index, 1);
        this.save();
    },

    getRedirectUrlForInstantRedirect : function(url) {
        var redirect, link, links, redirectUrl;

        if (this.enabled) {

            for each (redirect in this.list) {

                redirectUrl = this.getRedirectUrl(url, redirect);
                //Can't do fast redirect if it requires that link exists
                //we need the original page to verify that it exists.
                //Slow redirect will be done automatically.
                if (redirectUrl) {
                    if (redirect.redirectUrl.startsWith('xpath:')) {
                        RedirLib.msgBox(this.strings.getString('extensionName'), this.strings.getString('xpathDeprecated'));
                    } else if (!redirect.onlyIfLinkExists) {
                        RedirLib.debug('%1 matches %2, and it\'s not only if link exists. Can do instant redirect.'._(redirect.pattern, url));
                        return { 'url' : redirectUrl, 'pattern' : redirect.pattern};
                    } else {
                        RedirLib.debug('%1 matches %2, but it\'s "only if link exists" and so has to be a slow redirect'._(redirect.pattern, url));
                    }
                }
            }
        }
        return { 'url' : null, 'pattern' : null};
    },

    getRedirectUrl: function(url, redirect) {
    
        if (redirect.patternType == kRedirectorWildcard) {
            if (this.wildcardMatch(redirect.excludePattern, url, 'whatever')) {
                RedirLib.debug('%1 matches exclude pattern %2'._(url, redirect.excludePattern));
                return null;
            }
            return this.wildcardMatch(redirect.pattern, url, redirect.redirectUrl);
        } else if (redirect.patternType == kRedirectorRegex) {
            if (this.regexMatch(redirect.excludePattern, url, 'whatever')) {
                RedirLib.debug('%1 matches exclude pattern %2'._(url, redirect.excludePattern));
                return null;
            }
            return this.regexMatch(redirect.pattern, url, redirect.redirectUrl);
        }
        return null;
    },

    processUrl : function(url, doc) {
        var redirect, link, links, redirectUrl;

        if (!this.enabled) {
            return;
        }

        for each (redirect in this.list) {

            redirectUrl = this.getRedirectUrl(url, redirect);

            if (redirectUrl) {
                RedirLib.debug('%1 matches %2'._(redirect.pattern, url));
                if (redirect.onlyIfLinkExists) {
                    links = window.content.document.getElementsByTagName('a');

                    for each(link in links) {

                        if (link.href && link.href.toString() == redirectUrl) {
                            RedirLib.debug('Found a link for %1'._(redirectUrl));
                            this.goto(redirectUrl, redirect.pattern, url, doc);
                            return;
                        }
                    }

                    RedirLib.debug('Did not find a link for %1'._(redirectUrl));

                } else {
                    this.goto(redirectUrl, redirect.pattern, url, doc);
                }
            }
        }
    },
    
    makeAbsoluteUrl : function(currentUrl, relativeUrl) {
        
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
            return relativeUrl;
        } 
        
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        RedirLib.debug(currentUrl);
        var uri = ioService.newURI(currentUrl, null, null); 
        
        return uri.resolve(relativeUrl);
    },

    goto : function(redirectUrl, pattern, url, doc) {

        redirectUrl = this.makeAbsoluteUrl(url, redirectUrl);

        if (redirectUrl.startsWith('xpath:')) {
            //Do nothing, the instant redirect will have popped up a message
        } else if (redirectUrl == url) {
            RedirLib.msgBox(this.strings.getString('extensionName'), this.strings.getFormattedString('recursiveError', [pattern, redirectUrl]));
        } else {
            doc.location.href = redirectUrl;
        }
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
            //HACK, need to make this better
            if (window.RedirectorOverlay) {
                strings = window.RedirectorOverlay.strings;
            } else if(window.Redirect) {
                strings = window.Redirect.strings;
            }
            RedirLib.msgBox(strings.getString('extensionName'), strings.getFormattedString('regexPatternError', [pattern, e.toString()]));
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

            pos = text.indexOf(part);

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
    },

    openHelp : function() {
        var windowName = "redirectorHelp";
        var windowsMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win;
        var iter = windowsMediator.getEnumerator(null);
        while (iter.hasMoreElements()) {
            win = iter.getNext();
            if (win.name == windowName) {
                win.focus();
                return;
            }
        }
        window.openDialog("chrome://redirector/content/help.html", windowName, "chrome,dialog,resizable=yes,location=0,toolbar=0,status=0,width=800px,height=600px,centerscreen", this);
    },


    openSettings : function() {
        var windowName = "redirectorSettings";
        var windowsMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win = windowsMediator.getMostRecentWindow(windowName);
        if (win) {
            win.focus();
        } else {
            window.openDialog("chrome://redirector/content/redirectList.xul",
                    windowName,
                    "chrome,dialog,resizable=no,centerscreen", this);
        }
    
    },
    
    prefObserver : {

        getService : function() {
            return Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranchInternal);
        },

        register: function() {
            this.getService().addObserver('extensions.redirector', this, false);
        },

        unregister: function() {
            this.getService().removeObserver('extensions.redirector', this);
        },

        observe : function(subject, topic, data) {
            if (topic != 'nsPref:changed') {
                return;
            }
            
            if (!window.Redirector) {
                return;
            }

            if (data == 'extensions.redirector.redirects') {
                Redirector.load();
            } else if (data == 'extensions.redirector.enabled') {
                Redirector.enabled = RedirLib.getBoolPref('enabled');
            }
        }

    }
};

