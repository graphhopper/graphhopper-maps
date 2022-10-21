# GraphHopper Maps

A user interface for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper) released under the Apache License 2.0.

[Try it out](https://graphhopper.com/maps/)!

[![GraphHopper Maps route planner](https://www.graphhopper.com/wp-content/uploads/2022/10/maps2-1024x661.png)](https://graphhopper.com/maps/)


## Start development:

 * Clone this repository.
 * Make sure node/npm is installed. We recommend using the gallium LTS (node v16.17.0 & npm v8.15.0).
 * npm install
 * npm run serve
 * Open your browser at http://0.0.0.0:3000/.
 * Start development. The browser will update automatically when you change the code.
 * Format the code and run the tests using `npm run format` and `npm run test`.
 * Fork the repository and create a pull request. Contributions are welcome. Feel free to discuss your changes in our
   [forum](https://discuss.graphhopper.com/) or the GitHub [issues](https://github.com/graphhopper/graphhopper-maps/issues).
 * You can build the production bundle using `npm run build`.

## Help with translations:

GraphHopper Maps is translated into many languages. See [here](https://github.com/graphhopper/graphhopper/blob/master/docs/core/translations.md) how you can help with this.

## Advanced configuration

You can point the app to a different url, like a [local GraphHopper server](https://github.com/graphhopper/graphhopper), 
set your own API keys for the different map tile providers and more in the [config.js](./config.js) file. For such changes it is
best to create a copy of this file called `config-local.js` which will be ignored by git.

## Further Notes

Every branch of this repository can be tested at https://graphhopper.com/maps-dev/<branch_name>/ 

There is also [an experimental `navi` branch](https://github.com/graphhopper/graphhopper-maps/tree/navi) that implements
turn-by-turn navigation [directly in the browser](https://navi.graphhopper.org).
