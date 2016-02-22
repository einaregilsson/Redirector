//Nothing really here except the app object. Filters, and directives are 
//include with the controllers that use them. If we need to add any that
//are used by multiple controllers then we'll define them here.
var redirectorApp = angular.module('redirectorApp', []);

//To make the private stuff in Firefox work properly
window.addEventListener('DOMContentLoaded', function() {
	document.body.classList.remove('private');
});







