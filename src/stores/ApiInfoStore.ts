import {InfoResult} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export class InfoReceived implements Action {
    readonly result: InfoResult

    constructor(result: InfoResult) {
        this.result = result
    }
}

export default class ApiInfoStore extends Store<InfoResult> {
    protected getInitialState(): InfoResult {
        return {
            version: '',
            bbox: [0,0,0,0],
            features: '',
            import_date: ''
        };
    }

    protected reduce(state: InfoResult, action: Action): InfoResult {

        if (action instanceof InfoReceived) {
            return action.result
        }
        return state
    }

}