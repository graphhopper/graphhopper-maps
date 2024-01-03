# GraphHopper Maps

A route planner user interface for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper) released under the Apache License 2.0.

[Try it out](https://graphhopper.com/maps/)!

[![GraphHopper Maps route planner](https://www.graphhopper.com/wp-content/uploads/2023/03/gh-maps-202303.png)](https://graphhopper.com/maps/)

## Turn-by-Turn navigation

There is [an experimental `navi` branch](https://github.com/graphhopper/graphhopper-maps/tree/navi) that implements turn-by-turn navigation
[directly in the browser](https://navi.graphhopper.org).

## Start development:

 * Clone this repository.
 * Make sure node and npm are installed. We recommend using the gallium LTS (node v16.17.0 & npm v8.15.0).
 * npm install
 * npm run serve
 * Open your browser at http://0.0.0.0:3000/.
 * Start development. The browser will update automatically when you change the code.
 * Format the code and run the tests using `npm run format` and `npm run test`.
 * Fork the repository and create a pull request. Contributions are welcome. Feel free to discuss your changes in our
   [forum](https://discuss.graphhopper.com/) or the GitHub [issues](https://github.com/graphhopper/graphhopper-maps/issues).
 * You can build the production bundle using `npm run build`.
 * If you use the Directions API edit the config to show profile icons properly (see 'Advanced configuration' section below).

## Help with translations:

GraphHopper Maps is translated into many languages and you can help improve GraphHopper by adding or improving your language! See [this spreadsheet](https://docs.google.com/spreadsheets/d/18z00Rbt6QvLIkayEV9P89vW9oU0QbTVsjRk9nz1CeFY/edit#gid=0)
to create a new or improve an existing language. Let us know if you changed something or submit a pull request with your changes after the following steps:

 * Edit the spreadsheet
 * Run `python3 update-translations.py`
 * Review your changes via e.g. http://localhost:3000/?locale=en and with `git diff`. Make sure that is the only one with `git status`.
 
Please note that the translations the server-side turn instructions are located in [a different repository](https://github.com/graphhopper/graphhopper/blob/master/docs/core/translations.md).

## Advanced configuration

You can point the app to a different url, like a [local GraphHopper server](https://github.com/graphhopper/graphhopper), 
set your own API keys for the different map tile providers and more in the [config.js](./config.js) file. For such changes it is
best to create a copy of this file called `config-local.js` which will be ignored by git.

## Further Notes

Every branch of this repository can be tested at https://graphhopper.com/maps-dev/<branch_name>/

## Powered By

This project uses

 * the great [OpenLayers library](https://openlayers.org/).
 * the [codemirror](https://codemirror.net/) code editor for the custom model editor.
 * many icons from Google's [open source font library](https://fonts.google.com/icons).
 * many more open source projects - see the package.json
