//Everything to do with the edit and delete forms is here...

var activeRedirect = null;

function createNewRedirect() {
	activeRedirect = new Redirect();
	el('#edit-redirect-form h3').innerHTML = 'Create Redirect';
	showForm('#edit-redirect-form', activeRedirect);
	el('#btn-save-redirect').setAttribute('disabled', 'disabled');
}

function editRedirect(ev) {
	let index = indexFromClickEvent(ev);
	el('#edit-redirect-form h3').innerHTML = 'Edit Redirect';
	activeRedirect = new Redirect(REDIRECTS[index]); //Make a new one, which we can dump a bunch of stuff on...
	activeRedirect.existing = true;
	activeRedirect.index = index;
	showForm('#edit-redirect-form', activeRedirect);
	setTimeout(() => el('input[data-bind="description"]').focus(), 200); //Why not working...?
}

function cancelEdit() {
	activeRedirect = null;
	hideForm('#edit-redirect-form');
}

function saveRedirect() {
	let savedRedirect = new Redirect(activeRedirect);
	if (activeRedirect.existing) {
		REDIRECTS[activeRedirect.index] = savedRedirect; //To strip out any extra crap we've added
	} else {
		REDIRECTS.push(savedRedirect);
	
		let newNode = template.cloneNode(true);
		newNode.removeAttribute('id');
		el('.redirect-rows').appendChild(newNode);
	}

	updateBindings();
	saveChanges();
	hideForm('#edit-redirect-form');
}

function toggleAdvancedOptions() {
	let advancedOptions = el('.advanced');
	if (advancedOptions.classList.contains('hidden')) {
		advancedOptions.classList.remove('hidden');
		el('#advanced-toggle a').innerHTML = 'Hide advanced options...';
	} else {
		advancedOptions.classList.add('hidden');
		el('#advanced-toggle a').innerHTML = 'Show advanced options...';
	}
}

//Listen to any change from the edit form...
el('#edit-redirect-form').addEventListener('input', function(ev) {

	//Now read values back from the form...
	for (let input of el('#edit-redirect-form').querySelectorAll('input[type="text"][data-bind]')) {
		let prop = input.getAttribute('data-bind');
		activeRedirect[prop] = input.value;
	}
	
	activeRedirect.appliesTo = [];
	for (let input of el('#apply-to').querySelectorAll('input:checked')) {
		activeRedirect.appliesTo.push(input.value);
	}	

	activeRedirect.processMatches = el('#process-matches option:checked').value;
	activeRedirect.patternType = el('[name="patterntype"]:checked').value;

	activeRedirect.updateExampleResult();

	dataBind('#edit-redirect-form', activeRedirect);
});


var deleteIndex;
function confirmDeleteRedirect(ev) {
	deleteIndex = indexFromClickEvent(ev);
	let redirect = REDIRECTS[deleteIndex];
	showForm('#delete-redirect-form', redirect);
}

function deleteRedirect() {
	REDIRECTS.splice(deleteIndex, 1);
	let node = el(`.redirect-row[data-index="${deleteIndex}"]`);
	node.parentNode.removeChild(node);
	updateBindings();
	saveChanges();
	hideForm('#delete-redirect-form');
}

function cancelDelete() {
	hideForm('#delete-redirect-form');
}