Components.utils.import("chrome://redirector/content/js/redirect.js");
Components.utils.import("chrome://redirector/content/js/redirector.js");
Components.utils.import("chrome://redirector/content/js/redirectorprefs.js");
Components.utils.import("chrome://redirector/content/js/xpcom.js");

jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft() + "px");
    return this;
}

function alert(title, msg) {
	PromptService.alert(null, title, msg);
}

function tr(name, args) {
	if (args) {
		return strings.formatStringFromName(name, args, args.length);
	} else {
		return strings.GetStringFromName(name);
	}
}

function validateRedirect(redirect) {
	if (!/^\s*$/.test(redirect.exampleUrl)) {
		var result = redirect.getMatch(redirect.exampleUrl);
		if (!result.isMatch) {
			title = tr('warningExampleUrlDoesntMatchPatternTitle');
			msg = tr('warningExampleUrlDoesntMatchPattern');
			var rv = PromptService.confirmEx(window, title, msg, PromptService.STD_YES_NO_BUTTONS, PromptService.BUTTON_TITLE_YES, PromptService.BUTTON_TITLE_NO, null, null, {});				
			return rv == 0;
		} else {
			var resultUrl = result.redirectTo;
			if (!resultUrl.match(/https?:/)) {
				var uri = IOService.newURI(redirect.exampleUrl, null, null); 
				resultUrl = uri.resolve(resultUrl);
			} 
	
			var secondResult = redirect.getMatch(resultUrl);
			if (secondResult.isMatch) {
				title = tr('errorExampleUrlMatchesRecursiveTitle');
				msg = tr('errorExampleUrlMatchesRecursive', [redirect.exampleUrl, resultUrl]);
				alert(title, msg);
				return false;
			}
		}
	}
	return true;
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
	alert(title, msg);

	if (imported > 0) {
		var newlist = [];
		for (var i = Redirector.redirectCount-imported; i < Redirector.redirectCount; i++) {
			newlist.push(Redirector.getRedirectAt(i));
		}				
		databind();
	}
}

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

function bindRedirect(redirect) {
	$('#description').val(redirect.description);
	$('#example-url').val(redirect.exampleUrl);
	$('#include-pattern').val(redirect.includePattern);
	$('#exclude-pattern').val(redirect.excludePattern);
	$('#redirect-to').val(redirect.redirectUrl);
	$('#redirect-enabled').attr('checked', !redirect.disabled);
	$('#unescape-matches').attr('checked', redirect.unescapeMatches);
	$('#regex-pattern').attr('checked', redirect.patternType == Redirect.REGEX);
	$('#wildcard-pattern').attr('checked', redirect.patternType == Redirect.WILDCARD);
}

function showRedirect(redirect) {
	bindRedirect(redirect);
	$('#redirect-form').center().css('top', '-=40px').show();
}

function controlsToRedirect(redirect) {
	redirect.description = $('#description').val();
	redirect.exampleUrl = $('#example-url').val();
	redirect.includePattern = $('#include-pattern').val();
	redirect.excludePattern = $('#exclude-pattern').val();
	redirect.redirectUrl = $('#redirect-to').val();
	redirect.disabled =	!$('#redirect-enabled').attr('checked');
	redirect.unescapeMatches = $('#unescape-matches').attr('checked');
	if ($('#regex-pattern').attr('checked')) {
		redirect.patternType = Redirect.REGEX;
	} else {
		redirect.patternType = Redirect.WILDCARD;
	}
}

function saveRedirect() {
	//First validate:
	var tmpRedirect = new Redirect();
	controlsToRedirect(tmpRedirect);
	if (!validateRedirect(tmpRedirect)) {
		return;
	}
	var isNew = !window.editRedirect;
	var redirect = isNew ? new Redirect() : window.editRedirect;
	controlsToRedirect(redirect);
	if (isNew) {
		Redirector.addRedirect(redirect);
	}
	Redirector.save();
	$('#redirect-form').hide();
	databind();
}

function configure() {
	$('#config').center().css('top', '-=40px').show();
}
function bindConfig() {
	$('#config input[type="checkbox"]').each(function() {
		var pref = $(this).attr('data-pref');
		$(this).attr('checked', prefs[pref]);
	});
}

function testPattern() {
	try {
		var redirect = new Redirect();
		controlsToRedirect(redirect);
		var extName = tr('extensionName');
		var result = redirect.test();
		if (result.isMatch) {
			alert(extName, tr('testPatternSuccess', [redirect.includePattern, redirect.exampleUrl, result.redirectTo]));
		} else if (result.isExcludeMatch) {
			alert(extName, tr('testPatternExclude', [redirect.exampleUrl, redirect.excludePattern]));
		} else {
			alert(extName, tr('testPatternFailure', [redirect.includePattern, redirect.exampleUrl]));
		}
	} catch(e) {
		alert('Error', e.toString());
	}
}


$(document).ready(function() {
	window.template = $('#redirect-list').html().replace(/^\s*|\s$/g, '');
	window.strings = StringBundleService.createBundle('chrome://redirector/locale/redirector.properties', LocaleService.getApplicationLocale());	
	window.prefs = new RedirectorPrefs();

	$('link').attr('href',$('link').attr('href')+new Date());

	$('#redirect-list li div a.delete').live('click', function(ev) {
		var redirect = $(this.parentNode.parentNode).data('redirect');
		if (PromptService.confirm(null, tr("deleteConfirmationTitle"), tr("deleteConfirmationText"))) {
			Redirector.deleteRedirect(redirect);
			$(this.parentNode.parentNode).fadeOut(function() { $(this).remove(); });
		}
		ev.preventDefault();
	});
	
	$('#redirect-list li div a.edit').live('click', function(ev) {
		var redirect = $(this.parentNode.parentNode).data('redirect');
		window.editRedirect = redirect;
		showRedirect(redirect);
		ev.preventDefault();
	});

	databind();
	$('#import').click(importRedirects);
	$('#export').click(exportRedirects);
	$('#new-redirect').click(function() { window.editRedirect = null; showRedirect({patternType:Redirect.REGEX});});
	$('#configure').click(configure);
	$('#cancel').click(function() { $('#redirect-form').hide();});
	$('#configure').click(configure);
	$('#save').click(saveRedirect);
	$('#test-pattern').click(testPattern);
	$('#close').click(function() {
		$('#config').hide();
	});
	$('#help').click(function() {
		window.location.href = "chrome://redirector/content/help.html";	
	});
	
	bindConfig();
	prefs.addListener({ changedPrefs:bindConfig});

	var movingElement = null;
	$('li').mousedown(function(ev) {
		if (ev.target && ev.target.tagName == 'A') {
			return;
		}
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
