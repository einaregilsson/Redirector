Components.utils.import("chrome://redirector/content/code/redirector.js");
Components.utils.import("chrome://redirector/content/code/redirectorprefs.js");
Components.utils.import("chrome://redirector/content/code/xpcom.js");

$(document).ready(function() {
	var prefs = new RedirectorPrefs();
	var strings = StringBundleService.createBundle('chrome://redirector/locale/redirector.properties', LocaleService.getApplicationLocale());
	function tr(name) {
		return strings.GetStringFromName(name);
	}
	
	function trPlural(name, count) {
		name += count == 1 ? 'Singular' : '';
		return strings.formatStringFromName(name, [count],1);
	}

	function getFile(captionKey, mode) {
		var picker = new FilePicker(window, tr(captionKey), mode);
		picker.defaultExtension = ".rjson";
		var dir = prefs.defaultDir;
		if (dir) {
			picker.displayDirectory = new LocalFile(dir);
		}
		picker.appendFilter(tr('redirectorFiles'), '*.rjson');
		
		if (picker.show() == picker.returnCancel) {
			return null;
		}
		prefs.defaultDir = picker.displayDirectory.path;
		return picker.file;
	}
	
	function exportRedirects() {
		var file = getFile('exportCaption', FilePickerMode.save);
		if (file) {
			Redirector.exportRedirects(file);
		}
	}
	
	function importRedirects() {
		var file = getFile('importCaption', FilePickerMode.open);
		var result;
		if (!file) {
			return;
		}
		result = Redirector.importRedirects(file);
		var msg, imported, existed;
		imported = result & 0xFFFF;
		existed = result >> 16;
		
		if (imported > 0) {
			msg = trPlural('importedMessage', imported);
			if (existed > 0) {
				msg += ', ' + trPlural('existedMessage',existed); 
			} else {
				msg += '.'; 
			}
		} else if (imported == 0 && existed > 0) {
			msg = trPlural('allExistedMessage', existed);
		} else { //Both 0
			msg = tr('importedNone');
		}

		var title = tr('importResult');
		PromptService.alert(null, title, msg);

		if (imported > 0) {
			var newlist = [];
			for (var i = Redirector.redirectCount-imported; i < Redirector.redirectCount; i++) {
				newlist.push(Redirector.getRedirectAt(i));
			}				
			//this.addItemsToListBox(newlist);
		}
	}
	
	function databind() {
		for (var i = 0; i < Redirector.redirectCount; i++) {
			var redirect = Redirector.getRedirectAt(i);
			$('#redirect-list');
		}
	}

	$('#import').click(importRedirects);
	$('#export').click(exportRedirects);
});