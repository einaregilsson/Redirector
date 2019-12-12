// Shows a message explaining how many redirects were imported.
function showImportedMessage(imported, existing) {
	if (imported == 0 && existing == 0) {
		showMessage('No redirects existed in the file.');
	}
	if (imported > 0 && existing == 0) {
		showMessage('Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's.' : '.'), true);
	}
	if (imported == 0 && existing > 0) {
		showMessage('All redirects in the file already existed and were ignored.');
	}
	if (imported > 0 && existing > 0) {
		var m = 'Successfully imported ' + imported + ' redirect' + (imported > 1 ? 's' : '') + '. ';
		if (existing == 1) {
			m += '1 redirect already existed and was ignored.';
		} else {
			m += existing + ' redirects already existed and were ignored.'; 
		}
		showMessage(m, true);
	}
}

function importRedirects(ev) {
	
	let file = ev.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	
	reader.onload = function(e) {
		var data;
		try {
			data = JSON.parse(reader.result);
		} catch(e) {
			showMessage('Failed to parse JSON data, invalid JSON: ' + (e.message||'').substr(0,100));
			return;
		}

		if (!data.redirects) {
			showMessage('Invalid JSON, missing "redirects" property');
			return;
		}

		var imported = 0, existing = 0;
		for (var i = 0; i < data.redirects.length; i++) {
			var r = new Redirect(data.redirects[i]);
			r.updateExampleResult();
			if (REDIRECTS.some(function(i) { return new Redirect(i).equals(r);})) {
				existing++;
			} else {
				REDIRECTS.push(r.toObject());
				imported++;
			}
		}
		
		showImportedMessage(imported, existing);

		saveChanges();
		renderRedirects();
	};

	try {
		reader.readAsText(file, 'utf-8');
	} catch(e) {
		showMessage('Failed to read import file');
	}
}

function updateExportLink() {
	var redirects = REDIRECTS.map(function(r) {
		return new Redirect(r).toObject();
	});

	let	version = chrome.runtime.getManifest().version;

	var exportObj = { 
		createdBy : 'Redirector v' + version, 
		createdAt : new Date(), 
		redirects : redirects 
	};

	var json = JSON.stringify(exportObj, null, 4);

	//Using encodeURIComponent here instead of base64 because base64 always messed up our encoding for some reason...
	el('#export-link').href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(json); 
}

updateExportLink();

function setupImportExportEventListeners() {
	el("#import-file").addEventListener('change', importRedirects);
	el("#export-link").addEventListener('mousedown', updateExportLink);
}

setupImportExportEventListeners();