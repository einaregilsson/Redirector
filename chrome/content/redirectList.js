var RedirectList = {

    id          : "redirector@einaregilsson.com",
    name        : "Redirector",
    lstRedirects: null,
    btnDelete   : null,
    btnEdit     : null,

    addItemsToListBox : function(items) {

        var list = $('lstRedirects');
        var item, row, value;

        for each (item in items) {
            row = document.createElement('listitem');

            this.createCell(row, item.pattern);
            this.createCell(row, item.exampleUrl);
            this.createCell(row, item.redirectUrl);
            this.createCell(row, item.onlyIfLinkExists);
            this.createCell(row, item.patternType);

            row.item = item;

            list.appendChild(row);
        }
    },

    createCell : function(row, value) {
        var cell = document.createElement('listcell');
        cell.setAttribute('label', value);
        cell.setAttribute('value', value);
        row.appendChild(cell);
    },


    onLoad : function() {
        try {
            RedirLib.initialize(this);
            Redirector.init();
            this.lstRedirects = $('lstRedirects');
            this.btnDelete = $('btnDelete');
            this.btnEdit = $('btnEdit');
            this.addItemsToListBox(Redirector.list);
        } catch(e) {
            alert(e);
        }
    },

    close : function() {
        window.close();
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
            var map = [item.pattern, item.exampleUrl, item.redirectUrl, item.onlyIfLinkExists, item.patternType];

            for (var i in map) {
                listItem.childNodes[i].setAttribute('value', map[i]);
                listItem.childNodes[i].setAttribute('label', map[i]);
            }

            Redirector.save();
        }

    },

    deleteRedirect : function() {
        var index = this.lstRedirects.selectedIndex;

        if (index == -1) {
            return;
        }

        try {
        this.lstRedirects.removeItemAt(index);
        Redirector.deleteAt(index);
        } catch(e) {alert(e);}
    },

    selectionChange : function() {
        var index = this.lstRedirects.selectedIndex;

        this.btnEdit.disabled = (index == -1);
        this.btnDelete.disabled = (index == -1);
    }

};
