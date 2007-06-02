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

            if (appcontent && !appcontent.processed) {
                appcontent.processed = true;

                appcontent.addEventListener('DOMContentLoaded', function(event) {

                    RedirectorOverlay.onDOMContentLoaded(event);

                }, false);
            }
            this.strings = document.getElementById("redirector-strings");

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

    onDOMContentLoaded : function(event) {
        var redirect, link, links, url;

        if (event.target != window.content.document) {
            return;
        }

        url = window.content.location.href;

        RedirLib.debug('Processing url %1'._(url));
        Redirector.processUrl(url);
    },


    onUnload : function(event) {
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
        } else {
            statusImg.src = 'chrome://redirector/content/statusinactive.png'
            statusImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
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


