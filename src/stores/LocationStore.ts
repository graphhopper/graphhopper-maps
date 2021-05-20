import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { LocationUpdate } from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'

export interface LocationStoreState {
    coordinate: Coordinate
}

export default class LocationStore extends Store<LocationStoreState> {
    
    protected getInitialState(): LocationStoreState {
        return {
            coordinate: {lat: 0, lng: 0}
        }
    }

    reduce(state: LocationStoreState, action: Action): LocationStoreState {
        if(action instanceof LocationUpdate) {
            return {
                ...state,
                coordinate: action.coordinate,
            }
        }
        return state
    }

    // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car
    public initFake() {
        // TODO randomize a route
        const latlon: number[][] = [
            [51.439291,14.245254],
        [51.438989,14.245405],
        [51.438694,14.245577],
        [51.438668,14.246092],
        [51.438226,14.246972],
        [51.436795,14.24592],
        [51.435029,14.243259],
        [51.435203,14.241006],
        [51.434788,14.238882],
        [51.434146,14.237745],
        [51.433959,14.235985],
        [51.43322,14.234999]]
        var currentIndex: number = 0;
        setInterval(() => {
            Dispatcher.dispatch(new LocationUpdate({lat: latlon[currentIndex][0], lng: latlon[currentIndex][1] }))
            currentIndex++
            currentIndex %= latlon.length
        }, 3000);
    }
}
