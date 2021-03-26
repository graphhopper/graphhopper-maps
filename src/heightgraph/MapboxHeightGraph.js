import {HeightGraph} from "./heightgraph";
import mapboxgl from "mapbox-gl";

export class MapboxHeightGraph {

    constructor(options) {
        this._options = options;
    }

    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'heightgraph mapboxgl-ctrl';
        const self = this;
        const callbacks = {
            // todonow: this vs. self, same in leaflet version
            _showMapMarker: self._showMapMarker.bind(this),
            _fitMapBounds: self._fitMapBounds.bind(this),
            _markSegmentsOnMap: self._markSegmentsOnMap.bind(this)
        }
        this._heightgraph = new HeightGraph(this._container, this._options, callbacks);
        return this._container;
    }

    onRemove() {
        this._markSegmentsOnMap([]);
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
        this._heightgraph = undefined;
    }

    addData(data) {
        this._heightgraph.addData(data);
    }

    resize(size) {
        this._heightgraph.resize(size);
    }

    _fitMapBounds(bounds) {
        bounds = new mapboxgl.LngLatBounds(bounds.sw, bounds.ne);
        this._map.fitBounds(bounds, {
            animate: false
        });
    }

    /**
     * Creates a marker on the map while hovering
     * @param {Object} ll: actual coordinates of the route
     * @param {Number} elevation: elevation as float
     * @param {string} type: type of element
     * // todonow: duplicate docs (see leaflet version)
     */
    _showMapMarker(ll, elevation, type) {
        if (this._popup) {
            this._popup.remove();
            // this._svg.remove();
        }
        if (ll) {
            // todonow: adjust and use drawRouteMarker method (draw popup using svg instead of using default popup?)
            // maybe we need to use a Control? or maybe we do not need this anyway? the popup also works?
            // this._svg = document.createElement('svg');
            // this._heightgraph._drawRouteMarker(this._svg, {x: 0, y: 0}, elevation, type);
            this._popup = new mapboxgl.Popup({
                closeButton: false,
            })
                /// todonow: make ll independent of leaflet?
                .setLngLat({lon: ll.lng, lat: ll.lat})
                // .setDOMContent(this._svg)
                .setHTML(`<p>${elevation}m</p><p></p>${type}</p>`)
                .setMaxWidth("300px")
                .addTo(this._map);
        }
    }

    _markSegmentsOnMap(coords) {
        const id = 'highlighted-segments';
        if (coords.length === 0) {
            if (this._map.getLayer(id))
                this._map.removeLayer(id);
            if (this._map.getSource(id))
                this._map.removeSource(id);
            return;
        }
        // todonow: change format in core
        coords = coords.map(c => c.map(p => [p.lng, p.lat]));
        const data = {
            "type": "Feature",
            "geometry": {
                "type": "MultiLineString",
                "coordinates": coords
            }
        };
        if (!this._map.getSource(id)) {
            this._map.addSource(id, {
                'type': 'geojson',
                'data': data
            });
            this._map.addLayer({
                'id': id,
                'type': 'line',
                'source': id,
                // todonow: use highlightStyle option
                'paint': {
                    'line-color': 'red',
                    'line-width': 4
                }
            });
        } else {
            this._map.getSource(id).setData(data);
        }
    }

}