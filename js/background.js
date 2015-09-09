

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
