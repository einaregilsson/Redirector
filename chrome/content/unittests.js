
var tests = {
	"Wildcard matches" : {
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
			var result = redirector.wildcardMatch(pattern, url, redirectUrl, false); 
			return result == expected;
		},
		
		describe : function(data) { return data[0] + ' matches ' + data[1] + ', matches=' + data[2]; },
		tests : [
			['http://foo*', 'http://foobar.is', 'bar.is'],
			['http://foo*', 'http://foo', ''],
			['*foo*', 'http://foo', 'http://,'],
			['*foo*', 'http://foobar.is', 'http://,bar.is'],
			['http://foo.is', 'http://foo.is', ''],
			['*', 'http://foo.is', 'http://foo.is'],
			['*://foo.is', 'http://foo.is', 'http'],
			['*://foo.is*', 'http://foo.is/bar/baz', 'http,/bar/baz'],
			['*://*oo*bar*', 'http://foo.is/bar/baz', 'http,f,.is/,/baz']
		]
	}
};
