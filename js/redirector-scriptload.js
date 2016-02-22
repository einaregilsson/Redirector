
//Do it this way to make the Firefox version work with content
//scripts and all that crap. Will be removed when everything
//can use the WebExtensions API.

function loadScript(path) {
	document.write('<script src="' + path + '"></script>');
}

if (typeof chrome !== 'undefined') {
	loadScript("js/angular.min.js");
	loadScript("js/redirect.js");
	loadScript("js/app.js");
	loadScript("js/controllers/redirectorpage.js");
	loadScript("js/controllers/editredirect.js");
	loadScript("js/controllers/deleteredirect.js");
	loadScript("js/controllers/importexport.js");
	loadScript("js/controllers/listredirects.js");
}

//To make the private stuff in Firefox work properly
window.addEventListener('DOMContentLoaded', function() {
	document.body.classList.remove('private');
});
