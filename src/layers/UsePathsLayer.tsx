import { Feature, Map } from 'ol'
import { Path } from '@/api/graphhopper'
import { FeatureCollection } from 'geojson'
import { useEffect, useState } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Icon, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { SelectEvent } from 'ol/interaction/Select'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { Coordinate } from '@/stores/QueryStore'
import { Geometry, LineString, Point } from 'ol/geom'
import Event from 'ol/render/Event'
import { getVectorContext } from 'ol/render'
import { toRadians } from '@/turnNavigation/GeoMethods'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'

// we need a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
    '<path style="fill:rgb(107,165,255); stroke:none;" d="M 24.13483,3.8557243 8.1348294,40.355724 l 1.5,1.5 14.5000006,-6.6 z M 19.605832,31.73126 Z" />' +
    '<path style="fill:rgb(3,89,194); stroke:none;" d="m 24.131517,3.8515376 16,36.4999994 -1.5,1.5 -14.5,-6.6 z m 4.528998,27.8755354 z" />' +
    '</svg>'

export default function usePathsLayer(map: Map, route: RouteStoreState, turnNavigation: TurnNavigationStoreState) {
    const [oldCoordinate, setOldCoordinate] = useState(turnNavigation.coordinate)
    const [oldRotation, setOldRotation] = useState(toRotation(map, turnNavigation.heading))

    useEffect(() => {
        removeCurrentPathLayers(map)
        if (turnNavigation.showUI && turnNavigation.activePath != null) {
            addSelectedPathsLayer(map, turnNavigation.activePath, turnNavigation)
        } else {
            addUnselectedPathsLayer(
                map,
                route.routingResult.paths.filter(p => p != route.selectedPath)
            )
            addSelectedPathsLayer(map, route.selectedPath, turnNavigation)
        }
        return () => {
            removeCurrentPathLayers(map)
        }
    }, [map, route.routingResult.paths, route.selectedPath, turnNavigation.showUI, turnNavigation.activePath])

    useEffect(() => {
        let animation: InBetweenArrowAnimation | null = null
        const layer = findSelectedPathLayer(map)
        const rotation = toRotation(map, turnNavigation.heading)
        if (oldCoordinate.lat != 0 && oldCoordinate.lng != 0 && layer.getSource().getFeatures().length == 2) {
            const feature = layer.getSource().getFeatures()[1] as Feature
            animation = new InBetweenArrowAnimation(map, layer, feature)
            animation.startAnimation(oldCoordinate, turnNavigation.coordinate, oldRotation, rotation)
        }
        setOldCoordinate(turnNavigation.coordinate)
        setOldRotation(rotation)
        return () => {
            animation?.stopAnimation()
        }
    }, [map, turnNavigation.coordinate])
}

function toRotation(map: Map, heading?: number) {
    return heading && !Number.isNaN(heading) ? -toRadians(heading) : map.getView().getRotation()
}

function removeCurrentPathLayers(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(pathsLayerKey) || l.get(selectedPathLayerKey))
        .forEach(l => map.removeLayer(l))
}

function addUnselectedPathsLayer(map: Map, paths: Path[]) {
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createUnselectedPaths(paths)),
        }),
        style: () =>
            new Style({
                stroke: new Stroke({
                    color: '#5B616A',
                    width: 5,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),
            }),
        opacity: 0.8,
    })
    layer.set(pathsLayerKey, true)
    layer.setZIndex(1)
    map.addLayer(layer)

    // select an alternative path if clicked
    removeSelectPathInteractions(map)
    const select = new Select({
        condition: click,
        layers: [layer],
        style: null,
        hitTolerance: 5,
    })
    select.on('select', (e: SelectEvent) => {
        const index = e.selected[0].getProperties().index
        Dispatcher.dispatch(new SetSelectedPath(paths[index]))
    })
    select.set('gh:select_path_interaction', true)
    map.addInteraction(select)
}

function addSelectedPathsLayer(map: Map, selectedPath: Path, turnNavigation: TurnNavigationStoreState) {
    const styles = {
        LineString: new Style({
            stroke: new Stroke({
                color: '#275DAD',
                width: 6,
                lineCap: 'round',
                lineJoin: 'round',
            }),
        }),
        Point: new Style({
            image: new Icon({
                displacement: [0, 0],
                src: 'data:image/svg+xml;utf8,' + svgArrowData,
            }),
        }),
    } as { [key: string]: Style }
    const features = [
        new Feature({
            properties: { type: 'LineString' },
            geometry: new LineString(selectedPath.points.coordinates.map(c => fromLonLat(c))),
        }),
    ] as Feature[]
    const coord = turnNavigation.coordinate
    if (coord != null) features.push(new Feature({ geometry: new Point(fromLonLat([coord.lng, coord.lat])) }))

    const layer = new VectorLayer({
        source: new VectorSource({ features: features }),
        style: feature => styles[(feature.getGeometry() as Geometry).getType()],
        opacity: 0.8,
    })

    layer.set(selectedPathLayerKey, true)
    layer.setZIndex(2)
    map.addLayer(layer)
}

