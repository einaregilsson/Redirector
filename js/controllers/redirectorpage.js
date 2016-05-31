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

	// Saves the entire list of redirects to storage.
	$s.saveChanges = function() {

		// Clean them up so angular $$hash things and stuff don't get serialized.
		var arr = $s.redirects.map(normalize);

		chrome.runtime.sendMessage({type:"saveredirects", redirects:arr}, function(response) {
			console.log('Saved ' + arr.length + ' redirects at ' + new Date() + '. Message from background page:' + response.message);
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

 		//Remove the message in 20 seconds if it hasn't been changed...
 		$timeout(function() {
 			if ($s.message == message) {
 				$s.message = null;
 			}
 		}, 20 * 1000);
 	}
}]);
