# GraphHopper Maps

A user interface for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper) released under the Apache License 2.0.

[Try it out](https://graphhopper.com/maps2/)!

[![GraphHopper Maps route planner](https://www.graphhopper.com/wp-content/uploads/2022/10/maps2-1024x661.png)](https://graphhopper.com/maps2/)


Get started:

 * copy the config.js to config-local.js and enter your GraphHopper API key for routing (get it at https://www.graphhopper.com)
   or change the 'api' field and point it at your [local GraphHopper server](https://github.com/graphhopper/graphhopper), e.g. `api: http://localhost:8989/`. Ensure that the api ends with a slash.
 * optional: setup api keys for the other tile providers, see MapOptionsStore.ts. you can also change the default tile layer in config-local.js
 * make sure node/npm is installed. We recommend using the gallium LTS (node v16.17.0 & npm v8.15.0)
 * npm install
 * npm run serve
 * open your browser at http://0.0.0.0:3000/

Development deployments are available at https://graphhopper.com/maps-dev/something/. (Replace 'something' with the actual branch name) 

There is also [an experimental `navi` branch](https://github.com/graphhopper/graphhopper-maps/tree/navi) that implements turn-by-turn navigation [directly in the browser](https://navi.graphhopper.org).