function createUnselectedPaths(paths: Path[]) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: paths.map((path, index) => {
            return {
                type: 'Feature',
                properties: {
                    index,
                },
                geometry: {
                    ...path.points,
                    coordinates: path.points.coordinates.map(c => fromLonLat(c)),
                },
            }
        }),
    }
    return featureCollection
}

function removeSelectPathInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:select_path_interaction'))
        .forEach(i => map.removeInteraction(i))
}

function findSelectedPathLayer(map: Map): any {
    const layers = map
        .getLayers()
        .getArray()
        .filter(l => l.get(selectedPathLayerKey))
    return layers.length > 0 && layers[0] instanceof VectorLayer && layers[0].getSource() instanceof VectorSource
        ? layers[0]
        : null
}

class InBetweenArrowAnimation {
    animating: boolean = false
    lastTime: number = 0.0
    progress: number = 0.0
    startCoord: Coordinate = { lat: 0, lng: 0 }
    endCoord: Coordinate = { lat: 0, lng: 0 }
    startRotation: number = 0
    deltaRot: number = 0

    private readonly map: Map
    private readonly mf
    private readonly vectorLayer: VectorLayer<VectorSource>
    private readonly feature: Feature
    private readonly arrowStyle = new Style({
        image: new Icon({
            displacement: [0, 0],
            src: 'data:image/svg+xml;utf8,' + svgArrowData,
        }),
    })

    constructor(map: Map, vectorLayer: VectorLayer<VectorSource>, feature: Feature) {
        this.map = map
        // ensure that we call "on" and "un" with the same function
        this.mf = this.moveFeature.bind(this)
        this.feature = feature
        this.vectorLayer = vectorLayer
    }

    startAnimation(startCoord: Coordinate, endCoord: Coordinate, startRotation: number, endRotation: number) {
        if (this.animating) {
            console.log('Ignore startAnimation')
            return
        }

        console.log('startAnimation')
        this.animating = true
        this.progress = 0
        this.lastTime = Date.now()
        this.startCoord.lat = startCoord.lat
        this.startCoord.lng = startCoord.lng
        this.endCoord.lat = endCoord.lat
        this.endCoord.lng = endCoord.lng
        this.startRotation = startRotation
        // ensure that it uses the smallest rotation. E.g. from 0.1 to 6.2 is is only ~0.18 [rad] but it would rotate nearly 2*pi [rad]
        let deltaRot = endRotation - this.startRotation
        if (deltaRot > Math.PI) deltaRot = deltaRot - 2 * Math.PI
        else if (deltaRot < -Math.PI) deltaRot = deltaRot + 2 * Math.PI
        this.deltaRot = deltaRot
        this.vectorLayer.on('postrender', this.mf)

        // We have to remove the image before we move it but this only works if there is another feature like the line.
        // If not, then the postrender method is never triggered.
        this.feature.setGeometry(undefined)
    }

    stopAnimation() {
        if (!this.animating) {
            console.log('Ignore stopAnimation')
            return
        }
        console.log('stopAnimation')
        this.animating = false
        this.progress = 0
        this.lastTime = -1

        this.feature.setGeometry(new Point(fromLonLat([this.endCoord.lng, this.endCoord.lat])))
        this.feature.setStyle(this.arrowStyle)
        this.vectorLayer.un('postrender', this.mf)
    }

    moveFeature(event: Event) {
        if (!this.animating) {
            console.log('Ignored moveFeature')
            return
        }

        if (event.frameState == undefined) {
            console.log('event.frameState undefined')
            return
        }

        const time = event.frameState.time
        const elapsedTime = time - this.lastTime
        this.progress = this.progress + elapsedTime / 1000.0
        this.lastTime = time
        if (this.progress > 1) {
            // make end coordinate permanent
            this.stopAnimation()
            return
        }
        let coord = { lat: this.startCoord.lat, lng: this.startCoord.lng }
        coord.lat = this.startCoord.lat + (this.endCoord.lat - this.startCoord.lat) * this.progress
        coord.lng = this.startCoord.lng + (this.endCoord.lng - this.startCoord.lng) * this.progress
        const vectorContext = getVectorContext(event)
        vectorContext.setStyle(this.arrowStyle)
        vectorContext.drawGeometry(new Point(fromLonLat([coord.lng, coord.lat])))
        // better? vectorContext.drawFeature(this.feature, this.arrowStyle)

        // this does not work as animation is triggered only after
        // this.map.getView().cancelAnimations()
        // this.map.getView().animate({center: fromLonLat([coord.lng, coord.lat])})

        this.map.getView().setCenter(fromLonLat([coord.lng, coord.lat]))
        this.map.getView().setRotation(this.startRotation + this.deltaRot * this.progress)

        // tell OpenLayers to continue the postrender animation
        this.map.render()
    }
}
