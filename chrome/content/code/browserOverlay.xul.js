//// $Id$

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;

var RedirectorOverlay = {

    strings     : null,

    onLoad : function(event) {
        try {

            // initialization code
            document.getElementById('contentAreaContextMenu')
                .addEventListener("popupshowing", function(e) { RedirectorOverlay.showContextMenu(e); }, false);
            
			document.getElementById('redirector-status').hidden = !Redirector.getBoolPref('showStatusBarIcon');
			document.getElementById('redirector-context').hidden = !Redirector.getBoolPref('showContextMenu');
               
            this.strings = document.getElementById("redirector-strings");
            this.prefObserver.register();
            this.setStatusBarImg();
		
        } catch(e) {
            if (this.strings) {
                alert(this.strings.getString("initError") + "\n\n" + e);
            } else {
                alert(e);
            }
        }
    },
    
    onUnload : function(event) {
        RedirectorOverlay.prefObserver.unregister();
        Redirector.debug("Finished cleanup");
    },

    showContextMenu : function(event) {
        if (gContextMenu.onLink) {
            document.getElementById("redirector-context").label = this.strings.getString('addLinkUrl');
        } else {
            document.getElementById("redirector-context").label = this.strings.getString('addCurrentUrl');
        }
    },

    onContextMenuCommand: function(event) {
		var redirect = new Redirect(window.content.location.href, window.content.location.href);
        if (gContextMenu.onLink) {
            redirect.redirectUrl = gContextMenu.link.toString();
        }

		var args = { saved : false, 'redirect' : redirect };
        window.openDialog("chrome://redirector/content/ui/editRedirect.xul", "redirect", "chrome,dialog,modal,centerscreen", args);
        if (args.saved) {
            Redirector.addRedirect(args.redirect);
        }
    },
        
    onMenuItemCommand: function(event) {
        this.openSettings();
    },

    toggleEnabled : function(event) {
        Redirector.setEnabled(!Redirector.enabled);
    },

    openSettings : function() {
        var windowName = "redirectorSettings";
        var windowsMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        var win = windowsMediator.getMostRecentWindow(windowName);
        if (win) {
            win.focus();
        } else {
            window.openDialog("chrome://redirector/content/ui/redirectList.xul",
                    windowName,
                    "chrome,dialog,resizable=yes,centerscreen", this);
        }
    
    },
    
    statusBarClick : function(event) {
        var LEFT = 0, RIGHT = 2;

        if (event.button == LEFT) {
            RedirectorOverlay.toggleEnabled();
        } else if (event.button == RIGHT) {
            this.openSettings();
        }
    },

    setStatusBarImg : function() {
        var statusImg = document.getElementById('redirector-statusbar-img');

        if (Redirector.enabled) {
            statusImg.src = 'chrome://redirector/content/images/statusactive.PNG'
            statusImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
        } else {
            statusImg.src = 'chrome://redirector/content/images/statusinactive.PNG'
            statusImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
        }
    },
    
    prefObserver : {

        getService : function() {
            return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranchInternal);
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
            if (data == 'extensions.redirector.enabled') {
                RedirectorOverlay.setStatusBarImg();
            } else if (data == 'extensions.redirector.showStatusBarIcon') {
				document.getElementById('redirector-status').hidden = !Redirector.getBoolPref('showStatusBarIcon');
            } else if (data == 'extensions.redirector.showContextMenu') {
				document.getElementById('redirector-context').hidden = !Redirector.getBoolPref('showContextMenu');
            }
        }
    }
};
window.addEventListener("load", function(event) { RedirectorOverlay.onLoad(event); }, false);
window.addEventListener("unload", function(event) { RedirectorOverlay.onUnload(event); }, false);
