import {Feature, Map} from 'ol'
import {useEffect} from 'react'
import {Point} from 'ol/geom'
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Icon, Style} from 'ol/style'
import {POI, POIsStoreState} from '@/stores/POIsStore'

import flight_takeoff_svg from '/src/pois/img/flight_takeoff.svg'
import hotel_svg from '/src/pois/img/hotel.svg'
import local_hospital_svg from '/src/pois/img/local_hospital.svg'
import local_parking_svg from '/src/pois/img/local_parking.svg'
import local_pharmacy_svg from '/src/pois/img/local_pharmacy.svg'
import luggage_svg from '/src/pois/img/luggage.svg'
import museum_svg from '/src/pois/img/museum.svg'
import restaurant_svg from '/src/pois/img/restaurant.svg'
import school_svg from '/src/pois/img/school.svg'
import sports_handball_svg from '/src/pois/img/sports_handball.svg'
import store_svg from '/src/pois/img/store.svg'
import train_svg from '/src/pois/img/train.svg'
import universal_currency_alt_svg from '/src/pois/img/universal_currency_alt.svg'
import {createPOIMarker} from "@/layers/createMarkerSVG";

const svgStrings: { [id: string]: string } = {}

const svgObjects: { [id: string]: any } = {
    'flight_takeoff': flight_takeoff_svg(),
    'hotel': hotel_svg(),
    'local_hospital': local_hospital_svg(),
    'local_parking': local_parking_svg(),
    'local_pharmacy': local_pharmacy_svg(),
    'luggage': luggage_svg(),
    'museum': museum_svg(),
    'restaurant': restaurant_svg(),
    'school': school_svg(),
    'sports_handball': sports_handball_svg(),
    'store': store_svg(),
    'train': train_svg(),
    'universal_currency_alt': universal_currency_alt_svg(),
}
// -300 -1260 1560 1560
// <path d="m -46.278793,-739.50038 c -0.119546,-249.77515 165.728493,-515.03832 526.428923,-516.08842 392.86041,-1.1438 528.51077,269.46826 528.84707,519.24315 0.3488,259.06981 -254.78805,473.49828 -382.7069,701.499743 C 519.97666,154.64661 509.30678,296.87227 479.27479,296.44795 444.1137,295.95116 422.98296,153.89016 311.80839,-41.049369 182.8093,-267.24338 -46.156365,-483.7031 -46.278793,-739.50038 Z" style="stroke-width:2.3555" />
for (const k in svgObjects) {
    const svgObj = svgObjects[k]
    svgStrings[k] = createPOIMarker(svgObj.props.children.props.d)
    // console.log(svgStrings[k])
}

export default function usePOIsLayer(map: Map, poisState: POIsStoreState) {
    useEffect(() => {
        removePOIs(map)
        addPOIsLayer(map, poisState.pois)
        return () => {
            removePOIs(map)
        }
    }, [map, poisState.pois])
}

function removePOIs(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:pois'))
        .forEach(l => map.removeLayer(l))
}

function addPOIsLayer(map: Map, pois: POI[]) {
    const features = pois.map((poi, i) => {
        const feature = new Feature({
            geometry: new Point(fromLonLat([poi.coordinate.lng, poi.coordinate.lat])),
        })
        feature.set('gh:marker_props', {icon: poi.icon, poi: poi})
        return feature
    })
    const poisLayer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
    })
    poisLayer.set('gh:pois', true)
    const cachedStyles: { [id: string]: Style } = {}
    poisLayer.setStyle(feature => {
        const props = feature.get('gh:marker_props')
        let style = cachedStyles[props.icon]
        if (style) return style
        style = new Style({
            image: new Icon({
                src: 'data:image/svg+xml;utf8,' + svgStrings[props.icon],
                displacement: [0, 18],
            }),
        })
        cachedStyles[props.icon] = style
        return style
    })
    map.addLayer(poisLayer)
    map.on('click', e => {
        poisLayer.getFeatures(e.pixel).then((features) => {
            if (features.length > 0) {
                const props = features[0].getProperties().get('gh:marker_props')
                props.poi.selected = true
            }
        })
    })
    return poisLayer
}
