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
		"16": makeUrl("images/icon16active.png"),
		"32": makeUrl("images/icon32active.png")
	},
	onChange: function(state) {
		if (state.checked) {
    		panel.show({position: button});
    	}
	}
});

var panel = panels.Panel({
	width: 200,
	height: 130,
	contentURL: makeUrl('popup.html'),
	contentScriptFile : makeUrl('js/firefox/content-script-proxy.js'),
	onHide: function() {
		button.state('window', {checked: false});
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

		}
	}
};

var pageMod = require("sdk/page-mod");

function attachedPage(worker) {
    worker.port.on('message', function(message) {
		console.info('background got message: ' + JSON.stringify(message));

		if (message.messageType == 'storage.get') {
			console.info('Getting from storage');
			chrome.storage.local.get(message.payload, function(data) {
				var resultMsg = { messageId: message.messageId, payload: data };
				console.info('background sending message: ' + JSON.stringify(resultMsg));
				worker.port.emit('message', resultMsg);
			});
		} else if (message.messageType == 'storage.set') {
			chrome.storage.local.set(message.payload, function(data) {
				var resultMsg = { messageId: message.messageId, payload: data };
				console.info('background sending message: ' + JSON.stringify(resultMsg));
				worker.port.emit('message', resultMsg);
			});
		}    
	});
}

pageMod.PageMod({
  include: makeUrl('redirector.html'),
  contentScriptFile: makeUrl('js/firefox/content-script-proxy.js'),
  onAttach : attachedPage
});


exports.chrome = chrome;

//Get redirect.js, which is included in the background page in webextensions.
exports.Redirect = require('../redirect').Redirect;

