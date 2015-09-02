//// $Id$
var nsIContentPolicy = Components.interfaces.nsIContentPolicy;

var tests = {
	"Wildcard matches" : {
		run : function(data,log) { 
			var pattern = data[0],
				url = data[1],
				expected = data[2];
			var parts = expected.split(',');
			var redirectUrl = '';
			if (!(parts.length == 1 && parts[0] == '')) {
				for (var i in parts) {
					redirectUrl += '$' + (parseFloat(i)+1) + ',';
				}
				redirectUrl = redirectUrl.substr(0, redirectUrl.length-1);
			}
			var redirect = new Redirect(null, pattern, redirectUrl, Redirect.WILDCARD);
			var result = redirect.getMatch(url);
			return { passed: result.isMatch && (result.redirectTo == expected), message : "Expected '" + expected + "', actual was '" + result.redirectTo + "'"};
		},
		
		describe : function(data) { return data[0] + ' == ' + data[1] + ', matches=' + data[2]; },
		tests : [
			['http://foo*', 'http://foobar.is', 'bar.is'],
			['http://foo*', 'http://foo', ''],
			['*://foo.is', 'http://foo.is', 'http'],
			['*http://foo.is', 'http://foo.is', ''],
			['http*foo*', 'http://foobar.is', '://,bar.is'],
			['http*foo*', 'http://foo', '://,'],
			['*://f*.is', 'http://foo.is', 'http,oo'],
			['*http://f*.is', 'http://foo.is', ',oo'],
			['*foo*', 'http://foo', 'http://,'],
			['*foo*', 'foobar.is', ',bar.is'],
			['*foo*', 'http://foobar.is', 'http://,bar.is'],
			['http://foo.is', 'http://foo.is', ''],
			['*', 'http://foo.is', 'http://foo.is'],
			['*://*oo*bar*', 'http://foo.is/bar/baz', 'http,f,.is/,/baz'],
			['*://**oo*bar*', 'http://foo.is/bar/baz', 'http,,f,.is/,/baz'],
		]
	},
	
	"Regex matches" : {
		run : function(data) { 
			var pattern = data[0],
				url = data[1],
				expected = data[2];
			var parts = expected.split(',');
			var redirectUrl = '';
			if (!(parts.length == 1 && parts[0] == '')) {
				for (var i in parts) {
					redirectUrl += '$' + (parseFloat(i)+1) + ',';
				}
				redirectUrl = redirectUrl.substr(0, redirectUrl.length-1);
			}
			var redirect = new Redirect(null, pattern, redirectUrl, Redirect.REGEX, null, null);
			var result = redirect.getMatch(url);
			return { passed: result.isMatch && result.redirectTo == expected, message : "Expected '" + expected + "', actual was '" + result.redirectTo + "'"};
		},
		
		describe : function(data) { return data[0] + ' == ' + data[1] + ', matches=' + data[2]; },
		tests : [
			['http://foo(.*)', 'http://foobar.is', 'bar.is'],
			['http://foo(.*)', 'http://foo', ''],
			['(.*)://foo.is', 'http://foo.is', 'http'],
			['(.*)http://foo\\.is', 'http://foo.is', ''],
			['http(.*)foo(.*)', 'http://foobar.is', '://,bar.is'],
			['http(.*)foo(.*)', 'http://foo', '://,'],
			['(.*)://f(.*)\\.is', 'http://foo.is', 'http,oo'],
			['(.*)http://f(.*)\\.is', 'http://foo.is', ',oo'],
			['(.*)foo(.*)', 'http://foo', 'http://,'],
			['(.*)foo(.*)', 'foobar.is', ',bar.is'],
			['(.*)foo(.*)', 'http://foobar.is', 'http://,bar.is'],
			['http://foo\.is', 'http://foo.is', ''],
			['(.*)', 'http://foo.is', 'http://foo.is'],
			['(.*)://(.*)oo(.*)bar(.*)', 'http://foo.is/bar/baz', 'http,f,.is/,/baz'],
			['(.*)://(.*?)(.*)oo(.*)bar(.*)', 'http://foo.is/bar/baz', 'http,,f,.is/,/baz'],
		]
	},
	
	"nsIContentPolicy implementation" : {
		run : function(data) {
			var runTest = function() {
				var args = {
					contentType : nsIContentPolicy.TYPE_DOCUMENT, 
					contentLocation : "http://foo.is", 
					requestOrigin : null, 
					aContext : { loadURI : function(){}}, 
					mimeTypeGuess : null, 
					extra : null
				};
				for (var key in data[1]) {
					args[key] = data[1][key];
				}
				
				var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  
				args.contentLocation = ioService.newURI(args.contentLocation, null, null);
				var contentPolicy = redirector.QueryInterface(nsIContentPolicy);
				var result = contentPolicy.shouldLoad(args.contentType, args.contentLocation, args.requestOrigin, args.aContext, args.mimeTypeGuess, args.extra);
				return { passed: result == nsIContentPolicy.ACCEPT, message : "Expected nsIContentPolicy.ACCEPT, actual was " + result };
			}
			
			if (typeof data[2] == "function") {
				return data[2](runTest);
			} else {
				return runTest();
			}
		},
		
		describe : function(data) { return data[0]; },
		tests : [
			["Accepts if not TYPE_DOCUMENT", { contentType : nsIContentPolicy.TYPE_STYLESHEET}],
			["Accepts if not http or https", { contentLocation : "resource://foo/bar"}],
			["Accepts if no aContext", { aContext : null}],
			["Accepts if aContext has no loadURI function", { aContext : { foo : function(){}}}],
			["Accepts if Redirector is not enabled", {}, function(doFunc) {
				try {
					redirector.enabled = false;
					return doFunc();
					redirector.enabled = true;

				} catch(e) {
					redirector.enabled = true;
					throw e;	
				}
			}]
		]		
	}
};
