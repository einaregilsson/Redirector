//// $Id$

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Ci = Components.interfaces;
Cr = Components.results;
Cc = Components.classes;
const loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

function rdump(msg) {
	//dump('\nREDIRECTOR: ' + msg);
}
var redirector = null;
function Redirector() {
	this._init();
}

try {
	loader.loadSubScript('chrome://redirector/content/code/redirector.prototype.js');
	loader.loadSubScript('chrome://redirector/content/code/redirect.js');
	loader.loadSubScript('chrome://redirector/content/code/redirectorprefs.js');
} catch(e) {
	rdump('ERROR: ' + e);
	for (i in e) {
		Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage('REDIRECTOR: Loading Redirector implementation failed: ' + i + e[i]);
	}
}

//Add the xpcom stuff to the prototype
var xpcomInfo = Redirector.prototype;
xpcomInfo.classDescription 	= "Redirector Component";
xpcomInfo.classID 			= Components.ID("{b7a7a54f-0581-47ff-b086-d6920cb7a3f7}");
xpcomInfo.contractID 		= "@einaregilsson.com/redirector;1";
xpcomInfo._xpcom_categories = [{category:'content-policy'},{category:'net-channel-event-sinks'}];
xpcomInfo.QueryInterface 	= XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIChannelEventSink, Ci.rdIRedirector]);
xpcomInfo._xpcom_factory 	= {
	createInstance: function(outer, iid) {
		if (outer) throw Cr.NS_ERROR_NO_AGGREGATION;
		if (redirector == null) {
			rdump('Creating new instance');
			redirector = new Redirector();	
		} else {
			rdump('Using existing instance');
		}
		return redirector.QueryInterface(iid);
	}
};

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([Redirector]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([Redirector]);