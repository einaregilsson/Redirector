var self = require('sdk/self');
var tabs = require('sdk/tabs');

const {Cu} = require('chrome');

exports.setLogger = function(logger){
	log = logger;
} 


function migrateFromOlderVersion() {
	const { pathFor } = require('sdk/system');
	const path = require('sdk/fs/path');
	const file = require('sdk/io/file');

	var oldRedirectsFile = path.join(pathFor('ProfD'), 'Redirector.rjson');
	if (!file.exists(oldRedirectsFile)) {
		return;
	}

	var extensionId = require('sdk/self').id;
	var newFolder = path.join(pathFor('ProfD'), 'browser-extension-data', extensionId);
	file.mkpath(newFolder);
	var newFile = path.join(newFolder, 'storage.js');
	
	if (file.exists(newFile)) {
		return;
	}	


	var textReader = file.open(oldRedirectsFile, 'r');
	var jsonData = JSON.parse(textReader.read());
	textReader.close();
	var Redirect = require('../redirect').Redirect;
	var newData = {redirects:[]};
	for (var r of jsonData.redirects) {
		var redirect = new Redirect(r);
		redirect.updateExampleResult();
		newData.redirects.push(redirect.toObject());
	}

	Cu.import("resource://gre/modules/Services.jsm");

	var enabled = true;
	try {
		enabled = Services.prefs.getBoolPref('extensions.redirector.enabled');
	} catch(e) {}
	newData.disabled = !enabled;

	//Kill old prefs:
	var oldPrefs = ['enabled', 'debugEnabled', 'enableShortcutKey', 'version', 'defaultDir'];
	for (var p of oldPrefs) {
		try {
			Services.prefs.deleteBranch('extensions.redirector.' + p);
		} catch(e) {
		}
	}

	
	var textWriter = file.open(newFile, 'w');
	textWriter.write(JSON.stringify(newData));
	textWriter.close();

	file.remove(oldRedirectsFile);
}

migrateFromOlderVersion();

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
		"32": makeUrl("images/icon-active-32.png"),
		"48": makeUrl("images/icon-active-48.png"),
		"64": makeUrl("images/icon-active-64.png")
	},
	onChange: function(state) {
		if (state.checked) {
    		panel.show({position: button});
    	}
	}
});

var extensionId = require('sdk/self').id;

var chrome = {
	webRequest : Cu.import('resource://gre/modules/WebRequest.jsm', {}),
	
	storage : {
		local : {
			get : function(query, callback) {
				ExtensionStorage.get(extensionId, query).then(callback || function(){});
			},
			set : function(data, callback) {
				ExtensionStorage.set(extensionId, data).then(callback || function(){});
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
		log('background sending message: ' + JSON.stringify(msg));
		worker.port.emit('message', msg);
	}

	function logger(logMessage) {
		log(logMessage);
	}
	//We proxy all logging over here so we can control it with one switch
	worker.port.on('log', logger);

	function receive(message) {
		log('background got message: ' + JSON.stringify(message));

		if (message.messageType == 'storage.get') {
			chrome.storage.local.get(message.payload, function(data) {
				sendReply(message, data);
			});
		} else if (message.messageType == 'storage.set') {
			chrome.storage.local.set(message.payload, function(data) {
				sendReply(message, data);
			});
		} else if (message.messageType == 'log.enabled') {
			if (!message.payload.enabled) {
				log('Logging has been disabled for Redirector');
			}
			log.enabled = message.payload.enabled;
			if (log.enabled) {
				log('Logging has been enabled for Redirector');
			}
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
	}
    worker.port.on('message', receive);

    worker.on('detach', function() {
    	worker.port.removeListener('message', receive);
    	worker.port.removeListener('log', logger);
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


