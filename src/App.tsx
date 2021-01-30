import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";
import {Path, RoutingResult} from "@/routing/Api";
import {getRouteStore} from "@/stores/Stores";

const styles = require('./App.css')

interface AppState {
    routingResult: RoutingResult
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
        const path = this.routeStore.state.paths.length > 0 ? this.routeStore.state.paths[0] : App.getEmptyPath()
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

    private static getEmptyPath(): Path {
        return {
            bbox: [0, 0, 0, 0],
                instructions: [],
                points: {
                coordinates: [],
                    type: "",
            },
            points_encoded: false,
                snapped_waypoints: {
                type: "",
                    coordinates: []
            },
            ascend: 0,
                descend: 0,
                details: {
                max_speed: [],
                    street_name: [],
                    toll: []
            },
            distance: 0,
                points_order: [],
                time: 0
        }
    }
}