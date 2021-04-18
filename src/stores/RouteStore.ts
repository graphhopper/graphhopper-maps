import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ClearRoute, RouteRequestSuccess, SetPoint, SetSelectedPath, LocationUpdate } from '@/actions/Actions'
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
    private audioCtx : AudioContext
    private source?: AudioBufferSourceNode

    constructor(queryStore: QueryStore) {
        super()
        this.queryStore = queryStore

        window.AudioContext = window.AudioContext; // || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
    }

    startNavigation(currentLocationStore: CurrentLocationStore) {
        // user clicked and we play a sound. The click "confirms" our audioCtx from the user (at least I think this is why this works without confirmation dialog)
        // Instead of AudioContext we could use the simpler looking solution via HTMLMediaElement in combination with
        // element.src = URL.createObjectURL(request.response) but I'm unsure how to make it permanently active on mobile
        // (we could still connect AudioContext with an audio control)
        this.synthesize("Willkommen")
        currentLocationStore.init();
    }

    synthesize(text: string) {
        // we need a better caching here that does not leak over time and also avoids errors like:
        // "Error decoding file DOMException: The buffer passed to decodeAudioData contains an unknown content type."
        // because otherwise the audio for this instruction would be broken forever
        const url = 'https://navi.graphhopper.org:5002/api/tts?text=' + encodeURIComponent(text);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            this.initSound(xhr.response);
        };
        xhr.send();
    }

    private async initSound(blob: any) {
        const arrayBuffer = await blob.arrayBuffer()
        this.audioCtx.decodeAudioData(arrayBuffer, (audioData: any) => {
            this.playSound(audioData)
        }, function(e: any) {
            console.log('Error decoding file', e);
        });
    }

    private playSound(audioBuffer: any) {
        if(this.source)
            this.source.stop();

        // this would skip too many stuff
        // this.source.onended = (event) => { console.log("sound ENDED"); this.playSoundInProgress = false; }

        // the source needs to be freshly created otherwise we get: Cannot set the buffer attribute of an AudioBufferSourceNode with an AudioBuffer more than once
        this.source = this.audioCtx.createBufferSource();
        this.source.buffer = audioBuffer;
        this.source.loop = false;
        this.source.connect(this.audioCtx.destination);
        this.source.start();
    }

    reduce(state: RouteStoreState, action: Action): RouteStoreState {
        if (action instanceof LocationUpdate) {
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

            // TODO marker on map
            if(smallestDist < 500) {
                if(state.lastInstruction.index == closeIndex) {
                    console.log("Instruction already spoken: " + instructions[closeIndex].text)
                } else {
                    this.synthesize("In " + distanceNext + " Metern " + instructions[closeIndex].text)
                    return {
                        ...state,
                        lastInstruction: { text: instructions[closeIndex].text, index: closeIndex }
                    }
                }

            } else {
                this.synthesize("Vom Weeg abgekommen.")
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
