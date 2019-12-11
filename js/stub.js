
//Dummy file to use while developing the UI. This way we can just develop it on a local fileserver, and don't have to reload
//an extension for every tiny change!

if (!chrome || !chrome.storage || !chrome.storage.local) {

     let testData = {
        "createdBy": "Redirector v3.2",
        "createdAt": "2019-12-09T12:54:13.391Z",
        "redirects": [
            {
                "description": "Mbl test",
                "exampleUrl": "https://mbl.is",
                "exampleResult": "http://foo.is",
                "error": null,
                "includePattern": "*mbl*",
                "excludePattern": "",
                "patternDesc": "My description",
                "redirectUrl": "http://foo.is",
                "patternType": "R",
                "processMatches": "noProcessing",
                "disabled": false,
                "appliesTo": [
                    "main_frame",
                    "script"
                ]
            },
            {
                "description": "Msdfsdfbl test",
                "exampleUrl": "https://mbssfdsl.is",
                "exampleResult": "http://foo.is",
                "error": null,
                "includePattern": "*mbl*",
                "excludePattern": "",
                "patternDesc": "My description",
                "redirectUrl": "http://foo.is",
                "patternType": "W",
                "processMatches": "urlEncode",
                "disabled": false,
                "appliesTo": [
                    "main_frame",
                    "sub_frame"
                ]
            },            {
                "description": "https://foo.is?s=joh",
                "exampleUrl": "https://foo.is?s=joh",
                "exampleResult": "https://foo.is",
                "error": null,
                "includePattern": "(.*)(\\?s=)(.*)",
                "excludePattern": "",
                "patternDesc": "Test error",
                "redirectUrl": "$1",
                "patternType": "R",
                "processMatches": "noProcessing",
                "disabled": false,
                "appliesTo": [
                    "main_frame"
                ]
            }
        ]
    };

    localStorage.redirector = JSON.stringify(testData);


    //Make dummy for testing...
    window.chrome = window.chrome || {};
    chrome.storage = {
        local : {
            get : function(defaults, callback) {
                let data = JSON.parse(localStorage.redirector || '{}');
                
                let result = {};
                for (let key in defaults) {
                    if (typeof data[key] !== 'undefined') {
                        result[key] = data[key];
                    } else {
                        result[key] = defaults[key];
                    }
                }
                callback(result);
            },

            set : function(obj) {
                let data = JSON.parse(localStorage.redirector || '{}');
                
                for (let k in obj) {
                    data[k] = obj[k];
                }
                localStorage.redirector = JSON.stringify(data);
            }
        }
    };

    chrome.runtime = {
        sendMessage : function(params, callback) {
            let data = JSON.parse(localStorage.redirector || '{}');
            if (params.type === 'get-redirects') {
                chrome.storage.local.get({redirects:[]}, callback);
            } else if (params.type === 'toggle-sync') {
                if (params.isSyncEnabled) {
                    callback({message:'sync-enabled'});
                } else {
                    callback({message:'sync-disabled'});
                }
            }
        },
        getManifest : function() {
            return { version: '0-dev' };
        }
    };
}