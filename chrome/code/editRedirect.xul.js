Components.utils.import("chrome://redirector/content/code/redirect.js");

var EditRedirect = {
	txtExampleUrl : null,
	txtIncludePattern : null,
	txtRedirectUrl : null,
	txtExcludePattern : null,
	chkUnescapeMatches : null,
	rdoRegex : null,
	rdoWildcard : null, 
	
	onLoad : function() {
		var args = window.arguments[0];
		var redirect = args.redirect;
		this.txtExampleUrl = document.getElementById('txtExampleUrl');
		this.txtIncludePattern = document.getElementById('txtIncludePattern');
		this.txtRedirectUrl= document.getElementById('txtRedirectUrl');
		this.txtExcludePattern= document.getElementById('txtExcludePattern');
		this.chkUnescapeMatches= document.getElementById('chkUnescapeMatches');
		this.rdoWildcard= document.getElementById('rdoWildcard');
		this.rdoRegex = document.getElementById('rdoRegex');
	
		this.txtExampleUrl.value = redirect.exampleUrl;
		this.txtIncludePattern.value = redirect.includePattern;
		this.txtExcludePattern.value = redirect.excludePattern;
		this.txtRedirectUrl.value = redirect.redirectUrl;
		this.chkUnescapeMatches.setAttribute('checked', redirect.unescapeMatches);
		this.rdoRegex.setAttribute('selected', redirect.isRegex());
		this.rdoWildcard.setAttribute('selected', redirect.isWildcard());

		this.txtIncludePattern.focus();
		this.strings = document.getElementById("redirector-strings");
	},

	onAccept : function() {
		var args = window.arguments[0];
		var msg, title;
		args.saved = true;
		this.saveValues(args.redirect);
		
		var oldDisabled = args.redirect.disabled;
		args.redirect.disabled = false;
		if (!/^\s*$/.test(args.redirect.exampleUrl)) {
			var result = args.redirect.getMatch(args.redirect.exampleUrl);
			if (!result.isMatch) {
				title = this.strings.getString('warningExampleUrlDoesntMatchPatternTitle');
				msg = this.strings.getString('warningExampleUrlDoesntMatchPattern');
				var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
				var rv = ps.confirmEx(window, title, msg, ps.STD_YES_NO_BUTTONS, ps.BUTTON_TITLE_YES, ps.BUTTON_TITLE_NO, null, null, {});				
				return rv == 0;
			} else {
				var resultUrl = result.redirectTo;
				if (!resultUrl.match(/https?:/)) {
					var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
					var uri = ioService.newURI(args.redirect.exampleUrl, null, null); 
					resultUrl = uri.resolve(resultUrl);
				} 
		
				var secondResult = args.redirect.getMatch(resultUrl);
				if (secondResult.isMatch) {
					title = this.strings.getString('errorExampleUrlMatchesRecursiveTitle');
					msg = this.strings.getFormattedString('errorExampleUrlMatchesRecursive', [args.redirect.exampleUrl, resultUrl]);
					this.msgBox(title, msg);
					return false;
				}
			}
		}
		return true;
	},

	msgBox : function(title, text) {
		Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService)
				.alert(window, title, text);
	},
	
	saveValues : function(redirect) {
		redirect.exampleUrl = this.txtExampleUrl.value;
		redirect.includePattern = this.txtIncludePattern.value;
		redirect.excludePattern = this.txtExcludePattern.value;
		redirect.redirectUrl = this.txtRedirectUrl.value;
		redirect.patternType = this.rdoRegex.getAttribute('selected') == 'true' ? Redirect.REGEX : Redirect.WILDCARD;
		var val = this.chkUnescapeMatches.getAttribute('checked');
		redirect.unescapeMatches = val === 'true' || val === true;
		//Disabled cannot be set here
	},
	
	testPattern : function() {
		try {
			var redirect = new Redirect();
			this.saveValues(redirect);
			var extName = this.strings.getString('extensionName');
			var result = redirect.test();
			if (result.isMatch) {
				this.msgBox(extName, this.strings.getFormattedString('testPatternSuccess', [redirect.includePattern, redirect.exampleUrl, result.redirectTo]));
			} else if (result.isExcludeMatch) {
				this.msgBox(extName, this.strings.getFormattedString('testPatternExclude', [redirect.exampleUrl, redirect.excludePattern]));
			} else {
				this.msgBox(extName, this.strings.getFormattedString('testPatternFailure', [redirect.includePattern, redirect.exampleUrl]));
			}
		} catch(e) {alert(e);}
	}
};