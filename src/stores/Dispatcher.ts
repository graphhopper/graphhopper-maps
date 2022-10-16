// move this declarations somewhere else
export interface Action {
    // so far a marker interface
}

export interface ActionReceiver {
    receive(action: Action): void
}

export interface NotifyStateChanged {
    register(callback: () => void): void
}

class Dispatcher {
    private receivers: ActionReceiver[] = []
    private isDispatching = false

    constructor() {}

    public dispatch(action: Action) {
        if (this.isDispatching) {
            console.error("No calls to 'dispatch' allowed while another dispatch is ongoing.")
        }
        this.isDispatching = true
        this.receivers.forEach(receiver => receiver.receive(action))
        this.isDispatching = false
    }

    public register(receiver: ActionReceiver) {
        this.receivers.push(receiver)
    }

    public clear() {
        this.receivers = []
    }
}

export default new Dispatcher()
