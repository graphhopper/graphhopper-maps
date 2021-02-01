import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";
import {getQueryStore, getRouteStore} from "@/stores/Stores";
import {RouteStoreState} from "@/stores/RouteStore";
import {RoutingArgs} from "@/routing/Api";

const styles = require('./App.css')

interface AppState {
    routingResult: RouteStoreState
    queryState: RoutingArgs
}

interface AppProps {
}

export default class App extends React.Component<AppProps, AppState> {

    private routeStore = getRouteStore()
    private queryStore = getQueryStore()

    constructor(props: AppProps) {
        super(props);
        this.routeStore.register(() => this.setState({routingResult: this.routeStore.state}))
        this.queryStore.register(() => this.setState({queryState: this.queryStore.state}))
        this.state = {
            routingResult: this.routeStore.state,
            queryState: this.queryStore.state
        }
    }

    public async componentDidMount() {

        // TODO build this in later again
      //  const infoResult = await info(ghKey)
      //  this.setState({info: infoResult, bbox: infoResult.bbox})

    }

    public render() {
        const path = this.routeStore.state.selectedPath

        // it is stupid to copy the readonly array here, because typescript doesn't recognize the points prop being readonly
        // make points in state mutable if this copy is required and the whole point of readonly no longer is respected
        const points = Array.from(this.queryStore.state.points)
        return (
            <div className={styles.appWrapper}>
                <div className={styles.map}>
                    <MapComponent route={path.points} points={points} bbox={path.bbox}/>
                </div>
                <div className={styles.sidebar}>
                    <Sidebar instructions={path.instructions} version="Put the version back in"
                    />
                </div>
            </div>
        )
    }
}