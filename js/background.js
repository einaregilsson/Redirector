
//This is the background script. It is responsible for actually redirecting requests,
//as well as monitoring changes in the redirects and the disabled status and reacting to them.
function log(msg) {
	if (log.enabled) {
		console.log('REDIRECTOR: ' + msg);
	}
}
log.enabled = false;

var storageArea = chrome.storage.local;
//Redirects partitioned by request type, so we have to run through
//the minimum number of redirects for each request.
var partitionedRedirects = {};

//Cache of urls that have just been redirected to. They will not be redirected again, to
//stop recursive redirects, and endless redirect chains.
//Key is url, value is timestamp of redirect.
var ignoreNextRequest = {

};

//url => { timestamp:ms, count:1...n};
var justRedirected = {

};
var redirectThreshold = 3;

function setIcon(image) {
	var data = { 
		path: {
			19 : 'images/' + image + '-19.png',
			38 : 'images/' + image + '-38.png'
		}
	};

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

			//Check if we're stuck in a loop where we keep redirecting this, in that
			//case ignore!
			var data = justRedirected[details.url];

			var threshold = 3000;
			if(!data || ((new Date().getTime()-data.timestamp) > threshold)) { //Obsolete after 3 seconds
				justRedirected[details.url] = { timestamp : new Date().getTime(), count: 1};
			} else {
				data.count++;
				justRedirected[details.url] = data;
				if (data.count >= redirectThreshold) {
					log('Ignoring ' + details.url + ' because we have redirected it ' + data.count + ' times in the last ' + threshold + 'ms');
					return {};
				} 
			}


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
function monitorChanges(changes, namespace) {
	if (changes.disabled) {
		updateIcon();

		if (changes.disabled.newValue == true) {
			log('Disabling Redirector, removing listener');
			chrome.webRequest.onBeforeRequest.removeListener(checkRedirects);
		} else {
			log('Enabling Redirector, setting up listener');
			setUpRedirectListener();
		}
	}

	if (changes.redirects) {
		log('Redirects have changed, setting up listener again');
		setUpRedirectListener();
    }

    if (changes.logging) {
        log('Logging settings have changed, updating...');
        updateLogging();
    }
}
chrome.storage.onChanged.addListener(monitorChanges);

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
		urls: ["https://*/*", "http://*/*"],
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

	chrome.webRequest.onBeforeRequest.removeListener(checkRedirects); //Unsubscribe first, in case there are changes...

	storageArea.get({redirects:[]}, function(obj) {
		var redirects = obj.redirects;
		if (redirects.length == 0) {
			log('No redirects defined, not setting up listener');
			return;
		}

		partitionedRedirects = createPartitionedRedirects(redirects);
		var filter = createFilter(redirects);

		log('Setting filter for listener: ' + JSON.stringify(filter));
		chrome.webRequest.onBeforeRequest.addListener(checkRedirects, filter, ["blocking"]);
	});
}

function updateIcon() {
	chrome.storage.local.get({disabled:false}, function(obj) {
		setIcon(obj.disabled ? 'icon-disabled' : 'icon-active');
	});	
}


