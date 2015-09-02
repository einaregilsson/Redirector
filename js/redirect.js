
function Redirect(o) {
	this._init(o);
}

//Static
Redirect.WILDCARD = 'W';
Redirect.REGEX = 'R';

Redirect.prototype = {
	
	//attributes
	description : '',
	exampleUrl : '',
	includePattern : '',
	excludePattern : '',
	redirectUrl : '',
	patternType : '',
	unescapeMatches : false,
	escapeMatches : false,
	disabled : false,
	
	compile : function() {
		this._rxInclude = this._compile(this._includePattern); 
		this._rxExclude = this._compile(this._excludePattern); 
	},

	equals : function(redirect) {
		return this.description == redirect.description
			&& this.exampleUrl == redirect.exampleUrl
			&& this.includePattern == redirect.includePattern
			&& this.excludePattern == redirect.excludePattern
			&& this.redirectUrl == redirect.redirectUrl
			&& this.patternType == redirect.patternType
			&& this.unescapeMatches == redirect.unescapeMatches
			&& this.escapeMatches == redirect.escapeMatches
			&& this.appliesTo.toString() == redirect.appliesTo.toString();
	},
	
	toObject : function() {
		return {
			description : this.description,
			exampleUrl : this.exampleUrl,
			includePattern : this.includePattern,
			excludePattern : this.excludePattern,
			redirectUrl : this.redirectUrl,
			patternType : this.patternType,
			unescapeMatches : this.unescapeMatches,
			escapeMatches : this.escapeMatches,
			disabled : this.disabled,
			appliesTo : this.appliesTo.slice(0)
		};
	},

	getMatch: function(url) {
		var result = { 
			isMatch : false, 
			isExcludeMatch : false, 
			isDisabledMatch : false, 
			redirectTo : '',
			toString : function() { return JSON.stringify(this); }
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
	
	_init : function(o) {
		this.description = o.description || '',
		this.exampleUrl = o.exampleUrl || '';
		this.includePattern = o.includePattern || '';
		this.excludePattern = o.excludePattern || '';
		this.redirectUrl = o.redirectUrl || '';
		this.patternType = o.patternType || Redirect.WILDCARD;
		this.unescapeMatches = !!o.unescapeMatches;
		this.escapeMatches = !!o.escapeMatches;
		this.disabled = !!o.disabled;
		if (o.appliesTo && o.appliesTo.length) {
			this.appliesTo = o.appliesTo.slice(0);
		} else {
			this.appliesTo = ['main_frame'];
		}
	},
	
	toString : function() {
		return 'REDIRECT: {'
			+  '\n\tExample url 	 : ' + this.exampleUrl
			+  '\n\tInclude pattern  : ' + this.includePattern
			+  '\n\tExclude pattern  : ' + this.excludePattern
			+  '\n\tRedirect url	 : ' + this.redirectUrl
			+  '\n\tPattern type	 : ' + this.patternType
			+  '\n\tUnescape matches : ' + this.unescapeMatches
			+  '\n\tEscape matches : ' + this.escapeMatches
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
			var repl = matches[i] || '';
			if (this.unescapeMatches) {
				repl = unescape(repl);
			}
			if (this.escapeMatches) {
				repl = encodeURIComponent(repl);
			}
			resultUrl = resultUrl.replace(new RegExp('\\$' + i, 'gi'), repl);
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
