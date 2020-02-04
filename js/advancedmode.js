
function advancedModeToggle(ev) {
    ev.preventDefault();
    let advancedModes = ['.groupings', '.arrows']
    for (let mode of advancedModes) {
        let advancedModeElement = el(mode);
        let isElementHidden = advancedModeElement.classList.contains('hidden');
        isElementHidden ? advancedModeElement.classList.remove('hidden') : advancedModeElement.classList.add('hidden');
    }

    let buttonText = el('#advanced-mode').textContent;
    buttonText.contains('Show') ? el('#advanced-mode').textContent = 'Hide Advanced Mode' : el('#advanced-mode').textContent = 'Show Advanced Mode';
}


function setupAdvancedModeEventListener() {
    el('#advanced-mode').addEventListener('click', advancedModeToggle);
}

setupAdvancedModeEventListener();