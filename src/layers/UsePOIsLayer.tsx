import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Icon, Style } from 'ol/style'
import { POI, POIsStoreState } from '@/stores/POIsStore'

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
import home_and_garden from '/src/pois/img/home_and_garden.svg'
import universal_currency_alt_svg from '/src/pois/img/universal_currency_alt.svg'
import local_atm from '/src/pois/img/local_atm.svg'
import local_gas_station from '/src/pois/img/local_gas_station.svg'
import local_post_office from '/src/pois/img/local_post_office.svg'
import police from '/src/pois/img/police.svg'
import charger from '/src/pois/img/charger.svg'
import water_drop from '../pois/img/water_drop.svg'
import { createPOIMarker } from '@/layers/createMarkerSVG'
import { Select } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SelectPOI } from '@/actions/Actions'

const svgStrings: { [id: string]: string } = {}

const svgObjects: { [id: string]: any } = {
    flight_takeoff: flight_takeoff_svg(),
    hotel: hotel_svg(),
    local_hospital: local_hospital_svg(),
    local_parking: local_parking_svg(),
    local_pharmacy: local_pharmacy_svg(),
    luggage: luggage_svg(),
    museum: museum_svg(),
    restaurant: restaurant_svg(),
    school: school_svg(),
    sports_handball: sports_handball_svg(),
    store: store_svg(),
    train: train_svg(),
    universal_currency_alt: universal_currency_alt_svg(),
    home_and_garden: home_and_garden(),
    local_atm: local_atm(),
    local_gas_station: local_gas_station(),
    local_post_office: local_post_office(),
    police: police(),
    charger: charger(),
    water_drop: water_drop(),
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
        const select = addPOISelection(map)
        return () => {
            removePOIs(map)
            map.removeInteraction(select)
        }
    }, [map, poisState.pois])
}

function removePOIs(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:pois'))
        .forEach(l => map.removeLayer(l))
}

function addPOISelection(map: Map) {
    const select = new Select()
    map.addInteraction(select)
    select.on('select', event => {
        const selectedFeatures = event.selected
        if (selectedFeatures.length > 0) {
            const feature = selectedFeatures[0]
            const props = feature.get('gh:marker_props')
            feature.setStyle(
                new Style({
                    zIndex: 2,
                    image: new Icon({
                        scale: [1.4, 1.4],
                        src: 'data:image/svg+xml;utf8,' + svgStrings[props.icon],
                        displacement: [0, 18],
                    }),
                })
            )
            Dispatcher.dispatch(new SelectPOI(props.poi))
        } else Dispatcher.dispatch(new SelectPOI(null))
    })
    return select
}

function addPOIsLayer(map: Map, pois: POI[]) {
    const features = pois.map((poi, i) => {
        const feature = new Feature({
            geometry: new Point(fromLonLat([poi.coordinate.lng, poi.coordinate.lat])),
        })
        feature.set('gh:marker_props', { icon: poi.icon, poi: poi })
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
    return poisLayer
}
