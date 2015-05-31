Components.utils.import("chrome://redirector/content/js/redirectorprefs.js");
Components.utils.import("chrome://redirector/content/js/redirector.js");

var RedirectorOverlay = {

	strings 	: null,
	prefs		: null,

	onLoad : function(event) {
		try {

			// initialization code
			document.getElementById('contentAreaContextMenu')
				.addEventListener("popupshowing", function(e) { RedirectorOverlay.showContextMenu(e); }, false);
			
			this.strings = document.getElementById("redirector-strings");
			this.prefs = new RedirectorPrefs();
			this.changedPrefs(this.prefs);
			this.prefs.addListener(this); 
			document.addEventListener('keypress', function(event) {
				if ((RedirectorOverlay.prefs.enableShortcutKey) && (event.charCode == 114) && event.altKey) { //alt+r
					RedirectorOverlay.toggleEnabled();
				}
			}, true);			
		} catch(e) {
			if (this.strings) {
				alert(this.strings.getString("initError") + "\n\n" + e);
			} else {
				alert(e);
			}
		}
	},
	
	onUnload : function(event) {
		this.prefs.dispose();
		Redirector.debug("Finished cleanup");
	},

	changedPrefs : function(prefs) {
		var statusImg = document.getElementById('redirector-statusbar-img');
		var toolbarImg = document.getElementById('redirector-toolbar-img');

		if (prefs.enabled) {
			statusImg.src = 'chrome://redirector/content/images/statusactive.png'
			statusImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
			toolbarImg.setAttribute('image', 'chrome://redirector/content/images/statusactive.png');
			toolbarImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
		} else {
			statusImg.src = 'chrome://redirector/content/images/statusinactive.png'
			statusImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
			toolbarImg.setAttribute('image', 'chrome://redirector/content/images/statusinactive.png');
			toolbarImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
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

		gBrowser.selectedTab = gBrowser.addTab("chrome://redirector/content/redirector.html");	
	},
		
	onMenuItemCommand: function(event) {
		this.openSettings();
	},

	toggleEnabled : function(event) {
		this.prefs.enabled = !this.prefs.enabled;
	},

	openSettings : function() {
		gBrowser.selectedTab = gBrowser.addTab("chrome://redirector/content/redirector.html");	
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
