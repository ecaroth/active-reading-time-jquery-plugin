# Active Reading Time - jQuery Plugin

**"Active Reading Time"** is a jquery plugin that allows you to add a _remaining time to read_ flag on the right side of your web pages, to allow your readers to immediately grasp the sense of how long the article is, how far into an article they are, etc. The flag follows the user scroll bar, fades when they stop scrolling, are finished, or click to remove the flag. 

The plugin is very flexible, allowing you to set it up on your page and style appopriately, and learns the reading speed of an individual reader to customize the output. The plugin is a ready-to-use, drop in script to enhance your blog, knowledge base, or any other text-heavy resource.

[See the plugin in action -  DEMO](https://ecaroth.github.io/active-reading-time-jquery-plugin//test/demo.html)
### Wait.. what? It learns how fast people read?

Yessir, you heard that right! The plugin starts with a baseline metric for words per minute - **200**, which is the adult average (and is configurable). As a reader engages with the content and reads deeper into the article, the plugin adjusts their reading time calculation to reflect how fast they are _actually_ reading, then remembers their personal reading speed as they continue to browse your site.

### How the heck does it do that?
The plugin builds a _sliding window_ model for the page that defines where the article text is present (defined by you via a CSS selector), accounting for variance in how users normally scroll a page (i.e. I don't have to scroll text all the way to the top of the screen to start reading... same thing at the bottom). 

The window represents the area in which a user can be while scrolling and likely be reading the content, and adjusts as the window is resized or the viewport changes. As the user reads, the plugin builds a normalized "read line" that estimates where the user is currently at in reading progression of the article. It normalizes for erratic behavior  (such as random scrolling or jumping around the page), and does deep calculation to know exactly _how many_ words were read and remaining based on read line progression and offset calculation. The plugin also tracks forward progression, so read time is only calculated for sections of realistc forward reading - not jumping section to section or re-reading sections, which keeps the calculations more accurate.

A tiny cookie is set on your domain that contains the customized read time words per minute for the reader, which is used for subsequent page views on other articles, and is updated as the read time speed gets more accurate.

### Why is this better than any other _"reading time plugins"_ out there?
There are plenty of other plugins that let you display an estimated reading time for content, and even some that try to have ongoing updates to show how far into the piece you are. However, they fall short compared to Active Reading Time.

Other plugins simply display an estimated time left by guessing what percentage of the article remains based on scroll position on the page, - a method that is very simplistic, and that does _not_ take into account the fact that most sites have headers, footers, advertisements, etc - not to mention images, video, and various text/spacing/styling in the article itself! "Active Reading Time" plugin handles all of this, performing calculation down to the actual estimated read word level. - _and_ adjusts for individual user reading speeds.

### Common Questions (& Answers)

**What kinds of sites does this work best on?**<BR>
Any site that has lots of text in a _single-column_ format, such as a blog, knowledge base,  help docs, guide, research report, etc. If you have a multi-column layout, like a newspaper, this plugin will not work for you.

**The colors and designs are cool, but can I customize it?**<BR>
Yes - the CSS is very simple (just look in the `/dist/active-reading-time.css` file). You can change font, colors, padding, etc - the plugin does dynamic calculation to determine the height of the flag for positioning pursposes, so style away!

**Does this plugin slow my webpage down?**<BR>
Nope, not really! The script is very small (~10kb) so it loads super fast. It relies on scroll detection, which can fire _a lot_ of events very fast that often slows similar plugins down, but it smartly uses Throttling (a method to limit events from firing more than X ammount of times during a fixed time period) to keep it very performant, yet still have a smooth UI.

**Does this work on mobile devices and tablets?**<BR>
Nope - our opinion is that a plugin like this distracts from the user experience in a mobile/tablet environment, and the way those browsers do screen refreshes/draw updates limits the functionality of screen-fixed elements like our flag. The plugin detects the browsing mode, and only shows the flag in desktop browsing environments.

## Usage

To use this plugin, simply grab the 2 files needed from the repo - [`/dist/active-reading-time.min.js`](#TODO), and [`/dist/active-reading-time.css`](#TODO). Include the CSS in the `<head>` section of your site, and the script before the closing `</body>` tag. Then you can instantiate the plugin like so:
```javascript
$(".myArticleSelector").activeReadingTime(options);
```
_NOTE_ that in the example above, the block to create the plugin must come after the `active-reading-time.jquery.min.js` file is included. Passed in `options` is a key/value javascript object, described below.


### Options
> `topMargin` _(integer, default is 40)_,  Distance (in pixels) from the top of the element you want the reading time to be displayed when the user scrolls near to it, and calculations assume user has begun reading the content.
>
>`bottomMargin` _(integer, default is 40)_, Distance after the end of the element becomes visible on the screen that you want the reading time to be hidden, and calculations assume user has completed reading the content.
>
>`defaultWordsPerMinute` _(integer, default is 200)_, Expected average words per minute for your audience, defaults to general adult average of 40
>
>`minutesOnly` _(boolean, default is false)_, Round read time to nearest minutes only (excluding seconds). If true display format is _'5 minutes left'_, else format  _'5m, 40s left'_.