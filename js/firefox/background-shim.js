var self = require("sdk/self");

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
			for (var key in data.path) {
				icon[key] = makeUrl(data.path[key]);
			}
			button.icon = icon;
		}
	}
};

var pageMod = require("sdk/page-mod");

var panel = panels.Panel({
	width: 200,
	height: 130,
	contentURL: makeUrl('popup.html'),
	contentScriptFile : makeUrl('js/firefox/content-script-proxy.js'),
	onHide: function() {
		button.state('window', {checked: false});
	}
});

function attachedPage(worker) {
	function sendReply(originalMessage, reply) {
		if (JSON.stringify(reply) == "{}") {
			throw 'fuck';
		}
		var msg = {messageId:originalMessage.messageId, payload:reply};
		console.info('background sending message: ' + JSON.stringify(msg));
		worker.port.emit('message', msg);
	}
    worker.port.on('message', function(message) {
		console.info('background got message: ' + JSON.stringify(message));

		if (message.messageType == 'storage.get') {
			console.info('Getting from storage');
			chrome.storage.local.get(message.payload, function(data) {
				sendReply(message, data);
			});
		} else if (message.messageType == 'storage.set') {
			chrome.storage.local.set(message.payload, function(data) {
				sendReply(message, data);
			});
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

