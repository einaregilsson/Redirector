
function displayOrganizeModeMessage() {
    if(el('#message-box').classList.contains('visible')) {
        hideMessage();
    } else {
        showMessage("Use ⟱ to move a redirect to the bottom, ⟰ to move to the top, and use the checkboxes to select multiple redirects.", true)
    }
}

function organizeModeToggle(ev) {
    ev.preventDefault();
    let organizeModes = ['.groupings', '.arrows']
    for (let mode of organizeModes) {
        let organizeModeElms = document.querySelectorAll(mode);
        for (i = 0; i < organizeModeElms.length; ++i) {
            let elm = organizeModeElms[i];
            let isHidden = '';
            if(mode === '.arrows') {
                // targeting parent span for arrows
                elm = elm.parentElement;
            }
            isHidden = elm.classList.contains('hidden');
            isHidden ? elm.classList.remove('hidden') : elm.classList.add('hidden');
        }
    }

    let buttonClasses = el('#organize-mode').classList;
    !buttonClasses.contains('active') ? el('#organize-mode').classList.add('active') : el('#organize-mode').classList.remove('active');

    displayOrganizeModeMessage();
}


function setupOrganizeModeToggleEventListener() {
    el('#organize-mode').addEventListener('click', organizeModeToggle);
}

setupOrganizeModeToggleEventListener();