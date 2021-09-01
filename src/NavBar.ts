import QueryStore from '@/stores/QueryStore'
import * as QueryUrl from '@/QueryUrl'
import MapOptionsStore from './stores/MapOptionsStore'

export interface AppContext {
    addEventListener(type: string, listener: () => void): void
    readonly location: Location
    readonly history: History
}
export default class NavBar {
    private readonly appContext: AppContext
    private readonly queryStore: QueryStore
    private readonly mapStore: MapOptionsStore
    private isIgnoreQueryStoreUpdates = false

    constructor(appContext: AppContext, queryStore: QueryStore, mapStore: MapOptionsStore) {
        this.appContext = appContext
        appContext.addEventListener('popstate', () => this.parseUrl())
        this.queryStore = queryStore
        this.queryStore.register(() => this.onQueryStateChanged())
        this.mapStore = mapStore
        this.mapStore.register(() => this.onQueryStateChanged())
    }

    parseUrl() {
        this.isIgnoreQueryStoreUpdates = true
        QueryUrl.parseUrl(this.appContext.location.href, this.queryStore.state, this.mapStore.state)
        this.isIgnoreQueryStoreUpdates = false
    }

    private onQueryStateChanged() {
        if (this.isIgnoreQueryStoreUpdates) return

        const newHref = QueryUrl.createUrl(
            this.appContext.location.origin + this.appContext.location.pathname,
            this.queryStore.state,
            this.mapStore.state
        ).toString()

        if (newHref !== this.appContext.location.href)
            this.appContext.history.pushState('last state', '', newHref.toString())
    }
}
