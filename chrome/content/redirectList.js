var RedirectList = {


    addItemsToListBox : function(items) {

        var list = document.getElementById('foo');
        var item, row, value;

        for each (item in items) {

            row = document.createElement('listitem');

            for each (value in item) {
                cell = document.createElement('listcell');
                cell.setAttribute('label',value);
                cell.setAttribute('value',value);
                row.appendChild(cell);
            }

            list.appendChild(row);
        }
    },



    onLoad : function() {
        addItemsToList(items);
    }

};
