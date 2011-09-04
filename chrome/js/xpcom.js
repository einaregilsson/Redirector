
Ci = Components.interfaces;
Cc = Components.classes;
Cr = Components.results;

const ServerSocket = Components.Constructor("@mozilla.org/network/server-socket;1", "nsIServerSocket", "init");
const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init");
const FileInputStream = Components.Constructor("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream", "init");
const ConverterInputStream = Components.Constructor("@mozilla.org/intl/converter-input-stream;1", "nsIConverterInputStream", "init");
const LocalFile = Components.Constructor("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");
const FilePicker = Components.Constructor("@mozilla.org/filepicker;1", "nsIFilePicker", "init");
const FilePickerMode = { save : Ci.nsIFilePicker.modeSave, open : Ci.nsIFilePicker.modeOpen };

function Service(className, interfaceName) {
	return Cc[className].getService(Ci[interfaceName]);
}

const PromptService = Service("@mozilla.org/embedcomp/prompt-service;1","nsIPromptService");
const IOService = Service("@mozilla.org/network/io-service;1","nsIIOService");
const LocaleService = Service("@mozilla.org/intl/nslocaleservice;1", "nsILocaleService");
const StringBundleService = Service("@mozilla.org/intl/stringbundle;1", "nsIStringBundleService");
		
var EXPORTED_SYMBOLS = [];
for (var name in this) {
	if (name != 'Service' && name != 'QueryInterface' && name != 'name' && name != 'EXPORTED_SYMBOLS') {
		EXPORTED_SYMBOLS.push(name);
	}
}
