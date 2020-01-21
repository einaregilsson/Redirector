function dataBind(el, dataObject) {

	function boolValue(prop) {
		return prop.charAt(0) === '!' ? !dataObject[prop.substr(1)] : dataObject[prop];
	}

    if (typeof el === 'string') {
		el = document.querySelector(el)
	}
	for (let tag of el.querySelectorAll('[data-bind]')) {
			let prop = tag.getAttribute('data-bind');
		if (tag.tagName.toLowerCase() === 'input') {
			if (tag.getAttribute('type').toLowerCase() === 'radio') {
				tag.checked = dataObject[prop] === tag.getAttribute('value');
            } else if (tag.getAttribute('type').toLowerCase() === 'checkbox') {
                tag.checked = dataObject[prop];
            } else {
                tag.value = dataObject[prop];
			}
		} else if (tag.tagName.toLowerCase() === 'select') {
			for (let opt of tag.querySelectorAll('option')) {
				if (opt.getAttribute('value') === dataObject[prop]) {
					opt.setAttribute('selected', 'selected');
				} else {
					opt.removeAttribute('selected');
				}
			}
		} else if (Array.isArray(dataObject[prop])) {
			//Array of values, check any checkboxes in child elements
			for (let checkbox of tag.querySelectorAll('input[type="checkbox"')) {
				checkbox.checked = dataObject[prop].includes(checkbox.getAttribute('value'));
			}

		} else {
			tag.textContent = dataObject[prop];
		}
	}
	for (let tag of el.querySelectorAll('[data-show]')) {
		let shouldShow = boolValue(tag.getAttribute('data-show'));
		tag.style.display = shouldShow ? '' : 'none';
	}
	for (let tag of el.querySelectorAll('[data-disabled]')) {
		let isDisabled = boolValue(tag.getAttribute('data-disabled'));

		if (isDisabled) {
			tag.classList.add('disabled');
			tag.setAttribute('disabled', 'disabled');
		} else {
			tag.classList.remove('disabled');
			tag.removeAttribute('disabled');
		}
	}
	for (let tag of el.querySelectorAll('[data-class]')) {
		let [className, prop] = tag.getAttribute('data-class').split(':');
		let shouldHaveClass = boolValue(prop);
		if (shouldHaveClass) {
			tag.classList.add(className);
		} else {
			tag.classList.remove(className);
		}
	}
}

function show(id) {
	let el = document.querySelector(id);
	el.style.display = 'block';
}

function hide(id) {
	let el = document.querySelector(id);
	el.style.display = 'none';
}

function el(query) {
	return document.querySelector(query);
}

function showForm(selector, dataObject) {
	dataBind(selector, dataObject);
	el('#blur-wrapper').classList.add('blur');
	show('#cover');
	show(selector);
}

function move(arr, from, to) {
    arr.splice(to, 0, arr.splice(from, 1)[0]);
}

function hideForm(selector) {
	hide('#cover');
	hide(selector);
	el('#blur-wrapper').classList.remove('blur');
}

// Shows a message bar above the list of redirects.
function showMessage(message, success) {
	let messageBox = document.getElementById('message-box');
	dataBind('#message-box', {message});
	if (success) {
		messageBox.className = 'visible success';
	} else {
		messageBox.className = 'visible error';
	}

	let timer = 20;

	//Remove the message in 20 seconds if it hasn't been changed...
	setTimeout(function() {
		if (el('#message').textContent === message) {
			messageBox.className = ''; //Removing .visible removes the box...
		}
	}, timer * 1000);
}

function hideMessage() {
	el('#message-box').className = '';
}