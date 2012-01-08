Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Ci = Components.interfaces;
Cr = Components.results;

Components.utils.import("chrome://redirector/content/js/redirector.js");

function RedirectorComponent() { }

RedirectorComponent.prototype = {
  classDescription: "Redirector",
  classID:          Components.ID("{b7a7a54f-0581-47ff-b086-d6920cb7a3f7}"),
  contractID:       "@einaregilsson.com/redirector;1",
  QueryInterface: function(iid) {
	if (iid.equals(Ci.nsISupports) || iid.equals(Ci.nsIContentPolicy) || iid.equals(Ci.nsIChannelEventSink)) {
		return Redirector;
	}
	throw Cr.NS_ERROR_NO_INTERFACE;
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([RedirectorComponent]);
