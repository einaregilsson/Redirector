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
    closeImportPopup();
    showMessage(message, true);
}

function importRedirects(source) {
    // If the source is an Event, it's from file input
    if (source instanceof Event) {
        const file = source.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            processImportedData(e.target.result);
        };

        reader.onerror = function (error) {
            showMessage('Failed to read import file');
        };

        reader.readAsText(file, 'utf-8');
    }
    // If the source is a string, it's from a URL fetch
    else if (typeof source === 'string') {
        processImportedData(source);
    }
}

function processImportedData(data) {
    try {
        const jsonData = JSON.parse(data);

        if (!jsonData.redirects) {
            showMessage('Invalid JSON, missing "redirects" property');
            return;
        }

        const { redirects } = jsonData;
        let imported = 0;
        let existing = 0;
        let updated = 0;

        redirects.forEach(redirectData => {
            const importedRedirect = new Redirect(redirectData);
            importedRedirect.updateExampleResult();

            const existingRedirectIndex = REDIRECTS.findIndex(
                r => r.id === importedRedirect.id
            );

            if (importedRedirect.id = undefined) {
                importedRedirect.id = nanoid();
                //console.log("Assigned new ID:", importedRedirect.id);
                return importedRedirect.id;
            }

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
        updateExportLink();
    } catch (error) {
        showMessage(`Failed to parse JSON data, invalid JSON: ${(error.message || '').substr(0, 100)}`);
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

var blurWrapper = document.getElementById("blur-wrapper");

// Function to open the import popup
function showImportPopup() {
    document.getElementById('import-popup').style.display = 'block';
    document.getElementById('cover').style.display = 'block';
    blurWrapper.classList.add("blur");
  }

// Function to close the import popup
function closeImportPopup() {
    document.getElementById('import-popup').style.display = 'none';
    document.getElementById('cover').style.display = 'none';
    blurWrapper.classList.remove("blur");
}

// Setup event listeners for import functionality
function setupImportExportEventListeners() {

    document.querySelector('label[for="import-file"]').addEventListener('click', function(ev) {
        ev.preventDefault();
        showImportPopup();
    });

    const importFileInputPopup = document.getElementById("import-file-popup");
    importFileInputPopup.addEventListener('change', importRedirects);

    document.querySelector('label[for="import-file"]').addEventListener('click', function(ev) {
        ev.preventDefault();
        showImportPopup();
    });

    document.getElementById('import-url-button').addEventListener('click', function() {
        const url = document.getElementById('import-url-popup').value;
        fetchAndImportFromURL(url);
    });

    document.getElementById('import-file-popup-cb').addEventListener('click', function () {
        document.getElementById('import-file-popup').click();
    });

    document.getElementById('cancel-import').addEventListener('click', closeImportPopup);
}

function fetchAndImportFromURL(url) {
    if (url) {
        fetch(url)
        .then(response => {
            if (response.ok) {
                return response.text() || response.json();
            }
            throw new Error('Invalid response.');
        })
        .then(data => {
            importRedirects(data);
            //console.log("Redirects imported:", data);
        })
        .catch(error => {
            console.error('Problem fetching the URL:', error);
        });
    } else {
        alert("Please enter a URL.");
    }
}

setupImportExportEventListeners();