(function() {
	//Communication functions for

	var messageId = 1;
	var callbacks = {};
	function send(type, message, callback) {
		var id = messageId++;
		window.postMessage({sender:'page', url:location.href, messageId:id, messageType:type, payload:message}, '*');
		callbacks[id] = callback;
	}

	window.addEventListener('message', function(message) {
		if (message.data.sender == 'page') {
			return; //Ignore messages we sent ourselves
		}

		console.info('page got message: ' + JSON.stringify(message.data));
		
		var callback = callbacks[message.data.messageId];
		if (callback) {
			callback(message.data.payload);
			delete callbacks[message.data.messageId];
		}
	});

	var req = new XMLHttpRequest();
	req.overrideMimeType('application/json');
	req.open("GET", 'package.json', false);
	req.send();	
	var manifest = JSON.parse(req.responseText);

	window.chrome = {
		storage : {
			local : {
				get : function(query, callback) {
					send('storage.get', query, callback);
				},
				set : function(data, callback) {
					send('storage.set', data, callback);
				}
			}
		},

		extension : {
			getURL : function(file) {
				return document.location.protocol + '//' + document.location.host + '/' + file;
			}
		},

		tabs : {
			query : function(data, callback) {

			},

			update : function(tabId, options, callback) {

			}
		},

		runtime : { 
			getManifest : function() {
				return manifest;
			}
		}
	};

})();

