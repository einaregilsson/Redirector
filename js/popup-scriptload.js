
//Do it this way to make the Firefox version work with content
//scripts and all that crap. Will be removed when everything
//can use the WebExtensions API.

function loadScript(path) {
	document.write('<script src="' + path + '"></script>');
}

if (typeof chrome !== 'undefined') {
	loadScript("js/angular.min.js");
	loadScript("js/popup.js");
}
