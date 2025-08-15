## Description
Web browser extension (Firefox, Vivaldi, Chrome, Opera, Edge) to redirect URLs based on regex or wildcard patterns.

## Tribute
In loving memory of Einar Egilsson, who gave us Redirector and selflessly nurtured it for many years. We miss you Einar, and will always remember your kindness and generosity.

## Download Links
* [Firefox](https://addons.mozilla.org/firefox/addon/redirector/)
* [Google Chrome and Vivaldi](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd)
<!--
Opera extension is no longer present (as of 2023/01/16)
* [Opera](https://addons.opera.com/extensions/details/redirector-2/)
-->

## Examples

### De-mobilizer (Wildcard Pattern)
- Example URL: `https://en.m.wikipedia.org/wiki/Example`
- Include pattern: `https://*.m.wikipedia.org/*`
- Redirect to: `https://$1.wikipedia.org/$2`
- Pattern type: Wildcard
- Description: Redirect mobile Wikipedia to desktop version
- Applies to: main_frame, sub_frame

### De-mobilizer (Regex Pattern)
- Example URL: `https://m.reddit.com/r/programming`
- Include pattern: `^https://m\.([^/]+)(.*)$`
- Redirect to: `https://www.$1$2`
- Pattern type: Regular Expression
- Description: Convert m.domain.com to www.domain.com
- Applies to: main_frame

### Google AMP Bypass
- Example URL: `https://www.google.com/amp/s/example.com/article`
- Include pattern: `^https://www\.google\.[^/]+/amp/s/(.*)$`
- Redirect to: `https://$1`
- Pattern type: Regular Expression
- Description: Redirect Google AMP pages to original URLs
- Applies to: main_frame

### YouTube Shorts to Regular Video
- Example URL: `https://www.youtube.com/shorts/dQw4w9WgXcQ`
- Include pattern: `^https://(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]+)(?:\?.*)?$`
- Redirect to: `https://www.youtube.com/watch?v=$1`
- Pattern type: Regular Expression
- Description: Convert YouTube Shorts to regular video player
- Applies to: main_frame

### Reddit Old Interface
- Example URL: `https://www.reddit.com/r/programming`
- Include pattern: `^https://(?:www\.)?reddit\.com/(.*)$`
- Exclude pattern: `^https://old\.reddit\.com/.*$`
- Redirect to: `https://old.reddit.com/$1`
- Pattern type: Regular Expression
- Description: Always use old Reddit interface
- Applies to: main_frame

### Twitter to Nitter (Privacy Frontend)
- Example URL: `https://twitter.com/user/status/123456789`
- Include pattern: `^https://(?:www\.)?(?:twitter|x)\.com/(.*)$`
- Redirect to: `https://nitter.net/$1`
- Pattern type: Regular Expression
- Description: Redirect Twitter/X to Nitter privacy frontend
- Applies to: main_frame

### Development: CDN to Localhost
- Example URL: `https://cdn.example.com/assets/main.js`
- Include pattern: `^https://cdn\.example\.com/(.*)$`
- Redirect to: `https://localhost:3000/$1`
- Pattern type: Regular Expression
- Description: Redirect CDN assets to local development server
- Applies to: script, stylesheet, image, font

### Development: API Staging to Local
- Example URL: `https://api-staging.example.com/v1/users`
- Include pattern: `^https://api-staging\.example\.com/(.*)$`
- Redirect to: `https://localhost:8080/$1`
- Pattern type: Regular Expression
- Description: Redirect staging API calls to local development
- Applies to: xmlhttprequest

### GitHub: Blob to Raw File URLs
- Example URL: `https://github.com/user/repo/blob/main/file.txt`
- Include pattern: `^https://github\.com/([^/]+)/([^/]+)/blob/(.+)$`
- Redirect to: `https://raw.githubusercontent.com/$1/$2/$3`
- Pattern type: Regular Expression
- Description: Convert GitHub blob URLs to raw file URLs
- Applies to: main_frame

## Fun with !bangs

What are bangs?: <https://duckduckgo.com/bangs>

### Google to DuckDuckGo (Simplified)
- Example URL: `https://www.google.com/search?q=%21reddit+programming`
- Include pattern: `^https://www\.google\.com/search\?.*q=(.*)$`
- Redirect to: `https://duckduckgo.com/?q=$1`
- Pattern type: Regular Expression
- Description: Redirect Google searches to DuckDuckGo (simplified)
- Applies to: main_frame

### Custom Bang Shortcuts

#### !reddit Custom Bang
- Example URL: `https://duckduckgo.com/?q=!reddit+programming`
- Include pattern: `^https://duckduckgo\.com/\?q=%21reddit\+(.*)$`
- Redirect to: `https://www.reddit.com/search/?q=$1`
- Pattern type: Regular Expression
- Description: Custom !reddit bang for direct Reddit search
- Applies to: main_frame

#### !gh GitHub Search
- Example URL: `https://duckduckgo.com/?q=!gh+javascript`
- Include pattern: `^https://duckduckgo\.com/\?q=%21gh\+(.*)$`
- Redirect to: `https://github.com/search?q=$1`
- Pattern type: Regular Expression
- Description: Custom !gh bang for GitHub search
- Applies to: main_frame

#### !yt YouTube Search
- Example URL: `https://duckduckgo.com/?q=!yt+coding+tutorials`
- Include pattern: `^https://duckduckgo\.com/\?q=%21yt\+(.*)$`
- Redirect to: `https://www.youtube.com/results?search_query=$1`
- Pattern type: Regular Expression
- Description: Custom !yt bang for YouTube search
- Applies to: main_frame

#### !so Stack Overflow Search
- Example URL: `https://duckduckgo.com/?q=!so+javascript+promises`
- Include pattern: `^https://duckduckgo\.com/\?q=%21so\+(.*)$`
- Redirect to: `https://stackoverflow.com/search?q=$1`
- Pattern type: Regular Expression
- Description: Custom !so bang for Stack Overflow search
- Applies to: main_frame

#### !w Wikipedia Search
- Example URL: `https://duckduckgo.com/?q=!w+artificial+intelligence`
- Include pattern: `^https://duckduckgo\.com/\?q=%21w\+(.*)$`
- Redirect to: `https://en.wikipedia.org/wiki/Special:Search?search=$1`
- Pattern type: Regular Expression
- Description: Custom !w bang for Wikipedia search
- Applies to: main_frame

### Import Ready Examples

A complete set of these examples is available in `example_redirects.json` for easy import:

1. Open Redirector
2. Click "Edit Redirects"
3. Click "Import" button
4. Select `example_redirects.json`
5. Enable the rules you want to use

### Important Notes for Manifest V3

1. **Resource Types**
   Valid resource types in Manifest V3 are:
   - main_frame, sub_frame
   - script, stylesheet
   - image, font
   - xmlhttprequest
   - object, media
   - ping, csp_report
   - websocket, webtransport, webbundle

2. **Pattern Types**
   - **Wildcard**: Uses `*` for capturing. Access captures with `$1`, `$2`, etc.
   - **Regex**: Uses standard regex. Access captures with `$1`, `$2`, etc.

3. **Best Practices**
   - Always specify appropriate resource types
   - Use `^` and `$` in regex patterns for exact matches
   - Escape special characters properly (`.` becomes `\.`)
   - Include exclude patterns to prevent redirect loops
   - Test patterns thoroughly before deploying
   - Start with rules disabled for safety

## Dark Theme
If you are a Firefox user and use a dark theme, you can add these lines to your `userChrome.css` file to make Redirector's extension button more visible:

```css
/* Redirector button for dark Firefox themes */
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="active"] { filter: invert(1) brightness(6); }
toolbarbutton#toggle-button--redirectoreinaregilssoncom-redirector[image*="disabled"] { filter: invert(1) brightness(2.5); }
```

If you don't know what the `userChrome.css` file is, or how to edit it, please look it up on a Firefox forum instead of asking about it in this repository. Thanks!