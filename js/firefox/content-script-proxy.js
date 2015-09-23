// This file listens to messages 

function log(msg) {
	self.port.emit('log', msg);
}

function receiveWindowMessage(message) {
	if (message.data.sender !== 'page') {
		return;
	}

	if (message.data.logMessage) {
		//Special handling for log messages.
		log(message.data.logMessage);
		return;
	}

	log('proxy got page message: ' + JSON.stringify(message.data));

	//Forward the message to the background script
	self.port.emit('message', message.data);
}

window.addEventListener('message', receiveWindowMessage);

function receiveMessage(message) {
	log('proxy got chrome message: ' + JSON.stringify(message));
	window.postMessage(message, '*');
}
self.port.on('message', receiveMessage);

function cleanup() {
	window.removeEventListener('message', receiveWindowMessage);
	self.port.removeListener('message', receiveMessage);
	self.port.removeListener('detach', cleanup);
}

self.port.on('detach', cleanup);
