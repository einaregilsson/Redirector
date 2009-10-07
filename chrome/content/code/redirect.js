//// $Id$

function Redirect(exampleUrl, includePattern, excludePattern, patternType, unescapeMatches, disabled) {
	this._init(exampleUrl, includePattern, excludePattern, patternType, unescapeMatches, disabled);
}

//Static
Redirect.WILDCARD = 'W';
Redirect.REGEX = 'R';

Redirect.prototype = {
	_init : function(exampleUrl, includePattern, excludePattern, redirectUrl, patternType, unescapeMatches, disabled) {
		this.exampleUrl = exampleUrl || '';
		this.includePattern = includePattern || '';
		this.excludePattern = excludePattern || '';
		this.redirectUrl = redirectUrl || '';
		this.patternType = patternType || Redirect.WILDCARD;
		this.unescapeMatches = (unescapeMatches === 'true' || unescapeMatches === true);
		this.disabled = (disabled === 'true' || disabled === true);
	},
	
	toString : function() {
		return 'REDIRECT: {'
			+  '\n\tExample url      : ' + this.exampleUrl
			+  '\n\tInclude pattern  : ' + this.includePattern
			+  '\n\tExclude pattern  : ' + this.excludePattern
			+  '\n\tRedirect url     : ' + this.redirectUrl
			+  '\n\tPattern type     : ' + this.patternType
			+  '\n\tUnescape matches : ' + this.unescapeMatches
			+  '\n\tDisabled         : ' + this.disabled
			+  '\n}\n';
	},
	
	isWildcard : function() {
		return this.patternType == Redirect.WILDCARD;	
	},
	
	isRegex: function() {
		return this.patternType == Redirect.REGEX;
	},
	
	test : function() {
		return this.getMatch(this.exampleUrl);	
	},

	serialize : function() {
		return [ this.exampleUrl
			   , this.includePattern
			   , this.excludePattern
			   , this.redirectUrl
			   , this.patternType
			   , this.unescapeMatches
			   , this.disabled ].join(',,,');
	},
	
	deserialize : function(str) {
		if (!str || !str.split) {
			//TODO: THROW ERROR	
		}	
		var parts = str.split(',,,');
		if (parts.length < 5) {
			///TODO: throw
		}
		this._init.apply(this, parts);
	},
	
	getMatch: function(url) {
		var result = { 
			isMatch : false, 
			isExcludeMatch : false, 
			isDisabledMatch : false, 
			redirectTo : '',
			toString : function() { return "{ isMatch : " + this.isMatch + 
			                               ", isExcludeMatch : " + this.isExcludeMatch + 
			                               ", isDisabledMatch : " + this.isDisabledMatch + 
			                               ", redirectTo : \"" + this.redirectTo + "\"" +
			                               "}"; }
		};
		var redirectTo = null;

		redirectTo = this._match(url, this.includePattern, this.redirectUrl);
        if (redirectTo !== null) {
	        if (this.disabled) {
				result.isDisabledMatch = true;
			} else if (this._match(url, this.excludePattern, 'exclude') == 'exclude') {
	            result.isExcludeMatch = true;
		  	} else {
	         	result.isMatch = true;
	         	result.redirectTo = redirectTo;
	        }
        }
     	return result;   
	},
	
	_match : function(url, pattern, redirectUrl) {
		if (this.isWildcard()) {
			return this._wildcardMatch(url, pattern, redirectUrl);	
		} else {
			return this._regexMatch(url, pattern, redirectUrl);	
		}	
	},
	
    _wildcardMatch : function(url, pattern, redirectUrl) {

	    if (!pattern || !url) {
	    	return null;
		}
		if (pattern.indexOf('*') == -1) {
			return (pattern == url) ? redirectUrl : null;
		}
		
		var parts = pattern.split('*');  
		var first = parts[0], 
		    last  = parts[parts.length-1];

		if (first) {
			if (url.substr(0, first.length) != first) {
				return null;
			}
			url = url.substr(first.length);
		}

		if (last) {
			if (url.substr(url.length-last.length) != last) {
				return null;
			}
			url = url.substr(0, url.length-last.length);
		}
		
		if ((first || last) && parts.length == 2) {
			return redirectUrl.replace('$1', url);
		}
		parts.splice(0,1);
		parts.splice(parts.length-1,1);
		var pos = 0, lastPos = 0;
    	var matches = [];
		for each(part in parts) {
            pos = url.indexOf(part, lastPos);
            if (pos == -1) {
                return null;
            }
            var match = url.substr(lastPos, pos-lastPos);
            matches.push(match);
            lastPos = pos + part.length;
        }
        matches.push(url.substr(lastPos));
        
        return this._replaceCaptures(redirectUrl, matches);
    },
    
    _regexMatch : function(url, pattern, redirectUrl, unescapeMatches) {

        if (!pattern) {
            return null;
        }
        var strings, rx, match;
        try {
            rx = new RegExp(pattern, 'gi');
            match = rx.exec(url);
        } catch(e) {
	        //External users can display this to the user if they want
	        throw { type : 'regexPatternError', 
	        		'pattern' : pattern, 
	        		message : "The pattern '" + pattern + "' is not a valid regular expression",
	        		toString : function() { return this.message; }
	        };
        }

        var rxrepl;

        if (!match) {
	    	return null;   
        }
        match.splice(0,1); //First element in regex match is the whole match
        return this._replaceCaptures(redirectUrl, match);
    },
    
    _replaceCaptures : function(redirectUrl, captures) {
        for (var i = 1; i <= captures.length; i++) {
            redirectUrl = redirectUrl.replace(new RegExp('\\$' + i, 'gi'), this.unescapeMatches ? unescape(captures[i-1]) : captures[i-1]);
        }
        return redirectUrl;
    },
    
    clone : function() {
		return new Redirect(this.exampleUrl, this.includePattern, 
							this.excludePattern, this.redirectUrl, 
							this.patternType, this.unescapeMatches,
							this.disabled);    
    },
    
    copyValues : function(other) {
		this.exampleUrl = other.exampleUrl;
		this.includePattern = other.includePattern;
		this.excludePattern = other.excludePattern;
		this.redirectUrl = other.redirectUrl;
		this.patternType = other.patternType;
		this.unescapeMatches = other.unescapeMatches;
		this.disabled = other.disabled;
    },
    
    equals : function(redirect) {
		return this.exampleUrl == redirect.exampleUrl
			&& this.includePattern == redirect.includePattern
			&& this.excludePattern == redirect.excludePattern
			&& this.redirectUrl == redirect.redirectUrl
			&& this.patternType == redirect.patternType
			&& this.unescapeMatches == redirect.unescapeMatches
		;
    }    
};