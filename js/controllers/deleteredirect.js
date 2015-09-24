redirectorApp.controller('DeleteRedirectCtrl', ['$scope', function($s) {

	// Ok, this is pretty ugly. But I want to make this controller to control
	// everything about the deleting process, so I make this available on
	// the parent scope, so the RedirectListCtrl can access it.
	$s.$parent.confirmDeleteRedirect = function(index) {
		$s.redirect = $s.redirects[index];
		$s.deleteIndex = index;
		$s.$parent.showDeleteForm = true;
	};

	$s.cancelDelete = function(index) {
		delete $s.redirect;
		delete $s.deleteIndex;
		$s.$parent.showDeleteForm = false;
	}

	$s.deleteRedirect = function() {
		$s.redirects.splice($s.deleteIndex, 1);
		delete $s.redirect;
		delete $s.deleteIndex;
		$s.$parent.showDeleteForm = false;
		$s.saveChanges();
	};
}]);