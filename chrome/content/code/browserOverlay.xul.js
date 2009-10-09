//// $Id$

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;

var RedirectorOverlay = {

    strings     : null,

    onLoad : function(event) {
        try {

            // initialization code
            document.getElementById('contentAreaContextMenu')
                .addEventListener("popupshowing", function(e) { RedirectorOverlay.showContextMenu(e); }, false);
            
            this.strings = document.getElementById("redirector-strings");
            this.changedPrefs(Redirector.prefs);
            Redirector.prefs.addListener(this);
		
        } catch(e) {
            if (this.strings) {
                alert(this.strings.getString("initError") + "\n\n" + e);
            } else {
                alert(e);
            }
        }
    },
    
    onUnload : function(event) {
        Redirector.prefs.removeListener(this);
        Redirector.debug("Finished cleanup");
    },

    changedPrefs : function(prefs) {
        var statusImg = document.getElementById('redirector-statusbar-img');

        if (prefs.enabled) {
            statusImg.src = 'chrome://redirector/content/images/statusactive.PNG'
            statusImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
        } else {
            statusImg.src = 'chrome://redirector/content/images/statusinactive.PNG'
            statusImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
        }

        document.getElementById('redirector-status').hidden = !prefs.showStatusBarIcon;
		document.getElementById('redirector-context').hidden = !prefs.showContextMenu;
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
        Redirector.prefs.enabled = !Redirector.prefs.enabled;
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
    }

};
window.addEventListener("load", function(event) { RedirectorOverlay.onLoad(event); }, false);
window.addEventListener("unload", function(event) { RedirectorOverlay.onUnload(event); }, false);
