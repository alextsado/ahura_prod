# Ahura AI Study Sprint tool

This is the first release of Ahura AI's Technology, packaged as a study sessions tool. This is intended to show the capabilities of Ahura's technology.


Ahura's sprint study plugin makes studying easy by keeping you on track for "study sprints". This is accomplished by first identifying your study topic and selecting a period of time you need to stay focused for. Then, our AI finds out whether your page is on topic or not. If you're distracted, options to get back on track or use the page to extend the study scope are displayed. Upcoming versions will reroute you to recommended content.

## Getting started with the code

The attached code requires no build process in order to work at this time. It has 2 upstream dependencies that I plan to automate the packaging of.  First there is BootStrap, the CSS grid framework. This helps with layout. Currently I only pull in the bootstrap.css file from this. The other is Face-API, which puts together a few facial recognition models on top of tensorflow.js.  I would like to migrate to just raw tensorflow.js with the models that I train, but my machine learning game is not there yet.

The folder structure is pretty abysmal. I keep meaning to organize it.

## Installing
To install the plugin for development on Chrome go to chrome://extensions, enable "developer mode" on the top-right, click on "load unpacked" on the top left and find the code directory of this project.
To prepare it for upload create a zip by running the following command:

'''
zip -r -FS FirefoxDistractionPlugin.zip * --exclude *.git*
'''
Then upload it to the Chrome web store.

To install the plugin for development on Firefox go to about:addons and select "Debug Addons" then navigate to the location of the manifest.json file. 
To install the plugin for usage please upload it to the Firefox add-ons store for private use (e.g. do not publish a public URL). Use the same zip command above.

No further action is needed to get the code working at this time.

## Authors

The code of this plugin (and it's backend server) minus its dependencies, is currently the work of a sole author: **Barnaby Bienkowski**. 

## License 

This project is licensed under the Apache License 2.0 - see the [LICENSE.md](LICENSE.md) file for details


## Change Log
In upcoming versions we hope to:
 * Further integrate the camera and tensorflow by updating the calculations of how much time a user actually spent on every page versus when they simply left the tab open while they walked away to get a snack.
 * Make historical reports so that users can see their progress over time.
 * incorporate goals so that users can specify how many hours of actual focus per week they want, and what percentage of focus they aim to achieve each session
 * Improve the mechanisms by which we re-focus the user on their task (e.g.for now we simply open a new tab with a relevant search topic
 * Further make use of the users' emotions (e.g. tensorflow output) as predictors of getting unfocused and thus to re-focus users pre-emptively.

In version 0.2.00 we have:
 * Debugging: Fixed duplicates in the "make relevant" dialog, updated the URL row once a page was made relevant, and added overlays to make the functonality more obvious to first-time users.
 * Cleaned up the home directory even more with src/ and html/ folders
 * Experimenting with a datalist to show historical search topics, recommended topics, and popular topics.
 * A reports page showing statistics on your focus as well as listing which URLs were usefull (for future reference).

In verion 0.1.9 we have:

 * Built upon the code accepted to the Firefox plugins store, so this extension is now available on both Firefox and Chrome
 * Switched from a "countdown" model where you do a "study sprint" sort of like a Pomodoro, and instead do a "count up" model like a "study session"
 * Clean the HTML input that comes from forms or from the server before inserting it into templates
 * Cleaned up the home directory a little bit by moving images into an images/ folder
 * Moved some old fasioned xhr calls to the more modern and debuggable fetch() calls
