//// $Id$

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;

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
		args.saved = true;
		this.saveValues(args.redirect);
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