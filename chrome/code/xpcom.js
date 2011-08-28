
var EXPORTED_SYMBOLS = [
'Ci', 'Cc', 'Cr', 'ServerSocket', 'ScriptableInputStream', 'FileInputStream', 'ConverterInputStream', 'LocalFile'];

Ci = Components.interfaces;
Cc = Components.classes;
Cr = Components.results;

const ServerSocket = Components.Constructor("@mozilla.org/network/server-socket;1", "nsIServerSocket", "init");
const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init");
const FileInputStream = Components.Constructor("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream", "init");
const ConverterInputStream = Components.Constructor("@mozilla.org/intl/converter-input-stream;1", "nsIConverterInputStream", "init");
const LocalFile = Components.Constructor("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");
