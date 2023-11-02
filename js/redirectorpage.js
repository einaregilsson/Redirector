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
			showMessage('Sync is enabled!', true);
		} else if(response.message === "sync-disabled"){
			options.isSyncEnabled = false;
			showMessage('Sync is disabled - local storage will be used!', true);
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
		el('#storage-sync-option input').checked = options.isSyncEnabled;
	});
}

function renderRedirects() {
	el('.redirect-rows').textContent = '';
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

	let checkmark = node.querySelectorAll('.checkmark');

	if(checkmark.length == 1) {
		checkmark[0].setAttribute('data-index', index);
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

function checkIfGroupingExists() {
	let grouping = REDIRECTS.map((row, i) => { return { row, index: i}})
									.filter(result => result.row.grouped)
									.sort((a, b) => a.index - b.index);
	return grouping;
}

function toggleDisabled(index) {
	let grouping = checkIfGroupingExists();

	if(grouping && grouping.length > 1) {
		for (let redirect of grouping) {
			let redirectDom = REDIRECTS[redirect.index];
			redirectDom.disabled = !redirectDom.disabled
			redirectDom.grouped = !redirectDom.grouped
			let elm = document.querySelector("[data-index='" + (redirect.index).toString() + "']");
			clearGrouping(elm);
		}
	} else {
		let redirect = REDIRECTS[index];
		redirect.disabled = !redirect.disabled
	}

	updateBindings();
	saveChanges();
}

function clearGrouping(elm) {
	elm.classList.remove('grouped');
	let checkMarkElm = elm.querySelector("label > .groupings");
	let toggleBoxElm = elm.querySelector("input");
	checkMarkElm.classList.remove("checkMarked");
	toggleBoxElm.classList.remove("checked");
}

function swap(node1, node2) {
    const afterNode2 = node2.nextElementSibling;
    const parent = node2.parentNode;
    node1.replaceWith(node2);
    parent.insertBefore(node1, afterNode2);
}

function groupedMoveDown(group) {
		var jumpLength = 1;

		if(isGroupAdjacent(group)) {
			jumpLength = group.length;
		}

		for(let rule of group) {
			let elm = document.querySelector("[data-index='" + (rule.index).toString() + "']");
			let prev = document.querySelector("[data-index='" + (rule.index + jumpLength).toString() + "']");
			clearGrouping(elm);
			clearGrouping(prev);
			swap(elm,prev);
		}

		for(let rule of group) {
			rule.row.grouped = false;
			let prevRedir = REDIRECTS[rule.index + jumpLength];
			REDIRECTS[rule.index + jumpLength] = REDIRECTS[rule.index];
			REDIRECTS[rule.index] = prevRedir;
		}

	updateBindings();
	saveChanges();
}

function isGroupAdjacent(grouping) {
	let distances = [];
	for(let i = grouping.length - 1; i >= 0; i--) {
		if(i != 0) {
			distances.push(grouping[i].index - grouping[i - 1].index);
		}
	}
	return distances.every(distance => distance === 1);
}

function groupedMoveUp(group) {
	var jumpLength = 1;

	if(isGroupAdjacent(group)) {
		jumpLength = group.length;
	}

	for(let rule of group) {
		let elm = document.querySelector("[data-index='" + (rule.index).toString() + "']");
		let prev = document.querySelector("[data-index='" + (rule.index - jumpLength).toString() + "']");
		clearGrouping(elm);
		clearGrouping(prev);

		if(jumpLength > 1) {
			swap(elm,prev);
		}
	}

	for(let rule of group) {
		rule.row.grouped = false;
		let prevRedir = REDIRECTS[rule.index - jumpLength];
		REDIRECTS[rule.index - jumpLength] = REDIRECTS[rule.index];
		REDIRECTS[rule.index] = prevRedir;
	}

	updateBindings();
	saveChanges();
}
function moveUp(index) {
	let grouping = checkIfGroupingExists();

	if(grouping.length > 1) {
		groupedMoveUp(grouping);
	} else {
		let prev = REDIRECTS[index-1];
		REDIRECTS[index-1] = REDIRECTS[index];
		REDIRECTS[index] = prev;
	}

	updateBindings();
	saveChanges();
}

function moveDown(index) {
	let grouping = checkIfGroupingExists();

	if(grouping.length > 1) {
		groupedMoveDown(grouping);
	} else {
		let next = REDIRECTS[index+1];
		REDIRECTS[index+1] = REDIRECTS[index];
		REDIRECTS[index] = next;
	}
	updateBindings();
	saveChanges();
}

function moveUpTop(index) {
	let top = REDIRECTS[0];
	move(REDIRECTS, index, top);
	updateBindings();
	saveChanges();
}

function moveDownBottom(index) {
	let bottom = REDIRECTS.length - 1;
	move(REDIRECTS, index, bottom);
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
		el('#storage-sync-option input').checked = options.isSyncEnabled;
	});

	if(navigator.userAgent.toLowerCase().indexOf("chrome") > -1){
		show('#storage-sync-option');
	}


	//Setup event listeners
	el('#hide-message').addEventListener('click', hideMessage);
	el('#storage-sync-option input').addEventListener('click', toggleSyncSetting);
	el('.redirect-rows').addEventListener('click', function(ev) {
		if(ev.target.type == 'checkbox') {
			ev.target.nextElementSibling.classList.add("checkMarked");
			ev.target.parentElement.parentElement.classList.add('grouped');
			toggleGrouping(ev.target.index);
		}

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

function updateFavicon(e) {
	let type = e.matches ? 'dark' : 'light'
	el('link[rel="shortcut icon"]').href = `images/icon-${type}-theme-32.png`;
	chrome.runtime.sendMessage({type: "update-icon"}); //Only works if this page is open, but still, better than nothing...
}

let mql = window.matchMedia('(prefers-color-scheme:dark)');

mql.onchange = updateFavicon;
updateFavicon(mql);

function toggleGrouping(index) {
	if(REDIRECTS[index]) {
		REDIRECTS[index].grouped = !REDIRECTS[index].grouped;
	}
}

pageLoad();
