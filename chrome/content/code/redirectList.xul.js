//// document.getElementByIdId: redirectList.xul.js 249 2009-09-15 21:41:06Z einar@einaregilsson.com document.getElementById 

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
const Cc = Components.classes;
const Ci = Components.interfaces;

var RedirectList = {

    lstRedirects: null,
    btnDelete   : null,
    btnEdit     : null,

    addItemsToListBox : function(items) {

	    var item, row, value, newItem;
        
        for each (item in items) {
            newItem = this.template.cloneNode(true);

            newItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.includePattern);
            newItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
            newItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
            var checkEnabled = newItem.getElementsByAttribute('name', 'chkEnabled')[0];
            checkEnabled.setAttribute('checked', !item.disabled);
            newItem.item = item;
            this.lstRedirects.appendChild(newItem);
            newItem.setAttribute('selected', false);
        }
        
        //Enable, disable functionality
        this.lstRedirects.addEventListener('click', function(ev) { 
	        if (ev.originalTarget && ev.originalTarget.tagName == 'checkbox') {
		        var parent = ev.originalTarget.parentNode;
		        while (!parent.item) {
			     	parent = parent.parentNode;   
		        }
		        parent.item.disabled = !ev.originalTarget.hasAttribute('checked');
		        Redirector.save();
	        }
        },false);
    },

    onLoad : function() {
        try {
            this.lstRedirects = document.getElementById('lstRedirects');
            this.lstRedirects.selType = 'single'; 
            this.template = document.getElementsByTagName('richlistitem')[0];
            this.lstRedirects.removeChild(this.template);
            this.btnDelete = document.getElementById('btnDelete');
            this.btnEdit = document.getElementById('btnEdit');
            this.addItemsToListBox(Redirector.list);
	        this.strings = document.getElementById('redirector-strings');
        } catch(e) {
            alert(e);
        }
    },

    openHelp : function() {
        var windowName = 'redirectorHelp';
        var windowsMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win;
        var iter = windowsMediator.getEnumerator(null);
        while (iter.hasMoreElements()) {
            win = iter.getNext();
            if (win.name == windowName) {
                win.focus();
                return;
            }
        }
        window.openDialog("chrome://redirector/content/ui/help.html", windowName, "chrome,dialog,resizable=yes,location=0,toolbar=0,status=0,width=800px,height=600px,centerscreen", this);
    },
    
    close : function() {
        window.close();
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
        var first = Redirector.list[firstIndex];
        var second = Redirector.list[firstIndex+1];
        Redirector.list[firstIndex] = second;
        Redirector.list[firstIndex+1] = first;
        this.setListItemValues(this.lstRedirects.children[firstIndex+1], first);
        this.setListItemValues(this.lstRedirects.children[firstIndex], second);
        this.lstRedirects.selectedIndex -= 1;
        Redirector.save();
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
        var index = this.lstRedirects.selectedIndex;

        this.btnEdit.disabled = (index == -1);
        this.btnDelete.disabled = (index == -1);
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
