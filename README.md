# GraphHopper Maps

This is the UI for the [GraphHopper routing engine](https://github.com/graphhopper/graphhopper).
It was rewritten from scratch and will replace the [jquery-based maps UI](https://github.com/graphhopper/graphhopper#graphhopper-maps).

Try it at [graphhopper.com/maps2](https://graphhopper.com/maps2/).

Get started:

 * create an apikeys.js file with the content:
```
module.exports = {
       "graphhopper": "missing_api_key",
       "maptiler": "missing_api_key",
       "omniscale": "missing_api_key",
       "thunderforest": "missing_api_key",
       "kurviger": "missing_api_key",
}
```
   replace at least your GraphHopper and MapTiler API key or point it to your local GraphHopper and OpenMapTiles servers (change apiAddress in src/api/Api.ts)
 * npm install
 * npm run serve
 * open browser at http://0.0.0.0:3000/
 * development deploys are at http://gh-maps-react.s3-website.eu-central-1.amazonaws.com/master/. (Replace 'master' with the actual branch name)
