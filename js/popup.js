var storage = chrome.storage.local;
var viewModel = {}; //Just an object for the databinding

function applyBinding() {
	dataBind(document.body, viewModel);
}

function toggle(prop) {
	storage.get({
		[prop]: false
	}, function(obj) {
		storage.set({
			[prop]: !obj[prop]
		});
		viewModel[prop] = !obj[prop];
		applyBinding();
	});
}

function openRedirectorSettings() {
	var url = chrome.extension.getURL('redirector.html');

	chrome.tabs.query({
		currentWindow: true
	}, function(tabs) {
		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].url == url) {
				chrome.tabs.update(tabs[i].id, {
					active: true
				}, function() {
					close();
				});
				return;
			}
		}

		chrome.tabs.create({
			url: url,
			active: true
		}, function() {
			close();
		});
	});
}

function pageLoad() {
	storage.get({
		logging: false,
		enableNotifications: false,
		disabled: false
	}, function(obj) {
		viewModel = obj;
		applyBinding();
	})

	el('#enable-notifications').addEventListener('input', () => toggle('enableNotifications'));
	el('#enable-logging').addEventListener('input', () => toggle('logging'));
	el('#toggle-disabled').addEventListener('click', () => toggle('disabled'));
	el('#open-redirector-settings').addEventListener('click', openRedirectorSettings);
}

pageLoad();
//Setup page...