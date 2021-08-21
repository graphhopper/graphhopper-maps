# GraphHopper Maps

This is the UI for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper).
It was rewritten from scratch and will replace the [jquery-based maps UI](https://github.com/graphhopper/graphhopper#graphhopper-maps).

Try it at [graphhopper.com/maps2](https://graphhopper.com/maps2/).

Get started:

 * copy config.js to config-local.js and enter your GraphHopper API key for routing (get it at https://www.graphhopper.com)
   or change the 'api' field and point it at your local GraphHopper server, e.g. `api: http://localhost:8989/`.
 * optional: setup api keys for the other tile providers, see MapOptionsStore.ts. you can also change the default tile layer in config-local.js
 * npm install
 * npm run serve
 * open browser at http://0.0.0.0:3000/
 * development deploys are at http://gh-maps-react.s3-website.eu-central-1.amazonaws.com/master/. (Replace 'master' with the actual branch name)
