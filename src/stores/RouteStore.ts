import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ClearRoute, RouteRequestSuccess, SetPoint, SetSelectedPath, SetNavigationStart } from '@/actions/Actions'
import QueryStore, { RequestState } from '@/stores/QueryStore'
import CurrentLocationStore from '@/stores/CurrentLocationStore'
import { Path, RoutingArgs, RoutingResult } from '@/api/graphhopper'

export interface RouteStoreState {
    routingResult: RoutingResult
    selectedPath: Path
}

export default class RouteStore extends Store<RouteStoreState> {
    private static getEmptyPath(): Path {
        return {
            bbox: [0, 0, 0, 0],
            instructions: [],
            points: {
                coordinates: [],
                type: 'LineString',
            },
            points_encoded: false,
            snapped_waypoints: {
                type: 'LineString',
                coordinates: [],
            },
            ascend: 0,
            descend: 0,
            details: {
                max_speed: [],
                street_name: [],
                toll: [],
            },
            distance: 0,
            points_order: [],
            time: 0,
        }
    }

    private readonly queryStore: QueryStore

    constructor(queryStore: QueryStore) {
        super()
        this.queryStore = queryStore
    }

    ajax(url: string, success: (url: string) => void) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'blob';
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        request.onload = () => {
            if (request.readyState === 4) {
                const url = window.URL.createObjectURL(request.response);
                success(url);
            }
        }
        request.send();
    }

    // const audio = document.getElementById("audio") as HTMLMediaElement;
    synthesize(text: string) {
       this.ajax('http://157.90.156.93:5002/api/tts?text=' + encodeURIComponent(text), (url: string) => {
            // audio.src = url;
            const audio = new Audio(url);
            audio.play();
       })
    }

    reduce(state: RouteStoreState, action: Action): RouteStoreState {
        if (action instanceof SetNavigationStart) {
            const instructions = state.selectedPath.instructions
            var closeIndex = -1
            var smallestDist = 2000
            var distanceNext = 10.0
            // find instruction nearby and very simple method (pick first point)
            for(var i = 0; i < instructions.length; i++) {
                const points: number[][] = instructions[i].points;
                const p: number[] = points[0]
                const dist = CurrentLocationStore.distCalc(p[1], p[0], action.coordinate.lat, action.coordinate.lng)
                if( dist < smallestDist) {
                    smallestDist = dist
                    closeIndex = i

                    const last: number[] = points[points.length - 1]
                    distanceNext = Math.round(CurrentLocationStore.distCalc(last[1], last[0], action.coordinate.lat, action.coordinate.lng))
                }
            }

            // TODO marker on map
            if(smallestDist < 500) {
                this.synthesize("In " + distanceNext + " Metern " + instructions[closeIndex].text)

            } else if (closeIndex > 0) {
                this.synthesize("Vom Weeg abgekommen.")
            } else {
                this.synthesize("Windows Ausnahmefehler.")
            }

        } else if (action instanceof RouteRequestSuccess) {
            return this.reduceRouteReceived(state, action)
        } else if (action instanceof SetSelectedPath) {
            return {
                ...state,
                selectedPath: action.path,
            }
        } else if (action instanceof SetPoint || action instanceof ClearRoute) {
            return this.getInitialState()
        }
        return state
    }

    protected getInitialState(): RouteStoreState {
        return {
            routingResult: {
                paths: [],
                info: {
                    copyright: [],
                    took: 0,
                },
            },
            selectedPath: RouteStore.getEmptyPath(),
        }
    }

    private reduceRouteReceived(state: RouteStoreState, action: RouteRequestSuccess) {
        if (this.isStaleRequest(action.request)) return state

        if (RouteStore.containsPaths(action.result.paths)) {
            return {
                routingResult: action.result,
                selectedPath: action.result.paths[0],
            }
        }
        return this.getInitialState()
    }

    private isStaleRequest(request: RoutingArgs) {
        // this could be probably written less tedious...
        const subRequests = this.queryStore.state.currentRequest.subRequests
        let requestIndex = -1
        let mostRecentAndFinishedIndex = -1
        for (let i = 0; i < subRequests.length; i++) {
            const element = subRequests[i]
            if (element.args === request) {
                requestIndex = i
            }
            if (element.state === RequestState.SUCCESS) {
                mostRecentAndFinishedIndex = i
            }
        }

        return requestIndex < 0 && requestIndex < mostRecentAndFinishedIndex
    }

    private static containsPaths(paths: Path[]) {
        return paths.length > 0
    }
}
