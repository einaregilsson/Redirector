function createImageLink(size, logoFontSize, logoX, logoY) {
    var colors = {'#333' : 'active', '#bbb' : 'disabled'};
    for (var color in colors) {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'Bold ' + logoFontSize + 'px Arial';
        ctx.fillText('☈', logoX, logoY);
        
        
        var a = document.createElement('a');
        var img = document.createElement('img');
        img.src = canvas.toDataURL();
        a.href = canvas.toDataURL();
        a.download = 'icon-' + colors[color] + '-' + size + '.png';
        a.appendChild(img);
        a.style.width = size + 'px'
        document.body.appendChild(a);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    createImageLink(16, 32, 0, 16);
    createImageLink(19, 35, 1, 18);
    createImageLink(32, 64, 1, 32);
    createImageLink(38, 75, 2, 38);
    createImageLink(48, 95, 1, 48);
    createImageLink(64, 125, 3, 63);
    createImageLink(128, 215, 12, 116);
});
