

var RedirectorCommon = {

    wildcardMatch : function(pattern, text) {
        var parts
          , part
          , i
          , pos;

        parts = pattern.split('*');

        for (i in parts) {

            part = parts[i];

            pos = text.indexOf(part);

            if (pos == -1) {
                return false;
            }

            if (i == 0 && pos != 0) {
                return false;
            }

            if (i == parts.length -1 && i != "" && text.substr(text.length - part.length) != part) {
                return false;

            }

            text = text.substr(pos + part.length);
        }

        return true;
    }
};