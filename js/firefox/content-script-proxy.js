// This file listens to messages 

window.addEventListener('message', function(message) {
	if (message.data.sender !== 'page') {
		return;
	}
	console.info('proxy got page message: ' + JSON.stringify(message.data));

	//Forward the message to the background script
	self.port.emit('message', message.data);
})

self.port.on('message', function(message) {
	console.info('proxy got chrome message: ' + JSON.stringify(message));
	window.postMessage(message, '*');
});