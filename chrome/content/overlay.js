//// $Id$

var RedirectorOverlay = {

    id          : "redirector@einaregilsson.com",
    name        : "Redirector",
    initialized : false,
    strings     : null,

    onLoad : function(event) {
        try {

            // initialization code
            RedirLib.initialize(this);
            RedirLib.debug("Initializing...");

            $('contentAreaContextMenu')
                .addEventListener("popupshowing", function(e) { RedirectorOverlay.showContextMenu(e); }, false);

            Redirector.init();

            var appcontent = window.document.getElementById('appcontent');
            this.overrideOnStateChange();            

            if (appcontent && !appcontent.processed) {
                appcontent.processed = true;

                appcontent.addEventListener('DOMContentLoaded', function(event) {

                    RedirectorOverlay.onDOMContentLoaded(event);

                }, false);
            }
            this.strings = document.getElementById("redirector-strings");
            Redirector.strings = this.strings;
            this.prefObserver.register();
            this.setStatusBarImg();

            RedirLib.debug("Finished initialization");
            this.initialized = true;

        } catch(e) {
            //Don't use RedirLib because it's initialization might have failed.
            if (this.strings) {
                alert(this.strings.getString("initError")._(this.name) + "\n\n" + e);
            } else {
                alert(e);
            }
        }
    },

    overrideOnStateChange : function() {
        var origOnStateChange = nsBrowserStatusHandler.prototype.onStateChange;

        nsBrowserStatusHandler.prototype.onStateChange = function(aWebProgress, aRequest, aStateFlags, aStatus) {

            if(aStateFlags & Ci.nsIWebProgressListener.STATE_START
            && aStateFlags| Ci.nsIWebProgressListener.STATE_IS_NETWORK
            && aStateFlags| Ci.nsIWebProgressListener.STATE_IS_REQUEST
                && aRequest && aWebProgress.DOMWindow == content) {
      
                //If it's not a GET request we'll always do a slow redirect so the web will continue
                //to work in the way you'd expect
                try {
                    var oHttp = aRequest.QueryInterface(Ci.nsIHttpChannel);
                    var method = oHttp.requestMethod;
          
                    if (method != "GET") {
                        origOnStateChange.apply(this, arguments);
                        return;
                    }
        
                } catch(ex) {
                    origOnStateChange.apply(this, arguments);
                    return;
                }

                var uri = aRequest.QueryInterface(Ci.nsIChannel).URI.spec;
                
                RedirLib.debug('Checking url %1 for instant redirect'._(uri));
                var redirectUrl = Redirector.getRedirectUrlForInstantRedirect(uri);
                if (redirectUrl.url && oHttp.notificationCallbacks) {
                    const NS_BINDING_ABORTED = 0x804b0002;
                    aRequest.cancel(NS_BINDING_ABORTED);
                    var newStateFlags = Ci.nsIWebProgressListener.STATE_STOP | Ci.nsIWebProgressListener.STATE_IS_NETWORK | Ci.nsIWebProgressListener.STATE_IS_REQUEST;
                    origOnStateChange.call(this, aWebProgress, aRequest, newStateFlags, "");
                    var interfaceRequestor = oHttp.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);
                    var targetDoc = interfaceRequestor.getInterface(Ci.nsIDOMWindow).document;    
                    var gotoUrl = Redirector.makeAbsoluteUrl(uri, redirectUrl.url);
                    Redirector.goto(gotoUrl, redirectUrl.pattern, uri, targetDoc); 
                } else {
                    origOnStateChange.apply(this, arguments);
                }

            } else {
                origOnStateChange.apply(this, arguments);
            }
            
        };
    },

    onDOMContentLoaded : function(event) {
        var redirect, link, links, url;

        if (event.target != window.content.document) {
            return;
        }

        url = window.content.location.href;

        RedirLib.debug('Processing url %1'._(url));
        Redirector.processUrl(url, window.content);
    },


    onUnload : function(event) {
        RedirectorOverlay.prefObserver.unregister();
        Redirector.prefObserver.unregister();
        //Clean up here
        RedirLib.debug("Finished cleanup");
    },

    showContextMenu : function(event) {
        if (gContextMenu.onLink) {
            $("redirector-context").label = this.strings.getString('addLinkUrl');
        } else {
            $("redirector-context").label = this.strings.getString('addCurrentUrl');
        }
    },

    onContextMenuCommand: function(event) {

        var item = { exampleUrl : window.content.location.href, pattern: window.content.location.href};
        if (gContextMenu.onLink) {
            item.redirectUrl = gContextMenu.link.toString();
        }

        window.openDialog("chrome://redirector/content/redirect.xul",
                    "redirect",
                    "chrome,dialog,modal,centerscreen", item);

        if (item.saved) {
            Redirector.addRedirect(item);
        }

    },

    onMenuItemCommand: function(event) {
        window.openDialog("chrome://redirector/content/redirectList.xul",
                    "redirectList",
                    "chrome,dialog,modal,centerscreen", this);

    },

    toggleEnabled : function(event) {
        RedirLib.setBoolPref('enabled', !RedirLib.getBoolPref('enabled'));
    },

    setStatusBarImg : function() {
        var statusImg = $('redirector-statusbar-img');

        if (RedirLib.getBoolPref('enabled')) {
            statusImg.src = 'chrome://redirector/content/statusactive.png'
            statusImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
            Redirector.enabled = true;
        } else {
            statusImg.src = 'chrome://redirector/content/statusinactive.png'
            statusImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
            Redirector.enabled = false;
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
            if (topic == 'nsPref:changed' && data == 'extensions.redirector.enabled') {
                RedirectorOverlay.setStatusBarImg();
            }
        }

    }


};
window.addEventListener("load", function(event) { RedirectorOverlay.onLoad(event); }, false);
window.addEventListener("unload", function(event) { RedirectorOverlay.onUnload(event); }, false);