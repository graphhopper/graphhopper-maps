import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import { ClearRoute, RouteRequestSuccess, SetPoint, SetSelectedPath, LocationUpdate, SpeakText } from '@/actions/Actions'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { Translation } from '@/Translation'

import QueryStore, { RequestState } from '@/stores/QueryStore'
import CurrentLocationStore from '@/stores/CurrentLocationStore'
import { Path, RoutingArgs, RoutingResult } from '@/api/graphhopper'

export interface RouteStoreState {
    routingResult: RoutingResult
    selectedPath: Path
    lastInstruction: { text: string, index: number }
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
    private readonly translation: Translation

    constructor(queryStore: QueryStore, translation: Translation) {
        super();
        this.queryStore = queryStore;
        this.translation = translation;
    }

    startNavigation(currentLocationStore: CurrentLocationStore) {
        Dispatcher.dispatch(new SpeakText(this.translation.tr("welcome")))
        currentLocationStore.init()
    }

    reduce(state: RouteStoreState, action: Action): RouteStoreState {
        if (action instanceof LocationUpdate) {
            console.log("NOW LocationUpdate ", action)
            const instructions = state.selectedPath.instructions
            var closeIndex = -1
            var smallestDist = Number.MAX_VALUE
            var distanceNext = 10.0
            // find instruction nearby and very simple method (pick first point)
            for(var instrIdx = 0; instrIdx < instructions.length; instrIdx++) {
                const points: number[][] = instructions[instrIdx].points;

                for(var pIdx = 0; pIdx < points.length; pIdx++) {
                    const p: number[] = points[pIdx]
                    const dist = CurrentLocationStore.distCalc(p[1], p[0], action.coordinate.lat, action.coordinate.lng)
                    if( dist < smallestDist) {
                        smallestDist = dist
                        // use next instruction or finish
                        closeIndex = instrIdx + 1 < instructions.length ? instrIdx + 1 : instrIdx

                        const last: number[] = points[points.length - 1]
                        distanceNext = Math.round(CurrentLocationStore.distCalc(last[1], last[0], action.coordinate.lat, action.coordinate.lng))
                    }
                }
            }

            console.log("smallestDist:" + smallestDist + ", old: " + state.lastInstruction.text + " vs current instruction: " + instructions[closeIndex].text)
            // TODO marker on map
            if(smallestDist < 500) {
                if(state.lastInstruction.index == closeIndex) {
                    console.log("Instruction already spoken: " + instructions[closeIndex].text)
                } else {
                    Dispatcher.dispatch(new SpeakText(this.translation.tr("in_x_meters", [""+distanceNext, instructions[closeIndex].text])))
                    return {
                        ...state,
                        lastInstruction: { text: instructions[closeIndex].text, index: closeIndex }
                    }
                }

            } else {
                Dispatcher.dispatch(new SpeakText(this.translation.tr("too_far_away")))
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
            lastInstruction: { text: '', index: -1 }
        }
    }

    private reduceRouteReceived(state: RouteStoreState, action: RouteRequestSuccess) {
        if (this.isStaleRequest(action.request)) return state

        if (RouteStore.containsPaths(action.result.paths)) {
            return {
                routingResult: action.result,
                selectedPath: action.result.paths[0],
                lastInstruction: { text: '', index: -1 }
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
