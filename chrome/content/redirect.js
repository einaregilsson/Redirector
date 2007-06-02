//// $Id$

var Redirect = {

    onLoad : function() {
        var item = window.arguments[0];
        item.saved = false;
        $('txtExampleUrl').value = item.exampleUrl;
        $('txtPattern').value = item.pattern;
        $('txtRedirectUrl').value = item.redirectUrl || '';
        $('chkOnlyIfLinkExists').checked = item.onlyIfLinkExists || false;

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
        var match;

        alert(Redirector.wildcardMatch($('txtPattern').value, $('txtExampleUrl').value));
    }

};