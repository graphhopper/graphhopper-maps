import { Action, ActionReceiver, NotifyStateChanged } from '@/stores/Dispatcher'

export default abstract class Store<TState> implements ActionReceiver, NotifyStateChanged {
    private _subscriptions: { (): void }[] = []

    protected constructor(initialState: TState) {
        this._state = initialState
    }

    private _state: TState

    public get state() {
        return this._state
    }

    receive(action: Action): void {
        const result = this.reduce(this._state, action)

        // make a shallow compare. Maybe change this later?
        if (result !== this._state) {
            this.setState(result)
        }
    }

    register(callback: () => void): void {
        this._subscriptions.push(callback)
    }

    deregister(callback: () => void): void {
        this._subscriptions = this._subscriptions.filter(s => s !== callback)
    }

    abstract reduce(state: TState, action: Action): TState

    private setState(value: TState) {
        this._state = value
        this.notifyChanged()
    }

    private notifyChanged() {
        this._subscriptions.forEach(f => f())
    }
}
