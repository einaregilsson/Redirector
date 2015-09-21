var self = require('sdk/self');
var tabs = require('sdk/tabs');

const {Cu} = require('chrome');

function makeUrl(relativeUrl) {
	return self.data.url(relativeUrl).replace('/data/', '/');
} 
//Get the extension storage from Nightly.
Cu.import(makeUrl('js/firefox/extension-storage.jsm'));

//Create the browser action:
var { ToggleButton } = require("sdk/ui/button/toggle");
var panels = require("sdk/panel");

var button = ToggleButton({
	id: "redirector",
	label: "Redirector",
	icon: {
		"16": makeUrl("images/icon-active-16.png"),
		"32": makeUrl("images/icon-active-32.png")
	},
	onChange: function(state) {
		if (state.checked) {
    		panel.show({position: button});
    	}
	}
});

var extensionId = require('../../package.json').id;

var chrome = {
	webRequest : Cu.import('resource://gre/modules/WebRequest.jsm', {}),
	
	storage : {
		local : {
			get : function(query, callback) {
				ExtensionStorage.get(extensionId, query).then(callback);
			},
			set : function(data, callback) {
				ExtensionStorage.set(extensionId, data).then(callback);
			}
		},

		onChanged : {
			addListener : function(listener) {
				ExtensionStorage.addOnChangedListener(extensionId, listener);
			},
			removeListener : function(listener) {
				ExtensionStorage.removeOnChangedListener(extensionId, listener);
			}
		} 
	},

	runtime : { 
	},
	
	browserAction : {
		setIcon : function(data, callback) {
			var icon = {};
			for (var s of ['16','32','48', '64']) {
				icon[s] = makeUrl(data.path['19'].replace('19', s));
			}
			button.icon = icon;
		}
	}
};

var pageMod = require("sdk/page-mod");

var panel = panels.Panel({
	width: 200,
	height: 110,
	contentURL: makeUrl('popup.html'),
	contentScriptFile : makeUrl('js/firefox/content-script-proxy.js'),
	onHide: function() {
		button.state('window', {checked: false});
	}
});

function attachedPage(worker) {
	function sendReply(originalMessage, reply) {
		var msg = {messageId:originalMessage.messageId, payload:reply};
		console.info('background sending message: ' + JSON.stringify(msg));
		worker.port.emit('message', msg);
	}
    worker.port.on('message', function(message) {
		console.info('background got message: ' + JSON.stringify(message));

		if (message.messageType == 'storage.get') {
			chrome.storage.local.get(message.payload, function(data) {
				sendReply(message, data);
			});
		} else if (message.messageType == 'storage.set') {
			chrome.storage.local.set(message.payload, function(data) {
				sendReply(message, data);
			});
		} else if (message.messageType == 'tabs.query') {
			var result = [];
			var windows = require("sdk/windows").browserWindows;
			
			for (let tab of windows.activeWindow.tabs) {
				if (tab.url == message.payload.url) {
					result.push({id:tab.id, url:tab.url});
				}
			}
			sendReply(message, result);
		} else if (message.messageType == 'tabs.update') {
			for (let tab of tabs) {
				if (tab.id == message.payload.tabId) {
					tab.activate();
					panel.hide();
					sendReply(message, tab);
				}
			}
			sendReply(message, null);
		} else if (message.messageType == 'tabs.create') {
			tabs.open(message.payload.url);
			panel.hide();
			sendReply(message, null);
		} 
	});
}

attachedPage(panel);

pageMod.PageMod({
  include: makeUrl('redirector.html'),
  contentScriptFile: makeUrl('js/firefox/content-script-proxy.js'),
  contentScriptWhen: 'start',
  onAttach : attachedPage
});


exports.chrome = chrome;

//Get redirect.js, which is included in the background page in webextensions.
exports.Redirect = require('../redirect').Redirect;

