
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
    

	storage.get({logging:false}, function(obj) {
		$s.logging = obj.logging;
		$s.$apply();
	});

    $s.toggleLogging = function() {
		storage.get({logging:false}, function(obj) {
			storage.set({logging:!obj.logging});
		  	$s.logging = !obj.logging;
		  	$s.$apply();
		});
	};

	
	//Toggle Notifications by sending a notifications
	$s.enableNotifications = false; 
	
	storage.get({enableNotifications:false},function(obj){
		$s.enableNotifications = obj.enableNotifications;
		$s.$apply();
	});
	
	$s.toggleNotifications=function(){
		storage.get({enableNotifications:false},function(obj){
		storage.set({enableNotifications:!obj.enableNotifications});
			$s.enableNotifications = !obj.enableNotifications;
			$s.$apply();
	});
	}

	$s.openRedirectorSettings = function() {

		//switch to open one if we have it to minimize conflicts
		var url = chrome.extension.getURL('redirector.html');
		
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
}]);