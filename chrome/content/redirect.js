//// $Id$

var Redirect = {

    onLoad : function() {
        var item = window.arguments[0];
        item.saved = false;
        $('txtExampleUrl').value = item.exampleUrl;
        $('txtPattern').value = item.pattern;
        $('txtRedirectUrl').value = item.redirectUrl || '';
        $('chkOnlyIfLinkExists').checked = item.onlyIfLinkExists || false;

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
        item.onlyIfLinkExists = $('chkOnlyIfLinkExists').checked;
        item.saved = true;

        return true;
    },

    testPattern : function() {
        var redirectUrl, pattern, example, extName;

        redirectUrl = $('txtRedirectUrl').value;
        pattern = $('txtPattern').value;
        example = $('txtExampleUrl').value;

        extName = this.strings.getString('extensionName');

        if ($('rdoRegex').selected) {
            redirectUrl = Redirector.regexMatch(pattern, example, redirectUrl);
        } else {
            redirectUrl = Redirector.wildcardMatch(pattern, example, redirectUrl);
        }

        if (redirectUrl || (redirectUrl === '' && $('txtRedirectUrl').value === '')) {
            RedirLib.msgBox(extName, this.strings.getFormattedString('testPatternSuccess', [pattern, example, redirectUrl]));
        } else {
            RedirLib.msgBox(extName, this.strings.getFormattedString('testPatternFailure', [pattern, example]));
        }
    }

};