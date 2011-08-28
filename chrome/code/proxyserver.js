Components.utils.import("chrome://redirector/content/code/xpcom.js");

var EXPORTED_SYMBOLS = ['RedirectorProxy'];

var RedirectorProxy = {
	
	start : function(port, getUrl) {
		dump('Opening Proxy Server Socket on port ' + port);
		this.getUrl = getUrl;
		this.serverSocket = new ServerSocket(port, true, -1);
		this.serverSocket.asyncListen(this);
	},

	onSocketAccepted: function(serverSocket, clientSocket) {
		dump("Accepted connection on "+clientSocket.host+":"+clientSocket.port);
		var requestStream = clientSocket.openInputStream(0, 0, 0).QueryInterface(Ci.nsIAsyncInputStream);
		var responseStream = clientSocket.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
		var tm = Cc["@mozilla.org/thread-manager;1"].getService();
		requestStream.asyncWait({
			onInputStreamReady : function(inputStream) {
				RedirectorProxy.processRequest(clientSocket, inputStream, responseStream);
			}
		},0,0,tm.mainThread);
    },
	
    processRequest : function(clientSocket, inputStream, responseStream) {
		var requestStream = new ScriptableInputStream(inputStream);
        requestStream.available();
        var request = '';
        while (requestStream.available()) {
          request = request + requestStream.read(2048);
        }
		var parts = request.split(' ');
		dump('\n\n\n'  + request + '\n\n\n');
		dump("\n" + parts[0] + " request for " + parts[1]);
		var redirectUrl = 'http://einaregilsson.com';//Redirector.getRedirectUrl(parts[1]);
		var outp = 'HTTP/1.1 302 Moved Temporarily';
		outp += '\r\nContent-Length: <cl>';
		outp += '\r\nLocation: ' + redirectUrl;
		outp += '\r\nX-Redirected-By: Redirector Firefox Extension'
		outp += '\r\n\r\n';
		var cl = outp.length -4;
		if (cl < 100) {
			cl+=2;
		} else if (cl < 1000) {
			cl += 3;
		} else if (cl < 10000) {
			cl += 4;
		} else if (cl < 100000) {
			cl += 5;
		}
		outp = outp.replace('<cl>', cl);
		dump(outp);
		responseStream.write(outp, outp.length);
		responseStream.close();
		inputStream.close();
    }
}