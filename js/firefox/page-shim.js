(function() {

	function log(msg) {
		self.port.emit('log', msg);
	}
	var parts = location.pathname.split('/');
	var urlName = parts[parts.length-1];

	var messageId = 1;
	var callbacks = {};
	function send(type, message, callback) {
		var id = messageId++;
		self.port.emit('message', {url:urlName, messageId:id, messageType:type, payload:message});
		callbacks[id] = callback || function(){};
	}


	self.port.on('message', function(message) {
		log('page got message: ' + JSON.stringify(message));
		
		var callback = callbacks[message.messageId];
		if (callback) {
			callback(message.payload);
			delete callbacks[message.messageId];
		}
	});

	var manifest = { version:'unknown' };
	send('manifest.get', {}, function(data) {
		manifest = data;
	})

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
				send('tabs.query', data, callback);
			},

			create : function(data, callback) {
				send('tabs.create', data, callback);
			},

			update : function(tabId, options, callback) {
				if (!options.active) {
					throw 'Unexpected update call';
				}

				options.tabId = tabId;

				send('tabs.update', options, callback);
			}
		},

		runtime : { 
			getManifest : function() {
				return manifest;
			}
		}
	};

})();


