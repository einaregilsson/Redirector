/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *    RedirLib  -  Utility functions for Firefox extensions
 *
 *    Einar Egilsson
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var RedirLib = {

    _debug      : false,
    _ext        : null,
    _cout       : null,
    _prefBranch : null,
    version     : 0.2,

    initialize : function(extension) {
        this._ext = extension;
        this._cout = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
        this._debug = true;
        this._initPrefs();
    },

    debug : function(str) {
        if (this._ext.prefs.debug) {
            this._cout.logStringMessage("%1: %2"._(this._ext.name, str));
        }
    },


    debugObject : function(name, obj) {
        s = name + ': ';
        for (x in obj)
            s += "\n\t%1 : %2"._(x, obj[x]);
        this.debug(s);
    },

    //Adds all prefs to a prefs object on the extension object, and registers a pref observer
    //for the branch.
    _initPrefs : function() {

        this._prefBranch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService)
                                .getBranch("extensions.%1."._(this._ext.id.split("@")[0]));
        this._ext.prefs = {};

        var list = this._prefBranch.getChildList("", {}).toString().split(",");

        for (i in list) {

            var name = list[i];

            var type = this._prefBranch.getPrefType(name);

            if (type == this._prefBranch.PREF_STRING) {
                this._ext.prefs[name] = this._prefBranch.getCharPref(name);
            } else if (type == this._prefBranch.PREF_INT)  {
                this._ext.prefs[name] = this._prefBranch.getIntPref(name);
            } else if (type == this._prefBranch.PREF_BOOL) {
                this._ext.prefs[name] = this._prefBranch.getBoolPref(name);
            }
        }
    },


    getCharPref : function(branch) {
        return this._prefBranch.getCharPref(branch);
    },

    getBoolPref : function(branch) {
        return this._prefBranch.getBoolPref(branch);
    },

    getIntPref : function(branch) {
        return this._prefBranch.getIntPref(branch);
    },

    getExtensionFolder : function() {
        return Cc["@mozilla.org/extensions/manager;1"]
                .getService(Ci.nsIExtensionManager)
                    .getInstallLocation(this._ext.id)
                        .getItemLocation(this._ext.id);

    },

    getEnvVar : function(name) {
        return Cc["@mozilla.org/process/environment;1"]
                .getService(Ci.nsIEnvironment)
                    .get(name);

    },

    setEnvVar : function(name, value) {
        return Cc["@mozilla.org/process/environment;1"]
                .getService(Ci.nsIEnvironment)
                    .set(name, value);

    },

    msgBox : function(title, text) {
        Cc["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Ci.nsIPromptService)
                .alert(window, title, text);
    },

    //Converts a chrome path to a local file path. Note that the
    //file specified at the end of the chrome path does not have
    //to exist.
    chromeToPath : function(path) {
        var rv;
        var ios = Cc["@mozilla.org/network/io-service;1"].createInstance(Ci.nsIIOService);
        var uri = ios.newURI(path, 'UTF-8', null);
        var cr = Cc["@mozilla.org/chrome/chrome-registry;1"].createInstance(Ci.nsIChromeRegistry);
        return cr.convertChromeURL(uri);
        return decodeURI(rv.spec.substr("file:///".length).replace(/\//g, "\\"));
    },

    //Saves 'content' to file 'filepath'. Note that filepath needs to
    //be a real file path, not a chrome path.
    saveToFile : function(filepath, content) {
        var file = this.getFile(filepath);

        if (!file.exists()) {
            file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 420);
        }
        var outputStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);

        outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );
        var result = outputStream.write( content, content.length );
        outputStream.close();
    },

    startProcess: function(filename, args) {

        var file = this.getFile(filename);

        args = args ? args : [];

        if (file.exists()) {
            var nsIProcess = Cc["@mozilla.org/process/util;1"].getService(Ci.nsIProcess);
            nsIProcess.init(file);
            nsIProcess.run(false, args, args.length);
        } else {
            throw Error("File '%1' does not exist!"._(filename));
        }

   },

    //Simulates a double click on the file in question
    launchFile : function(filepath) {
        var f = this.getFile(filepath);
        f.launch();
    },


    //Gets a local file reference, return the interface nsILocalFile.
    getFile : function(filepath) {
        var f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        f.initWithPath(filepath);
        return f;
    },

    //Returns all elements that match the query sent in. The root used
    //in the query is the window.content.document, so this will only
    //work for html content.
    xpath : function(doc, query) {
        return doc.evaluate(query, doc, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    }



};

//************** Some prototype enhancements ************** //

if (!window.Cc) window.Cc = Components.classes;
if (!window.Ci) window.Ci = Components.interfaces;

//Returns true if the string contains the substring str.
String.prototype.contains = function (str) {
    return this.indexOf(str) != -1;
};

String.prototype.trim = function() {
    return this.replace(/^\s*|\s*$/gi, '');
};

String.prototype.startsWith = function(s) {
    return (this.length >= s.length && this.substr(0, s.length) == s);
};

String.prototype.endsWith = function(s) {
    return (this.length >= s.length && this.substr(this.length - s.length) == s);
};

//Inserts the arguments into the string. E.g. if
//the string is "Hello %1" then "Hello %1"._('johnny')
//would return "Hello johnny"
String.prototype._ = function() {
    s = this;
    for (var i = 0; i < arguments.length; i++) {
        var nr = "%" + (i+1);
        var repl;
        if (arguments[i] == null) {
            repl = "null";
        } else if (arguments[i] == undefined) {
            repl = "undefined";
        } else {
            repl = arguments[i];
        }
        s = s.replace(new RegExp(nr, "g"), repl);
    }
    return s;
};

function $(id) {
    return document.getElementById(id);
}