## Download links
* [Firefox](https://addons.mozilla.org/firefox/addon/5064)
* [Google Chrome and Vivaldi](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd)
* [Opera](https://addons.opera.com/extensions/details/redirector-2/)

## Examples
### De-mobilizer
- Example URL: `https://en.m.wikipedia.org/`
- Include pattern: `^(http?s://)(.*\.)m(?:obile)?\.(.*)`
- Redirect to: `$1$2$3`
- Pattern type: Regular Expression
- Description: always show the desktop site of a webpage

### AMP redirect
- Example URL: `https://www.google.com/amp/www.example.com/amp/document`
- Include pattern: `^(?:http?s://)www.(?:google|bing).com/amp/(.*)`
- Redirect to: `https://$1`
- Pattern type: Regular Expression
- Description: AMP is bad: <https://80x24.net/post/the-problem-with-amp/>

### old reddit
- Example URL: `https://www.reddit.com/u/test`
- Include pattern: `^(?:http?s://)(?:www.)reddit.com(.*)`
- Redirect to: `https://old.reddit.com$1`
- Pattern type: Regular Expression

### doubleclick escaper
- Example URL: `https://ad.doubleclick.net/ddm/trackclk/N135005.2681608PRIVATENETWORK/B20244?https://www.example.com`
- Include pattern: `^(?:http?s://)ad.doubleclick.net/.*\?(http?s://.*)`
- Redirect to: `$1`
- Pattern type: Regular Expression
- Description: remove doubleclick link tracking / fix problems with doubleclick host based blocking

### Fun with !bangs
What are bangs?: <https://duckduckgo.com/bang>

#### use DuckDuckGo.com !bangs on Google
- Example URL: `https://www.google.com/search?&ei=-FvkXcOVMo6RRwW5p5DgBg&q=asdfasdf%21+sadfas&oq=%21asdfasdf+sadfas&gs_l=asdfsadfafsgaf`
- Include pattern: `^(?:http?s://)(?:www.)google\.(?:com|au|de|co\.uk)/search\?(?:.*)?(?:oq|q)=([^\&]*\+)?((?:%21|!)[^\&]*)`
- Redirect to: `https://duckduckgo.com/?q=$1$2`
- Pattern type: Regular Expression
- Description: redirect any querry to google with a !bang to DDG

### Custom DuckDuckGo.com !bangs

#### DDG !example Base
- Example URL: `https://duckduckgo.com/?q=!`__example__`&get=other`
- Include pattern: `^(?:http?s://)(?:.*\.)?duckduckgo.com/\?q=(?:%21|!)`__example__`(?=[^\+]|$)(?=\W|$)`
- Redirect to: `https://example.com/`
- Pattern type: Regular Expression
- Description: redirect to the base site when bang is the only search parameter

#### DDG !example Search
- Example URL: `https://duckduckgo.com/?q=searchterm+!`__example__`+searchterm2&get=other`
- Include pattern: `^(?:http?s://)(?:.*\.)?duckduckgo.com/\?q=(.*\+)?(?:(?:%21|!)`__example__`)(?:\+([^\&\?\#]*))?(?:\W|$)`
- Redirect to: `https://example.com/?query=$1$2`
- Pattern type: Regular Expression
- Description: redirect to custom site search

##### !ghh git-history
- Example URL: `https://duckduckgo.com/?q=!ghh+https%3A%2F%2Fgithub.com%2Fbabel%2Fbabel%2Fblob%2Fmaster%2Fpackages%2Fbabel-core%2FREADME.md&adfasfasd`
- Include pattern: `^(?:http?s://)duckduckgo.com/\?q=(?:(?:%21|!)ghh\+)(?:.*)(github|gitlab|bitbucket)(?:\.org|\.com)(.*?(?=\&))`
- Redirect to: `https://$1.githistory.xyz$2`
- Pattern type: Regular Expression
- Description: <https://githistory.xyz>
- __Advanced:__
    - Process matches: URL decode

## Dark theme
If you are a Firefox user and use a dark theme, you can edit your userChrome.css file and add these lines to it for the extension button to more visible:

```css
/* Redirector button for dark Firefox themes */
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="active"]{filter:invert(100%) brightness(600%);}
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="disabled"]{filter:invert(100%) brightness(250%);}
```

If you don't know what the userChrome.css file is or how to edit it, please look it up on Firefox forums instead of asking about it on this repository.
