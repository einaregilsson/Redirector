function showImportedMessage(imported, existing, updated, exRuleDel) {
    let message = '';

    if (imported === 0 && existing === 0 && updated === 0) {
        message = 'No redirects existed in the file.';
    } else {
        if (imported > 0) {
            message += `Successfully imported ${imported} redirect${imported > 1 ? 's' : ''}. `;
        }

        if (existing > 0) {
            message += `${existing} redirect${existing > 1 ? 's' : ''} already existed and were ignored. `;
        }

        if (updated > 0) {
            message += `${updated} redirect${updated > 1 ? 's were' : ' was'} updated. `;
        }
    }

    if (exRuleDel) {
        message += ' Removed the example rule.';
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
            let updated = 0;

            redirects.forEach(redirectData => {
                const importedRedirect = new Redirect(redirectData);
                importedRedirect.updateExampleResult();

                const existingRedirectIndex = REDIRECTS.findIndex(
                    r => r.description === importedRedirect.description
                );

                if (existingRedirectIndex !== -1) {
                    // Check if the imported redirect is different
                    if (!new Redirect(REDIRECTS[existingRedirectIndex]).equals(importedRedirect)) {
                        // Update existing redirect
                        REDIRECTS[existingRedirectIndex] = importedRedirect;
                        updated++;
                    } else {
                        // If not different, consider it as existing
                        existing++;
                    }
                } else {
                    // Add new redirect
                    REDIRECTS.push(importedRedirect);
                    imported++;
                }
            });

            // If more than one rule was imported, remove the example rule
            let exRuleDel = false;
            if (imported > 1) {
                const exampleRuleIndex = REDIRECTS.findIndex(
                    r => r.description === 'Example redirect, try going to https://example.com/anywordhere'
                );
                if (exampleRuleIndex !== -1) {
                    REDIRECTS.splice(exampleRuleIndex, 1);
                    exRuleDel = true;
                }
            }

            showImportedMessage(imported, existing, updated, exRuleDel);

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

// Need to remove EventListener to allow using the import button more than once without reloading the page
function setupImportExportEventListeners() {
    const importFileInput = el("#import-file");
    const exportLink = el("#export-link");

    importFileInput.removeEventListener('change', importRedirects);
    importFileInput.addEventListener('change', importRedirects);

    exportLink.removeEventListener('mousedown', updateExportLink);
    exportLink.addEventListener('mousedown', updateExportLink);
}

setupImportExportEventListeners();