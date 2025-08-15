

var storage = chrome.storage.local;
var viewModel = {}; //Just an object for the databinding

function applyBinding() {
	dataBind(document.body, viewModel);
}

function toggle(prop) {
	storage.get({[prop]: false}, function(obj) {
		storage.set({[prop] : !obj[prop]});
		viewModel[prop] = !obj[prop];
		applyBinding();
	});
}



function openRedirectorSettings() {

	//switch to open one if we have it to minimize conflicts
	var url = chrome.runtime.getURL('redirector.html');
	
	//FIREFOXBUG: Firefox chokes on url:url filter if the url is a moz-extension:// url
	//so we don't use that, do it the more manual way instead.
	chrome.tabs.query({currentWindow:true}, function(tabs) {
		for (var i=0; i < tabs.length; i++) {
			if (tabs[i].url == url) {
				chrome.tabs.update(tabs[i].id, {active:true}, function(tab) {
					close();
				});
				return;
			}
		}

		chrome.tabs.create({url:url, active:true});
	});
	return;
};


function pageLoad() {
	storage.get({logging:false, enableNotifications:false, disabled: false}, function(obj) {
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
