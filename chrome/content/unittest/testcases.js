//// $Id$
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
			var redirect = new Redirect(null, pattern, null, redirectUrl, Redirect.WILDCARD, null);
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
			var redirect = new Redirect(null, pattern, null, redirectUrl, Redirect.REGEX, null);
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
	}
	
};
