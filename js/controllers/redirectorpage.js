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

		storage.set({redirects:arr}, function() {
			console.log('Saved ' + arr.length + ' redirects at ' + new Date());
		});
	}
 
 	$s.redirects = [];
 	storage.get({redirects:[]}, function(results) {

 		for (var i=0; i < results.redirects.length; i++) {
			$s.redirects.push(normalize(results.redirects[i]));
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
