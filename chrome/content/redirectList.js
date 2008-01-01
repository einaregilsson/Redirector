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
        }
        if (list.children.length > 0) {
            list.selectedIndex = 0;
        }
        list.clearSelection();
    },

    onLoad : function() {
        try {
            RedirLib.initialize(this);
            Redirector.init();
        
            this.lstRedirects = $('lstRedirects');
            this.template = document.getElementsByTagName('richlistitem')[0];
            this.lstRedirects.removeChild(this.template);
            this.btnDelete = $('btnDelete');
            this.btnEdit = $('btnEdit');
            this.addItemsToListBox(Redirector.list);
            this.lstRedirects.selectedIndex = -1;
        } catch(e) {
            alert(e);
        }
    },

    close : function() {
        window.close();
    },

    addRedirect : function() {

        var item = { pattern : '', exampleUrl : '', redirectUrl : '', onlyIfLinkExists : false, patternType : 'W'};

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
            listItem.getElementsByAttribute('name', 'dscrIncludePattern')[0].setAttribute('value', item.pattern);
            listItem.getElementsByAttribute('name', 'dscrExcludePattern')[0].setAttribute('value', item.excludePattern);
            listItem.getElementsByAttribute('name', 'dscrRedirectTo')[0].setAttribute('value', item.redirectUrl);
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
        var index = this.lstRedirects.selectedIndex;

        this.btnEdit.disabled = (index == -1);
        this.btnDelete.disabled = (index == -1);
    }

};

window.addEventListener('unload', function() {
    Redirector.unload();
}, false);