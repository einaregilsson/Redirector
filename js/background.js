
//This is the background script. It is responsible for actually redirecting requests,
//as well as monitoring changes in the redirects and the disabled status and reacting to them.

//TODO: Better browser detection...
var isFirefox = !!navigator.userAgent.match(/Firefox\//);
var storage = chrome.storage.local; //TODO: Change to sync when Firefox supports it...

//Hopefully Firefox will fix this at some point and we can just use onBeforeRequest everywhere...
var redirectEvent = isFirefox ? chrome.webRequest.onBeforeSendHeaders : chrome.webRequest.onBeforeRequest;

//Redirects partitioned by request type, so we have to run through
//the minimum number of redirects for each request.
var partitionedRedirects = {};

//Keep track of tabids where the main_frame url has been redirected.
//Mark it as green until a new url is loaded.
var tabIdToIcon = {

};

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

function setIcon(image19, image38, tabId) {
	var data = {
  		path: {
    		19: image19,
    		38: image38  
  		}
  	};
  	if (typeof tabId !== 'undefined') {
  		data.tabId = tabId;
  	}
	chrome.browserAction.setIcon(data, function(tab) {
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
	
	//We only allow GET request to be redirected, don't want to accidentally redirect
	//sensitive POST parameters
	if (details.method != 'GET') {
		return null;
	}

	log('Checking: ' + details.type + ': ' + details.url);

	var list = partitionedRedirects[details.type];
	if (!list) {
		log('No list for type: ' + details.type);
		return null;
	}

	var timestamp = ignoreNextRequest[details.url];
	if (timestamp) {
		log('Ignoring ' + details.url + ', was just redirected ' + (new Date().getTime()-timestamp) + 'ms ago');
		delete ignoreNextRequest[details.url];
		return null;
	}

	for (var i = 0; i < list.length; i++) {
		var r = list[i];
		var result = r.getMatch(details.url);

		if (result.isMatch) {

			log('Redirecting ' + details.url + ' ===> ' + result.redirectTo + ', type: ' + details.type + ', pattern: ' + r.includePattern);

			/* Unfortunately the setBrowserIcon for a specific tab function is way too unreliable, fails all the time with tab not found,
			   even though the tab is there. So, for now I'm cancelling this feature, which would have been pretty great ... :/
			if (details.type == 'main_frame') {
				log('Setting icon on tab ' + details.tabId + ' to green');
				
				setIcon("images/icon19redirected.png", "images/icon38redirected.png", details.tabId);
			  	tabIdToIcon[details.tabId] = true;				
			}*/
			ignoreNextRequest[result.redirectTo] = new Date().getTime();
			
			return { redirectUrl: result.redirectTo };
		}
	}

	/* Cancelled for now because of setBrowserIcon being really unreliable...
	if (details.type == 'main_frame' && tabIdToIcon[details.tabId]) {
		log('Setting icon on tab ' + details.tabId + ' back to active');
		setIcon("images/icon19active.png", "images/icon38active.png", details.tabId);
	  	delete tabIdToIcon[details.tabId];
	}*/

  	return null; 
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

	return {
		urls: ["http://*/*", "https://*/*"],
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

	storage.get({redirects:'firstrun'}, function(obj) {
		var redirects = obj.redirects;

		if (redirects ===  'firstrun') {
			log('No redirects to set up, first run of extension');
			//TODO: import old Firefox redirects
			return;
		}

		if (redirects.length == 0) {
			return;
		}

		partitionedRedirects = createPartitionedRedirects(redirects);
		var filter = createFilter(redirects);

		log('Setting filter for listener: ' + JSON.stringify(filter));
		redirectEvent.addListener(checkRedirects, filter, ["blocking"]);
	});
}

function updateIcon() {
	storage.get({disabled:false}, function(obj) {
		if (obj.disabled) {
			setIcon("images/icon19disabled.png", "images/icon38disabled.png");
		} else {
			setIcon("images/icon19active.png", "images/icon38active.png");
		}
	});	
}

//First time setup
updateIcon();
storage.get({disabled:false}, function(obj) {
	if (!obj.disabled) {
		setUpRedirectListener();
	} else {
		log('Redirector is disabled');
	}
});
log('Redirector starting up...');
       