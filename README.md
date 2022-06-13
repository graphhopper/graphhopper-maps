# GraphHopper Maps

This is the user interface for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper). It was rewritten from scratch and will replace the [jquery-based maps UI](https://github.com/graphhopper/graphhopper#graphhopper-maps).

Try it at [graphhopper.com/maps2](https://graphhopper.com/maps2/).

Get started:

 * copy the config.js to config-local.js and enter your GraphHopper API key for routing (get it at https://www.graphhopper.com)
   or change the 'api' field and point it at your [local GraphHopper server](https://github.com/graphhopper/graphhopper), e.g. `api: http://localhost:8989/`.
 * optional: setup api keys for the other tile providers, see MapOptionsStore.ts. you can also change the default tile layer in config-local.js
 * make sure node/npm is installed. We recommend using the fermium LTS (node v14.18.1 & npm v6.14.15)
 * npm install
 * npm run serve
 * open your browser at http://0.0.0.0:3000/

Development deployments are available at http://gh-maps-react.s3-website.eu-central-1.amazonaws.com/master/. (Replace 'master' with the actual branch name) 

There is also [an experimental `navi` branch](https://github.com/graphhopper/graphhopper-maps/tree/navi) that implements turn-by-turn navigation [directly in the browser](https://navi.graphhopper.org).
