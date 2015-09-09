function hi() {
	chrome.browserAction.setIcon({
  		path: {
    		19: "images/icon19disabled.png",
    		38: "images/icon38disabled.png"
  		}
  	});
  	open('redirector.html');
}

document.addEventListener('DOMContentLoaded', function() {
	document.getElementsByTagName('button')[0].addEventListener('click', hi);
})