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

        params = { inn : { url : window.content.location.href}, out : {} };
        if (gContextMenu.onLink) {
            params.inn.redirect = gContextMenu.link.toString();
        }

        window.openDialog("chrome://redirector/content/redirect.xul",
                    "redirect",
                    "chrome,dialog,modal,centerscreen", params);

        if (params.out.pattern) {
            Redirector.addRedirect(params.out);
        }

    },

    onMenuItemCommand: function(event) {
        window.openDialog("chrome://redirector/content/redirectList.xul",
                    "redirectList",
                    "chrome,dialog,modal,centerscreen", this);

    },

};
window.addEventListener("load", function(event) { RedirectorOverlay.onLoad(event); }, false);
window.addEventListener("unload", function(event) { RedirectorOverlay.onUnload(event); }, false);