//// $Id$ 

var Redirector = Components.classes["@einaregilsson.com/redirector;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
const Cc = Components.classes;
const Ci = Components.interfaces;

function $(id) {
    return document.getElementById(id);
}

var RedirectList = {

    id          : "redirector@einaregilsson.com",
    name        : "Redirector",
    lstRedirects: null,
    btnDelete   : null,
    btnEdit     : null,

    addItemsToListBox : function(items) {

        var list = $('lstRedirects');
        var item, row, value, newItem;
        
        for each (item in items) {
            newItem = this.template.cloneNode(true);

            newItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.pattern);
            newItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
            newItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
            newItem.item = item;
            list.appendChild(newItem);
            newItem.setAttribute("selected", false);
        }
        
    },

    onLoad : function() {
        try {
            this.lstRedirects = $('lstRedirects');
            this.lstRedirects.selType = 'single'; 
            this.template = document.getElementsByTagName('richlistitem')[0];
            this.lstRedirects.removeChild(this.template);
            this.btnDelete = $('btnDelete');
            this.btnEdit = $('btnEdit');
            this.addItemsToListBox(Redirector.list);
        } catch(e) {
            alert(e);
        }
    },

    openHelp : function() {
        var windowName = "redirectorHelp";
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
        window.openDialog("chrome://redirector/content/help.html", windowName, "chrome,dialog,resizable=yes,location=0,toolbar=0,status=0,width=800px,height=600px,centerscreen", this);
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
        listItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.pattern);
        listItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
        listItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
    },
    
    addRedirect : function() {

        var item = { pattern : '', exampleUrl : '', redirectUrl : '', patternType : 'W'};

        window.openDialog("chrome://redirector/content/redirect.xul",
                    "redirect",
                    "chrome,dialog,modal,centerscreen", item);

        if (item.saved) {
            this.addItemsToListBox([item]);
            Redirector.addRedirect(item);
        }

    },

    editRedirect : function() {

        var listItem = this.lstRedirects.selectedItem;

        if (!listItem) {
            return;
        }

        var item = listItem.item;

        window.openDialog("chrome://redirector/content/redirect.xul",
                    "redirect",
                    "chrome,dialog,modal,centerscreen", item);

        if (item.saved) {
            this.setListItemValues(listItem, item);
            Redirector.save();
        }
    },

    deleteRedirect : function() {
        var index = this.lstRedirects.selectedIndex;

        if (index == -1) {
            return;
        }

        try {
            this.lstRedirects.removeChild(this.lstRedirects.children[index]);
            Redirector.deleteAt(index);
        } catch(e) {
            alert(e);
        }
    },

    selectionChange : function() {
        var index = $('lstRedirects').selectedIndex;

        $('btnEdit').disabled = (index == -1);
        $('btnDelete').disabled = (index == -1);
    }

};
