//// $Id$

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Ci = Components.interfaces;
Cr = Components.results;
Cc = Components.classes;
const loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

function Redirector() {
	this.init();
	this.wrappedJSObject = this;
}

try {
	loader.loadSubScript('chrome://redirector/content/code/redirector.prototype.js');
	loader.loadSubScript('chrome://redirector/content/code/redirect.js');
	loader.loadSubScript('chrome://redirector/content/code/prefs.js');
} catch(e) {
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
xpcomInfo.QueryInterface 	= XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIChannelEventSink]);
xpcomInfo._xpcom_factory 	= {
	createInstance: function(outer, iid) {
		if (outer) throw Cr.NS_ERROR_NO_AGGREGATION;
		return redirector.QueryInterface(iid);
	}
};

function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule([Redirector]);
}

const redirector = new Redirector();
