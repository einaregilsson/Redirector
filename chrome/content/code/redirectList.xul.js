//// document.getElementByIdId: redirectList.xul.js 249 2009-09-15 21:41:06Z einar@einaregilsson.com document.getElementById 

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
const Cc = Components.classes;
const Ci = Components.interfaces;

var RedirectList = {

    lstRedirects: null,
    btnDelete   : null,
    btnEdit     : null,
    btnUp		: null,
    btnDown		: null,

    onLoad : function() {
        try {
            this.lstRedirects = document.getElementById('lstRedirects');
            this.lstRedirects.selType = 'single'; 
            this.template = document.getElementsByTagName('richlistitem')[0];
            this.lstRedirects.removeChild(this.template);
            this.btnDelete = document.getElementById('btnDelete');
            this.btnEdit = document.getElementById('btnEdit');
            this.btnUp = document.getElementById('btnUp');
            this.btnDown = document.getElementById('btnDown');
            this.addItemsToListBox(Redirector.list);
	        this.strings = document.getElementById('redirector-strings');
        } catch(e) {
            alert(e);
        }
    },

    addItemsToListBox : function(items) {

	    var item, row, value, newItem;
        
        for each (item in items) {
            newItem = this.template.cloneNode(true);

            newItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.includePattern);
            newItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
            newItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
            var checkEnabled = newItem.getElementsByAttribute('name', 'chkEnabled')[0];
            checkEnabled.setAttribute('checked', !item.disabled);
            newItem.setAttribute('class', item.disabled ? 'disabledRedirect' : '');
            newItem.item = item;
            this.lstRedirects.appendChild(newItem);
            newItem.setAttribute('selected', false)
        }
        
        //Enable, disable functionality
        this.lstRedirects.addEventListener('click', function(ev) { 
	        if (ev.originalTarget && ev.originalTarget.tagName == 'checkbox') {
		        var parent = ev.originalTarget.parentNode;
		        while (!parent.item) {
			     	parent = parent.parentNode;   
		        }
		        parent.item.disabled = !ev.originalTarget.hasAttribute('checked');
	            parent.setAttribute('class', parent.item.disabled ? 'disabledRedirect' : '');
		        Redirector.save();
	        }
        },false);
    },
    
    moveUp : function(){
        if (this.lstRedirects.selectedIndex <= 0) {
            return;
        }
        this.switchItems(this.lstRedirects.selectedIndex-1);
    },

    moveDown : function() {
        if (this.lstRedirects.selectedIndex == Redirector.list.length-1) {
            return;
        }
        this.switchItems(this.lstRedirects.selectedIndex);
    },

    switchItems : function(firstIndex) {
        var firstRedirect = Redirector.list[firstIndex];
        var secondRedirect = Redirector.list[firstIndex+1];
        Redirector.list[firstIndex] = secondRedirect;
        Redirector.list[firstIndex+1] = firstRedirect;
        var firstItem = this.lstRedirects.children[firstIndex];
        var secondItem = this.lstRedirects.children[firstIndex+1];
        this.lstRedirects.removeChild(secondItem);
        this.lstRedirects.insertBefore(secondItem, firstItem);
        Redirector.save();
        this.selectionChange();
    }, 
    
    setListItemValues : function(listItem, item){
        listItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.includePattern);
        listItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
        listItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
    },
    
    addRedirect : function() {
		var args = { saved : false, redirect : new Redirect() };
        window.openDialog("chrome://redirector/content/ui/editRedirect.xul", "redirect", "chrome,dialog,modal,centerscreen", args);
        if (args.saved) {
            this.addItemsToListBox([args.redirect]);
            Redirector.addRedirect(args.redirect);
        }
    },

    editRedirect : function() {

		if (this.lstRedirects.selectedIndex == -1) {
			return;
		}
		//.selectedItem is still there after it has been removed, that's why we have the .selectedIndex check above as well
        var listItem = this.lstRedirects.selectedItem;
        if (!listItem) {
            return;
        }
        var redirect = listItem.item;
		var args = { saved: false, "redirect":redirect.clone()};
        window.openDialog("chrome://redirector/content/ui/editRedirect.xul", "redirect", "chrome,dialog,modal,centerscreen", args);

        if (args.saved) {
	        redirect.copyValues(args.redirect);
            this.setListItemValues(listItem, redirect);
            Redirector.save();
        }
    },
    
    buttonKeyPress : function(event) {
		if (event.keyCode == 13 && !event.originalTarget.disabled) {
			event.originalTarget.click();  
		}
    },

    deleteRedirect : function() {
        var index = this.lstRedirects.selectedIndex;

        if (index == -1) {
            return;
        }
        
        var text = this.strings.getString("deleteConfirmationText");
        var title = this.strings.getString("deleteConfirmationTitle");
        var reallyDelete = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).confirm(null, title, text);
		if (!reallyDelete) {
			return;
		}		
		
        try {
            this.lstRedirects.removeChild(this.lstRedirects.children[index]);
            Redirector.deleteAt(index);
            this.selectionChange();
        } catch(e) {
            alert(e);
        }
    },

    selectionChange : function() {
	    if (!this.lstRedirects) {
		    return;
		}
        var index = this.lstRedirects.selectedIndex;

        this.btnEdit.disabled = (index == -1);
        this.btnDelete.disabled = (index == -1);
        this.btnUp.disabled = (index <= 0);
        this.btnDown.disabled = (index == -1 || index >= Redirector.list.length-1);
    },
    
    redirectListKeyDown : function(event) {
	    if (event.keyCode == 46) { //Del key
	    	this.deleteRedirect();
    	} else if (event.keyCode == 13) { //Enter key
	    	this.editRedirect();
		}
    },
    
    importExport : function(mode, captionKey, func) {
		//Mostly borrowed from Adblock Plus
		var picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		picker.init(window, Redirector.getString(captionKey), mode);
		picker.defaultExtension = ".rdx";
		var dir = Redirector.getDefaultDir();
		if (dir) {
		    picker.displayDirectory = dir;
		}
		picker.appendFilter(Redirector.getString('redirectorFiles'), '*.rdx');
		
		if (picker.show() == picker.returnCancel) {
		    return;
		}
		try {
		    func(picker.file);
		} catch (e) {
		    alert(e);
		}
    },
    
    export : function() {
		this.importExport(Ci.nsIFilePicker.modeSave, 'exportCaption', function(file) {
			Redirector.exportRedirects(file);
		});
    },
    
    import : function() {
		this.importExport(Ci.nsIFilePicker.modeOpen, 'importCaption', function(file) {
			Redirector.importRedirects(file);
		});
    }
};
