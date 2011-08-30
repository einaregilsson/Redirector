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
	
	var template = $('#redirect-list').html().replace(/^\s*|\s$/g, '');
	function databind() {
		$('#redirect-list').empty();
		for (var i = 0; i < Redirector.redirectCount; i++) {
			var redirect = Redirector.getRedirectAt(i);
			var node = $(template);
			node.find('.pattern').html(redirect.includePattern);
			node.find('.redirectTo').html(redirect.redirectUrl);
			node.find('.exampleUrl').html(redirect.exampleUrl);
			node.find('.redirectResult').html(redirect.getMatch(redirect.exampleUrl).redirectTo);
			node.appendTo('#redirect-list');
			node.data('redirect', redirect);
		}
		
	}

	$('#redirect-list li div a.delete').live('click', function(ev) {
		var redirect = $(this.parentNode.parentNode).data('redirect');
		if (PromptService.confirm(null, tr("deleteConfirmationTitle"), tr("deleteConfirmationText"))) {
			Redirector.deleteRedirect(redirect);
			$(this.parentNode.parentNode).remove();
		}
		ev.preventDefault();
	});
	

	databind();
	$('#import').click(importRedirects);
	$('#export').click(exportRedirects);
	
	function bindConfig() {
		$('#config input[type="checkbox"]').each(function() {
			var pref = $(this).attr('data-pref');
			$(this).attr('checked', prefs[pref]);
		});
	}
	
	bindConfig();
	prefs.addListener({ changedPrefs:bindConfig});
	var moving = false;
	
	function drag() {
	
	}
	var movingElement = null;
	$('li').mousedown(function() {
		$(this).css('background', '-moz-linear-gradient(top, #aac, #99b)');
		$('#redirect-list').css('cursor', 'move');
		movingElement = this;
	});


	$('li').mouseover(function() {
		if (movingElement && this !== movingElement) {
			if ($(movingElement).offset().top > $(this).offset().top) {
				$(movingElement).detach().insertBefore(this);
			} else {
				$(movingElement).detach().insertAfter(this);
			}
		}
	});
	
	$(document).mouseup(function() {
		if (movingElement) {
			$(movingElement).css('background', '');
			movingElement = null;
			$('#redirect-list').css('cursor', '');
			var newOrder = {};
			$('#redirect-list li').each(function(i) {
				newOrder[$(this).data('redirect')] = i;
			});

			Redirector.sortRedirects(function(a,b) {
				return newOrder[a] - newOrder[b];
			});
		}
	});

	$('#config input[type="checkbox"]').bind('CheckboxStateChange', function() {
		var pref = $(this).attr('data-pref');
		prefs[pref] = !!$(this).attr('checked');
	});
});