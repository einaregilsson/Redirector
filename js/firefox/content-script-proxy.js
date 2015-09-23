// This file listens to messages 

function log(msg) {
	self.port.emit('log', msg);
}
window.addEventListener('message', function(message) {
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
})

self.port.on('message', function(message) {
	log('proxy got chrome message: ' + JSON.stringify(message));
	window.postMessage(message, '*');
});