

function checkForRedirect(details) {

	//We only allow GET request to be redirected, don't want to accidentally redirect
	//sensitive POST parameters
	if (details.method != 'GET') {
		return null;
	}

  	if (details.url.match(/mbl\.is/)) {
  		console.log('Redirecting ' + details.url);
  		return  {redirectUrl: 'http://foo.is'}; //this doesn't work
  	}
  	return  null; //{redirectUrl: 'http://foo.is'}; //this doesn't work
}


var filter = {urls:["http://*/*", "https://*/*"]};

//TODO: Better browser detection...
var isFirefox = !!navigator.userAgent.match(/Firefox\//);

var ev = isFirefox ? chrome.webRequest.onBeforeSendHeaders : chrome.webRequest.onBeforeRequest;
ev.addListener(checkForRedirect, filter, ["blocking"]);

var storage = chrome.storage.local; //TODO: Change to sync when Firefox supports it...


//Icon updating code below

function updateIcon() {
	storage.get({disabled:false}, function(obj) {
		chrome.browserAction.setIcon({
	  		path: {
	    		19: obj.disabled ? "images/icon19disabled.png" : "images/icon19active.png",
	    		38: obj.disabled ? "images/icon38disabled.png" : "images/icon38active.png"  
	  		}
	  	});
	});	
}

updateIcon();

chrome.storage.onChanged.addListener(function(changes, namespace) {
	if (changes.disabled) {
		updateIcon();
	}
});
       