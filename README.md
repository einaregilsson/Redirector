## Download links
* [Firefox](https://addons.mozilla.org/firefox/addon/5064)
* [Google Chrome and Vivaldi](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd)
* [Opera](https://addons.opera.com/extensions/details/redirector-2/)

## Dark theme
If you are a Firefox user and use a dark theme, you can edit your userChrome.css file and add these lines to it for the extension button to more visible:

```css
/* Redirector button for dark Firefox themes */
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="active"]{filter:invert(100%) brightness(600%);}
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="disabled"]{filter:invert(100%) brightness(250%);}
```

If you don't know what the userChrome.css file is or how to edit it, please look it up on Firefox forums instead of asking about it on this repository.
