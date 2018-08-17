// This is the main controller of the page. It is responsible for showing messages,
// modal windows and loading and saving the list of redirects, that all of the
// controllers work with.
redirectorApp.controller('RedirectorPageCtrl', ['$scope', '$timeout', function($s, $timeout) {
	
	$s.deleting = null;  //Variable for redirect being edited, of the form { index:<nr>, redirect:<redirect>};
	$s.showEditForm = $s.showDeleteForm = false; // Variables, child controllers can set them to show their forms

	var storage = chrome.storage.local; //TODO: Change to sync when Firefox supports it...

	function normalize(r) {
		return new Redirect(r).toObject(); //Cleans out any extra props, and adds default values for missing ones.
	}

	$s.showSyncOption = false;
	if(navigator.userAgent.toLowerCase().indexOf("chrome") > -1){
		$s.showSyncOption = true;
	}
	// Saves the entire list of redirects to storage.
	$s.saveChanges = function() {

		// Clean them up so angular $$hash things and stuff don't get serialized.
		var arr = $s.redirects.map(normalize);

		chrome.runtime.sendMessage({type:"saveredirects", redirects:arr}, function(response) {
			console.log(response.message);
			if(response.message.indexOf("Redirects failed to save") > -1){
				$s.showMessage(response.message, false);
			}else{
				console.log('Saved ' + arr.length + ' redirects at ' + new Date() + '. Message from background page:' + response.message);
		    }
		});
	}
	
	// Default is LOCAL storage, allow user to select toggle to Sync if they wish 
	$s.isSyncEnabled = false;
	
	chrome.storage.local.get({isSyncEnabled:false},function(obj){
		$s.isSyncEnabled = obj.isSyncEnabled;
		$s.$apply();		
	});
	
	$s.toggleSyncSetting = function(){
		chrome.runtime.sendMessage({type:"ToggleSync", isSyncEnabled: !$s.isSyncEnabled}, function(response) {
			if(response.message === "syncEnabled"){
				$s.isSyncEnabled = true;
				$s.showMessage('Sync is enabled!',true);
			} else if(response.message === "syncDisabled"){
				$s.isSyncEnabled = false;
				$s.showMessage('Sync is disabled - local storage will be used!',true);
			} else if(response.message.indexOf("Sync Not Possible")>-1){
				$s.isSyncEnabled = false;
				chrome.storage.local.set({isSyncEnabled: $s.isSyncEnabled}, function(){
				 // console.log("set back to false");
				});
				$s.showMessage(response.message, false);
			}
			else {
				$s.showMessage('Error occured when trying to change Sync settings. Refer logging and raise an issue',false);
			}
			$s.$apply();
		});
	}
	
 	$s.redirects = [];
	
	//Need to proxy this through the background page, because Firefox gives us dead objects
	//nonsense when accessing chrome.storage directly.
	chrome.runtime.sendMessage({type: "getredirects"}, function(response) {
		console.log('Received redirects message, count=' + response.redirects.length);
 		for (var i=0; i < response.redirects.length; i++) {
			$s.redirects.push(normalize(response.redirects[i]));
		}
		$s.$apply();
	}); 	

 	// Shows a message bar above the list of redirects.
 	$s.showMessage = function(message, success) {
 		$s.message = message;
 		$s.messageType = success ? 'success' : 'error';
		var timer = 20;
		/*if($s.message.indexOf("Error occured")>-1 || $s.message.indexOf("Sync Not Possible")>-1 || $s.message.indexOf("Redirects failed to save")>-1 ){
			timer = 10; 
			//  just to reload the page - when I tested, $s.$apply() didn't refresh as I expected for "Sync Not Possible".
			// Reloading the page is going to getRedirects and show actual values to user after showing 10 seconds error message
		} */

 		//Remove the message in 20 seconds if it hasn't been changed...
 		$timeout(function() {
 			if ($s.message == message) {
 				$s.message = null;
			 }
			/* if(timer == 10){
				chrome.tabs.reload();
			 } */
 		}, timer * 1000);
 	}
}]);
