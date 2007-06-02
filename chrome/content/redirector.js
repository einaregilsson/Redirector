const kRedirectorWildcard = 'W';
const kRedirectorRegex= 'R';

var Redirector = {

    list : [],

    enabled : true,

    init : function() {
        this.load();
        this.prefObserver.register();
    },

    save : function() {
        var r
          , tempList = [];

        for each (r in this.list) {
            tempList.push([r.exampleUrl, r.pattern, r.redirectUrl, r.onlyIfLinkExists, r.patternType]);
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
                patternType         : arr[4]
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

    processUrl : function(url) {
        var redirect, link, links, redirectUrl, match;

        if (!this.enabled) {
            return;
        }

        for each (redirect in this.list) {

            var redirectUrl;

            if (redirect.patternType == kRedirectorWildcard) {
                match = this.wildcardMatch(redirect.pattern, url);
                redirectUrl = redirect.redirectUrl;
            } else if (redirect.patternType == kRedirectorRegex) {
                match = this.regexMatch(redirect.pattern, url);
                redirectUrl = redirect.redirectUrl;
            }

            if (match) {
                RedirLib.debug('%1 matches %2'._(redirect.pattern, url));
                if (redirect.onlyIfLinkExists) {
                    links = window.content.document.getElementsByTagName('a');

                    for each(link in links) {

                        if (link.href && link.href.toString() == redirectUrl) {
                            RedirLib.debug('Found a link for %1'._(redirectUrl));
                            this._goto(redirectUrl, redirect.pattern);
                            return;
                        }
                    }

                    RedirLib.debug('Did not find a link for %1'._(redirectUrl));

                } else {
                    this._goto(redirectUrl, redirect.pattern);
                }
            }
        }
    },

    _goto : function(redirectUrl, pattern) {

        if (redirectUrl == window.content.location.href) {
            RedirLib.msgBox(this.strings.getString('extensionName'), this.strings.getFormattedString('recursiveError', [pattern, redirectUrl]));
        } else {
            window.content.location.href = redirectUrl;
        }
    },

    regexMatch : function(pattern, text) {
        alert('regexmatch');

    },

    wildcardMatch : function(pattern, text) {
        var parts
          , part
          , i
          , pos;

        parts = pattern.split('*');

        for (i in parts) {

            part = parts[i];

            pos = text.indexOf(part);

            if (pos == -1) {
                return false;
            }

            if (i == 0 && pos != 0) {
                return false;
            }

            if (i == parts.length -1 && i != "" && text.substr(text.length - part.length) != part) {
                return false;

            }

            text = text.substr(pos + part.length);
        }

        return true;
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

            if (data == 'extensions.redirector.redirects') {
                Redirector.load();
            } else if (data == 'extensions.redirector.enabled') {
                Redirector.enabled = RedirLib.getBoolPref('enabled');
            }
        }

    },
};
