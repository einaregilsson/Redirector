
//This is the background script. It is responsible for actually redirecting requests,
//as well as monitoring changes in the redirects and the disabled status and reacting to them.

//TODO: Better browser detection...
var isFirefox = false;

if (typeof chrome == 'undefined') {
	isFirefox = true;
	var firefoxShim = require('./firefox/background-shim');
	chrome = firefoxShim.chrome;
	Redirect = firefoxShim.Redirect;
}
//Hopefully Firefox will fix this at some point and we can just use onBeforeRequest everywhere...
var redirectEvent = isFirefox ? chrome.webRequest.onBeforeSendHeaders : chrome.webRequest.onBeforeRequest;

//Redirects partitioned by request type, so we have to run through
//the minimum number of redirects for each request.
var partitionedRedirects = {};

//Cache of urls that have just been redirected to. They will not be redirected again, to
//stop recursive redirects, and endless redirect chains.
//Key is url, value is timestamp of redirect.
var ignoreNextRequest = {

};

function log(msg) {
	if (log.enabled) {
		console.log('REDIRECTOR: ' + msg);
	}
}
log.enabled = true;

function setIcon(image) {
	var sizes = [16,19,32,38,48,64];
	var data = { path: {}};
	for (var s of sizes) {
		data.path[s] = 'images/' + image + '-' + s + '.png';
	} 
	chrome.browserAction.setIcon(data, function() {
		var err = chrome.runtime.lastError;
		if (err) {
			//If not checked we will get unchecked errors in the background page console...
			log('Error in SetIcon: ' + err.message);
		}
	});		
}

//This is the actual function that gets called for each request and must
//decide whether or not we want to redirect.
function checkRedirects(details) {

	//Oh Firefox, please fix your broken url matching soon...
	if (isFirefox && !details.url.match(/^https?:\/\//)) {
		log('Not http: ' + details.url);
		return {};
	}

	//We only allow GET request to be redirected, don't want to accidentally redirect
	//sensitive POST parameters
	if (details.method != 'GET') {
		return {};
	}
	log('Checking: ' + details.type + ': ' + details.url);

	var list = partitionedRedirects[details.type];
	if (!list) {
		log('No list for type: ' + details.type);
		return {};
	}

	var timestamp = ignoreNextRequest[details.url];
	if (timestamp) {
		log('Ignoring ' + details.url + ', was just redirected ' + (new Date().getTime()-timestamp) + 'ms ago');
		delete ignoreNextRequest[details.url];
		return {};
	}

	for (var i = 0; i < list.length; i++) {
		var r = list[i];
		var result = r.getMatch(details.url);

		if (result.isMatch) {

			log('Redirecting ' + details.url + ' ===> ' + result.redirectTo + ', type: ' + details.type + ', pattern: ' + r.includePattern);

			ignoreNextRequest[result.redirectTo] = new Date().getTime();
			
			return { redirectUrl: result.redirectTo };
		}
	}

  	return {}; 
}

//Monitor changes in data, and setup everything again.
//This could probably be optimized to not do everything on every change
//but why bother?
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if (changes.disabled) {
		updateIcon();

		if (changes.disabled.newValue == true) {
			log('Disabling Redirector, removing listener');
			redirectEvent.removeListener(checkRedirects);
		} else {
			log('Enabling Redirector, setting up listener');
			setUpRedirectListener();
		}
	}

	if (changes.redirects) {
		log('Redirects have changed, setting up listener again');
		setUpRedirectListener();
	}
});

//Creates a filter to pass to the listener so we don't have to run through
//all the redirects for all the request types we don't have any redirects for anyway.
function createFilter(redirects) {
	var types = [];
	for (var i = 0; i < redirects.length; i++) {
		redirects[i].appliesTo.forEach(function(type) { 
			if (types.indexOf(type) == -1) {
				types.push(type);
			}
		});
	}
	types.sort();

	//FIXME: The Firefox implementation of the url matching is seriously broken still,
	//so we can't filter by url on Firefox for now, have to cut non http urls out in checkRedirects.
	return {
		urls: isFirefox ? null : ["https://*", "http://*"],
		types : types
	};
}

function createPartitionedRedirects(redirects) {
	var partitioned = {};

	for (var i = 0; i < redirects.length; i++) {
		var redirect = new Redirect(redirects[i]);
		redirect.compile();
		for (var j=0; j<redirect.appliesTo.length;j++) {
			var requestType = redirect.appliesTo[j];
			if (partitioned[requestType]) {
				partitioned[requestType].push(redirect); 
			} else {
				partitioned[requestType] = [redirect];
			}
		}
	}
	return partitioned;	
}

//Sets up the listener, partitions the redirects, creates the appropriate filters etc.
function setUpRedirectListener() {

	redirectEvent.removeListener(checkRedirects); //Unsubscribe first, in case there are changes...

	chrome.storage.local.get({redirects:[]}, function(obj) {
		var redirects = obj.redirects;

		if (redirects.length == 0) {
			log('No redirects defined, not setting up listener');
			return;
		}

		partitionedRedirects = createPartitionedRedirects(redirects);
		var filter = createFilter(redirects);

		log('Setting filter for listener: ' + JSON.stringify(filter));
		redirectEvent.addListener(checkRedirects, filter, ["blocking"]);
	});
}

function updateIcon() {
	chrome.storage.local.get({disabled:false}, function(obj) {
		setIcon(obj.disabled ? 'icon-disabled' : 'icon-active');
	});	
}

//First time setup
updateIcon();

chrome.storage.local.get({disabled:false}, function(obj) {
	if (!obj.disabled) {
		setUpRedirectListener();
	} else {
		log('Redirector is disabled');
	}
});
log('Redirector starting up...');
       