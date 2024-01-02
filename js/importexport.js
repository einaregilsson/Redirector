function showImportedMessage(imported, existing, exRuleDel) {
    let message = '';

    if (imported === 0 && existing === 0) {
        message = 'No redirects existed in the file.';
    } else if (imported > 0 && existing === 0) {
        message = `Successfully imported ${imported} redirect${imported > 1 ? 's' : '.'}`;
    } else if (imported === 0 && existing > 0) {
        message = 'All redirects in the file already existed and were ignored.';
    } else {
        message = `Successfully imported ${imported} redirect${imported > 1 ? 's' : ''}. `;
        message += existing === 1 ? '1 redirect already existed and was ignored.' : `${existing} redirects already existed and were ignored.`;
    }

    if (exRuleDel) {
        message += ' & removed the example rule.';
    }

    showMessage(message, true);
}

function importRedirects(ev) {
    const file = ev.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = JSON.parse(reader.result);

            if (!data.redirects) {
                showMessage('Invalid JSON, missing "redirects" property');
                return;
            }

            const { redirects } = data;
            let imported = 0;
            let existing = 0;

            redirects.forEach(redirectData => {
                const r = new Redirect(redirectData);
                r.updateExampleResult();

                if (REDIRECTS.some(existingRedirect => new Redirect(existingRedirect).equals(r))) {
                    existing++;
                } else {
                    REDIRECTS.push(r);
                    imported++;
                }
            });

            // If more than one rule was imported, remove the example rule
            let exRuleDel = false;
            if (imported > 1) {
                const exampleRuleIndex = REDIRECTS.findIndex(r => r.description === 'Example redirect, try going to https://example.com/anywordhere');
                if (exampleRuleIndex !== -1) {
                    REDIRECTS.splice(exampleRuleIndex, 1);
                    exRuleDel = true;
                }
            }

            showImportedMessage(imported, existing, exRuleDel);

            saveChanges();
            renderRedirects();
        } catch (error) {
            showMessage(`Failed to parse JSON data, invalid JSON: ${(error.message || '').substr(0, 100)}`);
        }
    };

    try {
        reader.readAsText(file, 'utf-8');
    } catch (error) {
        showMessage('Failed to read import file');
    }
}

function updateExportLink() {
    const redirects = REDIRECTS.map(r => new Redirect(r).toObject());
    const version = chrome.runtime.getManifest().version;

    const exportObj = {
        createdBy: `Redirector v${version}`,
        createdAt: new Date(),
        redirects: redirects
    };

    const json = JSON.stringify(exportObj, null, 4);

    el('#export-link').href = `data:text/plain;charset=utf-8,${encodeURIComponent(json)}`;
}

updateExportLink();

function setupImportExportEventListeners() {
    el("#import-file").addEventListener('change', importRedirects);
    el("#export-link").addEventListener('mousedown', updateExportLink);
}

setupImportExportEventListeners();