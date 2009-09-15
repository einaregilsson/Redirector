//// $Id$
const CSSB_CONTRACTID = "@einaregilsson.com/redirector;1";
const CSSB_CID = Components.ID("{b7a7a54f-0581-47ff-b086-d6920cb7a3f7}");

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var kRedirectorWildcard = 'W';
var kRedirectorRegex= 'R';
var nsIContentPolicy = Ci.nsIContentPolicy;

function Redirector() {
	this.init();
}

try {
	Cc["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Ci.mozIJSSubScriptLoader)
			.loadSubScript('chrome://redirector/content/redirector.prototype.js');
} catch(e) {
	Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage('Loading Redirector implementation failed: ' + e);
}
/*
 * Factory object
 */

var redirectorInstance = null;

const factory = {
    // nsIFactory interface implementation
    createInstance: function(outer, iid) {
        if (outer != null) {
           Components.returnCode = Cr.NS_ERROR_NO_AGGREGATION;
           return null;
       }

        if (!iid.equals(Ci.nsIContentPolicy) &&
                !iid.equals(Ci.nsISupports)) {
            Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;          
            return null;
        }

        if(!redirectorInstance) {
            redirectorInstance = new Redirector();
            redirectorInstance.wrappedJSObject = redirectorInstance;
        }

        return redirectorInstance;
    },

    // nsISupports interface implementation
    QueryInterface: function(iid) {
        if (iid.equals(Ci.nsISupports) ||
                iid.equals(Ci.nsIModule) ||
                iid.equals(Ci.nsIFactory)) {
            return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;          
        return null;   
    }
}


/*
 * Module object
 */
const module = {
    registerSelf: function(compMgr, fileSpec, location, type) {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CSSB_CID, 
                                        "Redirector content policy",
                                        CSSB_CONTRACTID,
                                        fileSpec, location, type);

        var catman = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
        catman.addCategoryEntry("content-policy", CSSB_CONTRACTID, CSSB_CONTRACTID, true, true);
    },

    unregisterSelf: function(compMgr, fileSpec, location) {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar).unregisterFactoryLocation(CSSB_CID, fileSpec);
        Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager).deleteCategoryEntry("content-policy", CSSB_CONTRACTID, true);
    },

    getClassObject: function(compMgr, cid, iid) {
        if (cid.equals(CSSB_CID)) {
            return factory;
        }

        Components.returnCode = Cr.NS_ERROR_NOT_REGISTERED;
        return null;
    },

    canUnload: function(compMgr) {
        return true;
    }
};

function NSGetModule(comMgr, fileSpec) {
    return module;
}