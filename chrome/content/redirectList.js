var RedirectList = {

    id          : "redirector@einaregilsson.com",
    name        : "Redirector",

    addItemsToListBox : function(items) {

        var list = $('lstRedirects');
        var item, row, value;

        for each (item in items) {
            row = document.createElement('listitem');

            this.createCell(row, item.exampleUrl);
            this.createCell(row, item.pattern);
            this.createCell(row, item.redirectUrl);
            this.createCell(row, item.onlyIfLinkExists);

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
            this.addItemsToListBox(Redirector.list);
        } catch(e) {
            alert(e);
        }
    }

};
