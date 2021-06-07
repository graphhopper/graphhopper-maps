import QueryStore from '@/stores/QueryStore'
import * as QueryUrl from '@/QueryUrl'

export interface AppContext {
    addEventListener(type: string, listener: () => void): void
    readonly location: Location
    readonly history: History
}
export default class NavBar {
    private readonly queryStore: QueryStore
    private readonly appContext: AppContext
    private isIgnoreQueryStoreUpdates = false

    constructor(queryStore: QueryStore, appContext: AppContext) {
        this.queryStore = queryStore
        this.queryStore.register(() => this.onQueryStoreChanged())
        this.appContext = appContext
        appContext.addEventListener('popstate', () => this.parseUrl())
    }

    parseUrl() {
        this.isIgnoreQueryStoreUpdates = true
        QueryUrl.parseUrl(this.appContext.location.href, this.queryStore.state)
        this.isIgnoreQueryStoreUpdates = false
    }

    private onQueryStoreChanged() {
        if (this.isIgnoreQueryStoreUpdates) return

        const newHref = QueryUrl.createUrl(
            this.appContext.location.origin + this.appContext.location.pathname,
            this.queryStore.state
        ).toString()

        if (newHref !== this.appContext.location.href)
            this.appContext.history.pushState('last state', '', newHref.toString())
    }
}
