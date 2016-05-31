
angular.module('popupApp', []).controller('PopupCtrl', ['$scope', function($s) {

	var storage = chrome.storage.local; //TODO: Change to sync when Firefox supports it...
	
	storage.get({disabled:false}, function(obj) {
		$s.disabled = obj.disabled;
		$s.$apply();
	});

	$s.toggleDisabled = function() {
		storage.get({disabled:false}, function(obj) {
			storage.set({disabled:!obj.disabled});
		  	$s.disabled = !obj.disabled;
		  	$s.$apply();
		});
	};

	$s.openRedirectorSettings = function() {

		//switch to open one if we have it to minimize conflicts
		var url = chrome.extension.getURL('redirector.html');

		chrome.tabs.query({currentWindow:true}, function(tabs)) {
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
		chrome.tabs.query({currentWindow:true, url:url}, function(tabs) {
			if (tabs.length > 0) {
				chrome.tabs.update(tabs[0].id, {active:true}, function(tab) {
					close();
				});
			} else {
				chrome.tabs.create({url:url, active:true});
			}
		});
	};
}]);