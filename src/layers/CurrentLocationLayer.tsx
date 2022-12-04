import React, {useEffect, useState} from 'react'
import {Feature, Map} from 'ol'
import {Coordinate} from '@/stores/QueryStore'
import {Point} from 'ol/geom'
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Icon, Style} from 'ol/style'
import Event from "ol/render/Event";
import {getVectorContext} from "ol/render";

// we need a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
    '<path style="fill:rgb(107,165,255); stroke:none;" d="M 24.13483,3.8557243 8.1348294,40.355724 l 1.5,1.5 14.5000006,-6.6 z M 19.605832,31.73126 Z" />' +
    '<path style="fill:rgb(3,89,194); stroke:none;" d="m 24.131517,3.8515376 16,36.4999994 -1.5,1.5 -14.5,-6.6 z m 4.528998,27.8755354 z" />' +
    '</svg>'

export default function useCurrentLocationLayer(map: Map, location: Coordinate) {
    const [oldLoc, setOldLoc] = useState(location)

    useEffect(() => {
        const tmpOldLoc = {lat: oldLoc.lat, lng: oldLoc.lng}
        setOldLoc(location)

        let animation: InBetweenArrowAnimation | null = null
        let layer = findLayer(map)
        if (tmpOldLoc.lat != 0 && tmpOldLoc.lng != 0) {
            if (layer == null) layer = addCurrentLocation(map, tmpOldLoc)
            const feature = layer.getSource().getFeatures()[0] as Feature
            animation = new InBetweenArrowAnimation(map, layer, feature)
            if (tmpOldLoc.lat != 0 && tmpOldLoc.lng != 0)
                animation.startAnimation(tmpOldLoc, location)
        }
        return () => {
            animation?.stopAnimation()
            map.removeLayer(layer)
        }
    }, [map, location])
}

function findLayer(map: Map): any {
    const layers = map
        .getLayers()
        .getArray()
        .filter(l => l.get('gh:current_location'))
    return layers.length > 0 && layers[0] instanceof VectorLayer && layers[0].getSource() instanceof VectorSource
        ? layers[0]
        : null
}

function addCurrentLocation(map: Map, location: Coordinate) {
    const currentLocationLayer = new VectorLayer({
        source: new VectorSource({
            features: [
                new Feature({
                    geometry: new Point(fromLonLat([location.lng, location.lat])),
                }),
            ],
        }),
    })
    currentLocationLayer.set('gh:current_location', true)
    currentLocationLayer.setZIndex(3)
    currentLocationLayer.setStyle(() =>
        new Style({
            image: new Icon({
                displacement: [0, 24],
                src: 'data:image/svg+xml;utf8,' + svgArrowData,
            }),
        })
    )
    map.addLayer(currentLocationLayer)
    return currentLocationLayer
}

class InBetweenArrowAnimation {
    animating: boolean = false
    lastTime: number = 0.0
    distance: number = 0.0
    startCoord: Coordinate = {lat: 0, lng: 0}
    endCoord: Coordinate = {lat: 0, lng: 0}

    private readonly map: Map
    private readonly mf
    private readonly vectorLayer: VectorLayer<VectorSource>
    private readonly feature: Feature
    private readonly arrowStyle = new Style({
        image: new Icon({
            displacement: [0, 24],
            src: 'data:image/svg+xml;utf8,' + svgArrowData,
        }),
    })

    constructor(map: Map, vectorLayer: VectorLayer<VectorSource>, feature: Feature) {
        this.map = map;
        // ensure that we call "on" and "un" with the same function
        this.mf = this.moveFeature.bind(this)
        this.feature = feature
        this.vectorLayer = vectorLayer
    }

    startAnimation(startCoord: Coordinate, endCoord: Coordinate) {
        if (this.animating) {
            console.log("Ignore startAnimation")
            return
        }

        console.log("startAnimation")
        this.animating = true
        this.distance = 0
        this.lastTime = Date.now()
        this.startCoord.lat = startCoord.lat
        this.startCoord.lng = startCoord.lng
        this.endCoord.lat = endCoord.lat
        this.endCoord.lng = endCoord.lng
        this.vectorLayer.on('postrender', this.mf);
        // WITHOUT this call the moveFeature method is not called
        // but WITH this call the arrow is printed twice on the map!?!?
        // this.feature.setGeometry(undefined)

        // trigger render directly (in the marker animation example this call wasn't necessary?)
        this.map.render()
    }

    stopAnimation() {
        if (!this.animating) {
            console.log("Ignore stopAnimation")
            return
        }
        console.log("stopAnimation")
        this.animating = false
        this.distance = 0
        this.lastTime = -1

        this.feature.setGeometry(new Point(fromLonLat([this.endCoord.lng, this.endCoord.lat])));
        this.feature.setStyle(this.arrowStyle)
        this.vectorLayer.un('postrender', this.mf);
    }

    moveFeature(event: Event) {
        if (!this.animating) {
            console.log("Ignored moveFeature")
            return;
        }

        if (event.frameState == undefined) {
            console.log("event.frameState undefined")
            return
        }

        const time = event.frameState.time;
        const elapsedTime = time - this.lastTime;
        // TODO make this adaptable. for fake this is 3sec and for real it is ~1sec but spec is unclear about this :(
        this.distance = this.distance + elapsedTime / 1000.0
        console.log("moveFeature " + this.distance)
        this.lastTime = time
        if (this.distance > 1) {
            // make end coordinate permanent
            this.stopAnimation()
            return;
        }
        let coord = {lat: this.startCoord.lat, lng: this.startCoord.lng}
        coord.lat = this.startCoord.lat + (this.endCoord.lat - this.startCoord.lat) * this.distance
        coord.lng = this.startCoord.lng + (this.endCoord.lng - this.startCoord.lng) * this.distance
        // console.log(coord)
        const vectorContext = getVectorContext(event);
        vectorContext.setStyle(this.arrowStyle)
        vectorContext.drawGeometry(new Point(fromLonLat([coord.lng, coord.lat])));
        // better? vectorContext.drawFeature(this.feature, this.arrowStyle)

        // tell OpenLayers to continue the postrender animation
        this.map.render();
    }
}