//Firefox doesn't allow the "content script" which is actually privileged
//to access the objects it gets from chrome.storage directly, so we
//proxy it through here.
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		log('Received background message: ' + JSON.stringify(request));
		if (request.type == 'getredirects') {
			log('Getting redirects from storage');
			storageArea.get({
				redirects: []
			}, function (obj) {
				log('Got redirects from storage: ' + JSON.stringify(obj));
				sendResponse(obj);
				log('Sent redirects to content page');
			});
		} else if (request.type == 'saveredirects') {
			console.log('Saving redirects, count=' + request.redirects.length);
			delete request.type;
			storageArea.set(request, function (a) {
				if(chrome.runtime.lastError) {
				 if(chrome.runtime.lastError.message.indexOf("QUOTA_BYTES_PER_ITEM quota exceeded")>-1){
					log("Redirects failed to save as size of redirects larger than allowed limit per item by Sync");
					sendResponse({
						message: "Redirects failed to save as size of redirects larger than what's allowed by Sync. Refer Help Page"
					});
				 }
				} else {
				log('Finished saving redirects to storage');
				sendResponse({
					message: "Redirects saved"
				});
			}
			});
		} else if (request.type == 'ToggleSync') {
			// Notes on Toggle Sync feature here https://github.com/einaregilsson/Redirector/issues/86#issuecomment-389943854
			// This provides for feature request - issue 86
			delete request.type;
			log('toggling sync to ' + request.isSyncEnabled);
			// Setting for Sync enabled or not, resides in Local.
			chrome.storage.local.set({
					isSyncEnabled: request.isSyncEnabled
				},
				function () {
					if (request.isSyncEnabled) {
						storageArea = chrome.storage.sync;
						log('storageArea size for sync is 5 MB but one object (redirects) is allowed to hold only ' + storageArea.QUOTA_BYTES_PER_ITEM  / 1000000 + ' MB, that is .. ' + storageArea.QUOTA_BYTES_PER_ITEM  + " bytes");
						chrome.storage.local.getBytesInUse("redirects",
							function (size) {
								log("size of redirects is " + size + " bytes");
								if (size > storageArea.QUOTA_BYTES_PER_ITEM) {
									log("size of redirects " + size + " is greater than allowed for Sync which is " + storageArea.QUOTA_BYTES_PER_ITEM);
									// Setting storageArea back to Local.
									storageArea = chrome.storage.local; 
									sendResponse({
										message: "Sync Not Possible - size of Redirects larger than what's allowed by Sync. Refer Help page"
									});
								} else {
									chrome.storage.local.get({
										redirects: []
									}, function (obj) {
										//check if at least one rule is there.
										if (obj.redirects.length>0) {
											chrome.storage.sync.set(obj, function (a) {
												log('redirects moved from Local to Sync Storage Area');
												//Remove Redirects from Local storage
												chrome.storage.local.remove("redirects");
												// Call setupRedirectListener to setup the redirects 
												setUpRedirectListener();
												sendResponse({
													message: "syncEnabled"
												});
											});
										} else {
											log('No redirects are setup currently in Local, just enabling Sync');
											sendResponse({
												message: "syncEnabled"
											});
										}
									});
								}
							});
						} else {
						storageArea = chrome.storage.local;
						log('storageArea size for local is ' + storageArea.QUOTA_BYTES / 1000000 + ' MB, that is .. ' + storageArea.QUOTA_BYTES + " bytes");
						chrome.storage.sync.get({
							redirects: []
						}, function (obj) {
							if (obj.redirects.length>0) {
								chrome.storage.local.set(obj, function (a) {
									log('redirects moved from Sync to Local Storage Area');
									//Remove Redirects from sync storage
									chrome.storage.sync.remove("redirects");
									// Call setupRedirectListener to setup the redirects 
									setUpRedirectListener();
									sendResponse({
										message: "syncDisabled"
									});
								});
							} else {
								sendResponse({
									message: "syncDisabled"
								});
							}
						});
					}
				});

		} else {
			log('Unexpected message: ' + JSON.stringify(request));
			return false;
		}

		return true; //This tells the browser to keep sendResponse alive because
		//we're sending the response asynchronously.
	}
);


//First time setup
updateIcon();

function updateLogging() {
    chrome.storage.local.get({logging:false}, function(obj) {
        log.enabled = obj.logging;
    });
}
updateLogging();

chrome.storage.local.get({
	isSyncEnabled: false
}, function (obj) {
	if (obj.isSyncEnabled) {
		storageArea = chrome.storage.sync;
	} else {
		storageArea = chrome.storage.local;
	}
	// Now we know which storageArea to use, call setupInitial function
	setupInitial(); 
});

//wrapped the below inside a function so that we can call this once we know the value of storageArea from above. 

function setupInitial() {

	chrome.storage.local.get({
		disabled: false
	}, function (obj) {
		if (!obj.disabled) {
			setUpRedirectListener();
		} else {
			log('Redirector is disabled');
		}
	});
}
log('Redirector starting up...');
       