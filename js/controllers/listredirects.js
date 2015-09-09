// This controller is responsible for the list of redirects and the actions
// that can be taken from there.
redirectorApp.filter('requestTypeDisplay', function() { //Filter for displaying nice names for request types
	return function(input) {
		return input.map(function(key) { return Redirect.requestTypes[key]; }).join(', ');
	}
}).controller('ListRedirectsCtrl', ['$scope', function($s) {
	
	function swap(arr, i, n) {
		var item = arr[i];
		arr[i] = arr[n];
		arr[n] = item;
	}

	// Move the redirect at index up in the list, giving it higher priority
	$s.moveUp = function(index) {
		if (index == 0) {
			return;
		}
		swap($s.redirects, index, index-1);
		$s.saveChanges();
	};

	// Move the redirect at index down in the list, giving it lower priority
	$s.moveDown = function(index) {
		if (index == $s.redirects.length-1) {
			return;
		}
		swap($s.redirects, index, index+1);
		$s.saveChanges();
	};

	$s.toggleDisabled = function(redirect) {
		redirect.disabled = !redirect.disabled;
		$s.saveChanges();
	};

	$s.example = function(redirect) {
		return new Redirect(redirect).getMatch(redirect.exampleUrl).redirectTo;
	};

	//Edit button is defined in EditRedirectCtrl
	//Delete button is defined in DeleteRedirectCtrl
}]);