import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";
import {getRouteStore} from "@/stores/Stores";
import {RouteStoreState} from "@/stores/RouteStore";

const styles = require('./App.css')

interface AppState {
    routingResult: RouteStoreState
}

interface AppProps {
}

export default class App extends React.Component<AppProps, AppState> {

    private routeStore = getRouteStore()

    constructor(props: AppProps) {
        super(props);
        this.routeStore.register(() => this.setState({routingResult: this.routeStore.state}))
        this.state = {
            routingResult: this.routeStore.state
        }
    }

    public async componentDidMount() {

        // TODO build this in later again
      //  const infoResult = await info(ghKey)
      //  this.setState({info: infoResult, bbox: infoResult.bbox})

    }

    public render() {
        const path = this.routeStore.state.selectedPath
        return (
            <div className={styles.appWrapper}>
                <div className={styles.map}>
                    <MapComponent points={path.points} bbox={path.bbox}/>
                </div>
                <div className={styles.sidebar}>
                    <Sidebar instructions={path.instructions} version="Put the version back in"
                    />
                </div>
            </div>
        )
    }
}