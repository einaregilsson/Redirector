Components.utils.import("chrome://redirector/content/js/redirectorprefs.js");
Components.utils.import("chrome://redirector/content/js/redirector.js");

var RedirectorOverlay = {

	strings 	: null,
	prefs		: null,

	onLoad : function(event) {
		try {

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
		var toolbarImg = document.getElementById('redirector-toolbar-img');

		if (toolbarImg) {
			if (prefs.enabled) {
				toolbarImg.setAttribute('image', 'chrome://redirector/content/images/statusactive.png');
				toolbarImg.setAttribute('tooltiptext', this.strings.getString('enabledTooltip'));
			} else {
				toolbarImg.setAttribute('image', 'chrome://redirector/content/images/statusinactive.png');
				toolbarImg.setAttribute('tooltiptext', this.strings.getString('disabledTooltip'));
			}
		}
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
	
	toolBarClick : function(event) {
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
