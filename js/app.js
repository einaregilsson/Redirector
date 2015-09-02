var redirectorApp = angular.module('redirectorApp', [])
.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|data):/);
    }
]);

//Directive for file upload:
redirectorApp.directive('fileselected', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attr, ctrl) {
            element.bind('change', function(e) {
            	var f = element[0].files[0];
            	element[0].value = '';
            	scope.$eval(attr.fileselected, {'$file':f});
            });
        }
    }
});

//Filter for displaying nice names for request types
redirectorApp.filter('requestTypeDisplay', function() {
	return function(input) {
		return input.map(function(key) { return requestTypes[key]; }).join(', ');
	}
});


var storage = chrome.storage.local; //TODO: Change to sync when Firefox supports it...

var requestTypes = {
	main_frame: "Main window (address bar)",
	sub_frame: "IFrames",
	stylesheet : "Stylesheets",
	script : "Scripts",
	image : "Images",
	object : "Objects (e.g. Flash videos, Java applets)",
	xmlhttprequest : "XMLHttpRequests (Ajax)",
	other : "Other"
};


redirectorApp.controller('redirectorController', ['$scope', '$timeout', function($s, $timeout) {

	$s.activeRedirect = null;
	$s.editIndex = -1;
	$s.requestTypes = requestTypes;

	$s.appliesTo = function(key) {
		if (!$s.activeRedirect) {
			return;
		}
		return $s.activeRedirect.appliesTo.indexOf(key) != -1;
	};

	$s.toggleApplies = function(key) {
		if (!$s.activeRedirect) {
			return;
		}
		var arr = $s.activeRedirect.appliesTo;

		var index = arr.indexOf(key);
		if (index == -1) {
			arr.push(key);
		} else {
			arr.splice(index, 1);
		}

		var order = 'main_frame,sub_frame,stylesheet,script,image,object,xmlhttprequest,other';

		arr.sort(function(a,b) {
			return order.indexOf(a) - order.indexOf(b);
		});
	};


	function closeEditForm() {
		$s.editIndex = -1;
		$s.activeRedirect = null;
		$s.showAdvanced = false;
		$s.showModal = false;
	}

	$s.createNew = function() {
		$s.activeRedirect = new Redirect({}).toObject();
		$s.showModal = true;
	};

	$s.saveRedirect = function() {
		if ($s.editIndex >= 0) {
			$s.redirects[$s.editIndex] = $s.activeRedirect;
		} else {
			$s.redirects.push(new Redirect($s.activeRedirect).toObject());
		}
		closeEditForm();
		saveChanges();
	};

	$s.cancelEdit = function() {
		closeEditForm();
	}

	function saveChanges() {

		var arr = [];
		for (var i=0; i < $s.redirects.length; i++) {
			var r = $s.redirects[i];
			arr.push(new Redirect(r).toObject());
		}

		storage.set({redirects:arr}, function() {
			console.log('Saved redirects');
		});
		updateExportLink();
	}

	function swap(arr, i, n) {
		var item = arr[i];
		arr[i] = arr[n];
		arr[n] = item;
	}

	$s.moveUp = function(index) {
		if (index == 0) {
			return;
		}
		swap($s.redirects, index, index-1);
		saveChanges();
	};

	$s.moveDown = function(index) {
		if (index == $s.redirects.length-1) {
			return;
		}
		swap($s.redirects, index, index+1);
		saveChanges();
	};

	$s.confirmDelete = function(index) {
		$s.deleting = $s.redirects[index];
		$s.deletingIndex = index;
		$s.showModal = true;
	}

	$s.cancelDelete = function(index) {
		delete $s.deleting;
		delete $s.deletingIndex;
		$s.showModal = false;
	}

	$s.deleteRedirect = function() {
		$s.redirects.splice($s.deletingIndex, 1);
		delete $s.deleting;
		delete $s.deletingIndex;
		$s.showModal = false;
		saveChanges();
	};

	$s.editRedirect = function(index) {
		$s.activeRedirect = new Redirect($s.redirects[index]).toObject();
		$s.editIndex = index;
		$s.showModal = true;
	};

	$s.toggleDisabled = function(redirect) {
		redirect.disabled = !redirect.disabled;
		saveChanges();
	}
 
 	$s.redirects = [];
 	storage.get('redirects', function(results) {
 		if (!results || !results.redirects) {
 			return;
 		}
 		for (var i=0; i < results.redirects.length; i++) {
			$s.redirects.push(new Redirect(results.redirects[i]).toObject());
		}
		updateExportLink();
		$s.$apply();
 	});

 	function msg(message, success) {
 		$s.message = message;
 		$s.messageType = success ? 'success' : 'error';

 		var m = message;

 		//Remove the message in 5 seconds if it hasn't been changed...
 		$timeout(function() {
 			if ($s.message == m) {
 				$s.message = null;
 			}
 		}, 20 * 1000);
 	}

 	/* Import/Export of Redirects */
 	$s.importRedirects = function(file) {
 		if (!file) {
 			return;
 		}
 		var reader = new FileReader();
 		
 		reader.onload = function(e) {
 			var data;
 			try {
	 			var data = JSON.parse(reader.result);
 			} catch(e) {
 				msg('Failed to parse JSON data, invalid JSON: ' + (e.message||'').substr(0,100));
	 			return $s.$apply();
 			}

 			if (!data.redirects) {
 				msg('Invalid JSON, missing "redirects" property');
 				return $s.$apply();
 			}

 			var imported = 0, existing = 0;
 			for (var i = 0; i < data.redirects.length; i++) {
 				var r = new Redirect(data.redirects[i]);

 				if ($s.redirects.some(function(i) { return new Redirect(i).equals(r);})) {
 					existing++;
 				} else {
	 				$s.redirects.push(r.toObject());
	 				imported++;
 				}
 			}
 			if (imported == 0 && existing == 0) {
 				msg('No redirects existed in the file.');
 			}
 			if (imported > 0 && existing == 0) {
 				msg('Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's.' : '.'), true);
 			}
 			if (imported == 0 && existing > 0) {
 				msg('All redirects in the file already existed and were ignored.');
 			}
 			if (imported > 0 && existing > 0) {
 				var m = 'Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's' : '') + '. ';
 				if (existing == 1) {
 					m += '1 redirect already existed and was ignored.';
 				} else {
 					m += existing + ' redirects already existed and were ignored.'; 
 				}
 				msg(m, true);
 			}

 			saveChanges();
 			$s.$apply();
  		};
  		try {
	 		reader.readAsText(file, 'utf-8');
  		} catch(e) {
  			msg('Failed to read import file');
  		}
 	}

 	function updateExportLink() {
		var redirects = $s.redirects.map(function(r) {
 			return new Redirect(r).toObject();
 		});
 		
 		var exportObj = { 
 			createdBy : 'Redirector v' + chrome.app.getDetails().version, 
 			createdAt : new Date(), 
 			redirects : redirects 
 		};
 		
 		var json = JSON.stringify(exportObj, null, 4);
 		
 		$s.redirectDownload = 'data:text/plain;charset=utf-8,' + encodeURIComponent(json); 
 	}

}]);
