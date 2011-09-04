
var EXPORTED_SYMBOLS = ['Redirect'];


function Redirect(exampleUrl, includePattern, redirectUrl, patternType, excludePattern, unescapeMatches, disabled) {
	this._init(exampleUrl, includePattern, redirectUrl, patternType, excludePattern, unescapeMatches, disabled);
}

//Static
Redirect.WILDCARD = 'W';
Redirect.REGEX = 'R';

Redirect.prototype = {
	
	//attributes
	exampleUrl : null,
			
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
	
	redirectUrl : null,
	
	get patternType() { return this._patternType; },
	set patternType(value) { 
		this._patternType = value;
		this.compile();
	},

	unescapeMatches : false,
	
	disabled : false,
	
	//Functions
	clone : function() {
		return new Redirect().fromObject(this.toObject());
	},
	
	compile : function() {
		this._rxInclude = this._compile(this._includePattern); 
		this._rxExclude = this._compile(this._excludePattern); 
	},

	toObject : function() {
		return {
			exampleUrl : this.exampleUrl,
			includePattern : this.includePattern,
			excludePattern : this.excludePattern,
			redirectUrl : this.redirectUrl,
			patternType : this.patternType,
			unescapeMatches : this.unescapeMatches,
			disabled : !!this.disabled
		};
	},

	fromObject : function(o) {
		for (var prop in o) {
			this[prop] = o[prop];
		}
		return this;
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
	
	isRegex: function() {
		return this.patternType == Redirect.REGEX;
	},
	
	isWildcard : function() {
		return this.patternType == Redirect.WILDCARD;	
	},

	test : function() {
		return this.getMatch(this.exampleUrl);	
	},

	
	//Private functions below	

	_includePattern : null,
	_excludePattern : null,
	_patternType : null,
	_rxInclude : null,
	_rxExclude : null,
	
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
			+  '\n\tExample url 	 : ' + this.exampleUrl
			+  '\n\tInclude pattern  : ' + this.includePattern
			+  '\n\tExclude pattern  : ' + this.excludePattern
			+  '\n\tRedirect url	 : ' + this.redirectUrl
			+  '\n\tPattern type	 : ' + this.patternType
			+  '\n\tUnescape matches : ' + this.unescapeMatches
			+  '\n\tDisabled		 : ' + this.disabled
			+  '\n}\n';
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
		if (!this._rxExclude) {
			return false;	
		}
		var shouldExclude = !!this._rxExclude.exec(url);	
		this._rxExclude.lastIndex = 0;
		return shouldExclude;
	}
};