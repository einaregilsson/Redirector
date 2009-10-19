//// $Id$

function Redirect(exampleUrl, includePattern, redirectUrl, patternType, excludePattern, unescapeMatches, disabled) {
	this._init(exampleUrl, includePattern, redirectUrl, patternType, excludePattern, unescapeMatches, disabled);
}

//Static
Redirect.WILDCARD = 'W';
Redirect.REGEX = 'R';

Redirect.prototype = {
	
	//These are the only ones that are necessary to have as properties for now
	//The others can be changed to properties later as neccessary
	_includePattern : null,
	_excludePattern : null,
	_patternType : null,
	_rxInclude : null,
	_rxExclude : null,

	get patternType() { return this._patternType; },
	set patternType(value) { 
		this._patternType = value;
		this.compile();
	},

	get includePattern() { return this._includePattern; },
	set includePattern(value) { 
		this._includePattern = value;
		this._rxInclude = this._compile(value); 
	},

	get excludePattern() { return this._excludePattern; },
	set excludePattern(value) { 
		this._excludePattern = value; 
		this._rxExclude = this._compile(value); 
	},
	
	_preparePattern : function(pattern) {
		if (this.patternType == Redirect.REGEX) {
			return pattern;	
		} else { //Convert wildcard to regex pattern
			var converted = '^';
			for (var i = 0; i < pattern.length; i++) {
				var ch = pattern.charAt(i);
				if ('()[]{}?.^$\\+'.indexOf(ch) != -1) {
					converted += '\\' + ch;
				} else if (ch == '*') {
					converted += '(.*?)';
				} else {
					converted += ch;
				}
			}
			converted += '$';
			return converted;
		}
	},
	
	compile : function() {
		this._rxInclude = this._compile(this._includePattern); 
		this._rxExclude = this._compile(this._excludePattern); 
	},
	
	_compile : function(pattern) {
		if (!pattern) {
			return null;
		}
		return new RegExp(this._preparePattern(pattern),"gi");
	},
	
	_init : function(exampleUrl, includePattern, redirectUrl, patternType, excludePattern, unescapeMatches, disabled) {
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
			   , this.redirectUrl
			   , this.patternType
			   , this.excludePattern
			   , this.unescapeMatches
			   , this.disabled ].join(',,,');
	},
	
	deserialize : function(str) {
		if (!str || !str.split) {
			throw Error("Invalid serialized redirect: " + str);
		}	
		var parts = str.split(',,,');
		if (parts.length < 5) {
			throw Error("Invalid serialized redirect, too few fields: " + str);
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

		redirectTo = this._includeMatch(url);
        if (redirectTo !== null) {
	        if (this.disabled) {
				result.isDisabledMatch = true;
			} else if (this._excludeMatch(url)) {
	            result.isExcludeMatch = true;
		  	} else {
	         	result.isMatch = true;
	         	result.redirectTo = redirectTo;
	        }
        }
     	return result;   
	},
	
	_includeMatch : function(url) {
		if (!this._rxInclude) {
			return null;
		}	
		var matches = this._rxInclude.exec(url);
		if (!matches) {
			return null;
		}
		var resultUrl = this.redirectUrl;
        for (var i = 1; i < matches.length; i++) {
            resultUrl = resultUrl.replace(new RegExp('\\$' + i, 'gi'), this.unescapeMatches ? unescape(matches[i]) : matches[i]);
        }
        this._rxInclude.lastIndex = 0;
        return resultUrl;
	},
	
	_excludeMatch : function(url) {
		var shouldExclude = !!(this._rxExclude && this._rxExclude.exec(url));	
		this._rxExclude.lastIndex = 0;
		return shouldExclude;
	},
    
    clone : function() {
		return new Redirect(this.exampleUrl, this.includePattern, 
							this.redirectUrl, this.patternType, 
							this.excludePattern, this.unescapeMatches,
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