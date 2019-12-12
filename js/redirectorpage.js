var REDIRECTS = []; // The global redirects list...
var options = {
	isSyncEnabled : false
};
var template;

function normalize(r) {
	return new Redirect(r).toObject(); //Cleans out any extra props, and adds default values for missing ones.
}

// Saves the entire list of redirects to storage.
function saveChanges() {

	// Clean them up so angular $$hash things and stuff don't get serialized.
	let arr = REDIRECTS.map(normalize);

	chrome.runtime.sendMessage({type:"save-redirects", redirects:arr}, function(response) {
		console.log(response.message);
		if(response.message.indexOf("Redirects failed to save") > -1){
			showMessage(response.message, false);
		} else{
			console.log('Saved ' + arr.length + ' redirects at ' + new Date() + '. Message from background page:' + response.message);
		}
	});
}
		
function toggleSyncSetting() {
	chrome.runtime.sendMessage({type:"toggle-sync", isSyncEnabled: !options.isSyncEnabled}, function(response) {
		if(response.message === "sync-enabled"){
			options.isSyncEnabled = true;
			showMessage('Sync is enabled!',true);
		} else if(response.message === "sync-disabled"){
			options.isSyncEnabled = false;
			showMessage('Sync is disabled - local storage will be used!',true);
		} else if(response.message.indexOf("Sync Not Possible")>-1){
			options.isSyncEnabled = false;
			chrome.storage.local.set({isSyncEnabled: $s.isSyncEnabled}, function(){
			 // console.log("set back to false");
			});
			showMessage(response.message, false);
		}
		else {
			alert(response.message)
			showMessage('Error occured when trying to change Sync settings. Look at the logs and raise an issue',false);
		}
		el('#storage-sync-option').checked = options.isSyncEnabled;
	});
}

function renderRedirects() {
	el('.redirect-rows').innerHTML = '';
	for (let i=0; i < REDIRECTS.length; i++) {
		let r = REDIRECTS[i];
		let node = template.cloneNode(true);
		node.removeAttribute('id');

		renderSingleRedirect(node, r, i);
		el('.redirect-rows').appendChild(node);
	}
}

function renderSingleRedirect(node, redirect, index) {
	
	//Add extra props to help with rendering...
	if (index === 0) {
		redirect.$first = true;
	}
	if (index === REDIRECTS.length - 1) {
		redirect.$last = true;
	} 
	redirect.$index = index;
	
	dataBind(node, redirect);

	node.setAttribute('data-index', index);
	for (let btn of node.querySelectorAll('.btn')) {
		btn.setAttribute('data-index', index);
	}

	//Remove extra props...
	delete redirect.$first;
	delete redirect.$last;
	delete redirect.$index;
}


function updateBindings() {

	let nodes = document.querySelectorAll('.redirect-row');

	if (nodes.length !== REDIRECTS.length) {
		throw new Error('Mismatch in lengths, Redirects are ' + REDIRECTS.length + ', nodes are ' + nodes.length)
	}

	for (let i=0; i < nodes.length; i++) {
		let node = nodes[i];
		let redirect = REDIRECTS[i];
		renderSingleRedirect(node, redirect, i);
	}
}

function duplicateRedirect(index) {
	let redirect = new Redirect(REDIRECTS[index]);
	REDIRECTS.splice(index, 0, redirect);

	let newNode = template.cloneNode(true);
	newNode.removeAttribute('id');
	el('.redirect-rows').appendChild(newNode);
	updateBindings();
	saveChanges();
}

function toggleDisabled(index) {
	let redirect = REDIRECTS[index];
	redirect.disabled = !redirect.disabled
	updateBindings();
	saveChanges();
}


function moveUp(index) {
	let prev = REDIRECTS[index-1];
	REDIRECTS[index-1] = REDIRECTS[index];
	REDIRECTS[index] = prev;
	updateBindings();
	saveChanges();
}

function moveDown(index) {
	let next = REDIRECTS[index+1];
	REDIRECTS[index+1] = REDIRECTS[index];
	REDIRECTS[index] = next;
	updateBindings();
	saveChanges();
}

//All the setup stuff for the page
function pageLoad() {
	template = el('#redirect-row-template');
	template.parentNode.removeChild(template);
	
	//Need to proxy this through the background page, because Firefox gives us dead objects
	//nonsense when accessing chrome.storage directly.
	chrome.runtime.sendMessage({type: "get-redirects"}, function(response) {
		console.log('Received redirects message, count=' + response.redirects.length);
		for (var i=0; i < response.redirects.length; i++) {
			REDIRECTS.push(new Redirect(response.redirects[i]));
		}

		if (response.redirects.length === 0) {
			//Add example redirect for first time users...
			REDIRECTS.push(new Redirect(
				{
					"description": "Example redirect, try going to http://example.com/anywordhere",
					"exampleUrl": "http://example.com/some-word-that-matches-wildcard",
					"exampleResult": "https://google.com/search?q=some-word-that-matches-wildcard",
					"error": null,
					"includePattern": "http://example.com/*",
					"excludePattern": "",
					"patternDesc": "Any word after example.com leads to google search for that word.",
					"redirectUrl": "https://google.com/search?q=$1",
					"patternType": "W",
					"processMatches": "noProcessing",
					"disabled": false,
					"appliesTo": [
						"main_frame"
					]
				}
			));
		}
		renderRedirects();
	}); 

	chrome.storage.local.get({isSyncEnabled:false}, function(obj){
		options.isSyncEnabled = obj.isSyncEnabled;
		el('#storage-sync-option').checked = options.isSyncEnabled;
	});

	if(navigator.userAgent.toLowerCase().indexOf("chrome") > -1){
		show('#storage-sync-option');
	}


	//Setup event listeners
	el('#hide-message').addEventListener('click', hideMessage);
	el('#storage-sync-option input').addEventListener('click', toggleSyncSetting);

	el('.redirect-rows').addEventListener('click', function(ev) {
		let action = ev.target.getAttribute('data-action');

		//We clone and re-use nodes all the time, so instead of attaching and removing event handlers endlessly we just put
		//a data-action attribute on them with the name of the function that should be called...
		if (!action) {
			return;
		}

		let handler = window[action];

		let index = parseInt(ev.target.getAttribute('data-index'));

		handler(index);
	});
}

pageLoad();