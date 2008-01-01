//// $Id$

var Redirect = {

    onLoad : function() {
        var item = window.arguments[0];
        item.saved = false;
        $('txtExampleUrl').value = item.exampleUrl;
        $('txtPattern').value = item.pattern;
        $('txtRedirectUrl').value = item.redirectUrl || '';
        $('txtExcludePattern').value = item.excludePattern || '';
        $('chkOnlyIfLinkExists').checked = item.onlyIfLinkExists || false;

        $('txtPattern').focus();
        this.strings = document.getElementById("redirector-strings");

        if (item.patternType == kRedirectorRegex) {
            $('rdoRegex').setAttribute('selected', true);
            $('rdoWildcard').setAttribute('selected', false);
        }
    },

    onAccept : function() {
        var item = window.arguments[0];

        item.pattern = $('txtPattern').value;
        if ($('rdoRegex').selected) {
            item.patternType = kRedirectorRegex;
        } else {
            item.patternType = kRedirectorWildcard;
        }
        item.exampleUrl =$('txtExampleUrl').value;
        item.redirectUrl = $('txtRedirectUrl').value;
        item.excludePattern = $('txtExcludePattern').value;
        item.onlyIfLinkExists = $('chkOnlyIfLinkExists').checked;
        item.saved = true;

        return true;
    },

    testPattern : function() {
        var redirectUrl, pattern, excludePattern, example, extName, isExcluded;

        redirectUrl = $('txtRedirectUrl').value;
        pattern = $('txtPattern').value;
        excludePattern = $('txtExcludePattern').value;
        example = $('txtExampleUrl').value;

        extName = this.strings.getString('extensionName');

        if ($('rdoRegex').selected) {
            redirectUrl = Redirector.regexMatch(pattern, example, redirectUrl);
            if (excludePattern) {
                isExcluded = Redirector.regexMatch(excludePattern, example, 'exclude');
            }
        } else {
            redirectUrl = Redirector.wildcardMatch(pattern, example, redirectUrl);
            if (excludePattern) {
                isExcluded = Redirector.wildcardMatch(excludePattern, example, 'exclude');
            }
        }

        var isRedirectMatch = redirectUrl || (redirectUrl === '' && $('txtRedirectUrl').value === '');
        if (isRedirectMatch && !isExcluded) {
            RedirLib.msgBox(extName, this.strings.getFormattedString('testPatternSuccess', [pattern, example, redirectUrl]));
        } else if (isExcluded) {
            RedirLib.msgBox(extName, this.strings.getFormattedString('testPatternExclude', [example, excludePattern]));
        } else {
            RedirLib.msgBox(extName, this.strings.getFormattedString('testPatternFailure', [pattern, example]));
        }
    }

};