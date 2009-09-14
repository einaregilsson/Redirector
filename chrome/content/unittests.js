
var tests = {
	"Wildcard matches" : {
		run : function(data) { return redirector.wildcardMatch(data[0], data[1], 'abc', false); },
		describe : function(data) { return data[0] + ' matches ' + data[1]; },
		tests : [
			['http://foo*', 'http://foobar.is'],
			['http://foo*', 'http://foo'],
			['*foo*', 'http://foo']
		]
	}
};
