import ViewportStore, { ViewportStoreState } from '../../src/stores/ViewportStore'
import { PathDetailsRangeSelected, RouteRequestSuccess, SetViewportToPoint } from '../../src/actions/Actions'

describe('ViewportStore', () => {
    it('should update state correctly', () => {
        const routeStore = {} as any
        const store = new ViewportStore(routeStore, [-180, -90, 180, 90], () => false)
        const initialState: ViewportStoreState = {
            longitude: 10,
            latitude: 45,
            zoom: 8,
            width: 1400,
            height: 1000,
        }
        {
            // simply set to point
            const newState = store.reduce(initialState, new SetViewportToPoint({ lng: 13, lat: 48 }, 11))
            expect(newState.longitude).toEqual(13)
            expect(newState.latitude).toEqual(48)
            expect(newState.zoom).toEqual(11)
        }
        {
            // set to route ...
            const selectedPath = { bbox: [10.31, 50.73, 11.19, 51.31] }
            routeStore.state = { selectedPath }
            let state = store.reduce(
                initialState,
                new RouteRequestSuccess(
                    null as any,
                    {
                        paths: [selectedPath],
                    } as any
                )
            )
            expect(state.longitude).toBeCloseTo(10.5, 1)
            expect(state.latitude).toBeCloseTo(50.9, 1)
            expect(state.zoom).toBeCloseTo(8.8, 1)
            // ... select path details
            state = store.reduce(state, new PathDetailsRangeSelected([10.46, 50.88, 10.47, 50.9]))
            expect(state.longitude).toBeCloseTo(10.46, 2)
            expect(state.latitude).toBeCloseTo(50.89, 2)
            expect(state.zoom).toBeCloseTo(13.7, 1)
            // ... deselect path details again -> we are back to the route bbox
            state = store.reduce(state, new PathDetailsRangeSelected(null))
            expect(state.longitude).toBeCloseTo(10.5, 1)
            expect(state.latitude).toBeCloseTo(50.9, 1)
            expect(state.zoom).toBeCloseTo(8.8, 1)
        }
    })
})
