import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";
import route, {info, InfoResult, Path} from "@/routing/Api";

// somehow graphhopper client is mounted onto the window object and therefore is available as global variable
// this would be nice to change I guess
require('graphhopper-js-api-client')

const styles = require('./App.css')

interface AppState {
    path: Path,
    info: InfoResult
    bbox: [number, number, number, number]
}

interface AppProps {
}

const ghKey = 'fb45b8b2-fdda-4093-ac1a-8b57b4e50add'

export default class App extends React.Component<AppProps, AppState> {

    constructor(props: AppProps) {
        super(props);
        this.state = {
            path: {
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
            },
            info: {
                bbox: [0,0,0,0],
                build_date: "",
                features: {},
                version: ""
            },
            bbox: [0,0,0,0]
        }
    }

    public async componentDidMount() {

        const infoResult = await info(ghKey)
        this.setState({info: infoResult, bbox: infoResult.bbox})

    }

    public render() {
        return (
            <div className={styles.appWrapper}>
                <div className={styles.map}>
                    <MapComponent points={this.state.path.points} bbox={this.state.bbox}/>
                </div>
                <div className={styles.sidebar}>
                    <Sidebar onSubmit={(from, to) => this.onRouteRequested(from, to)}
                             instructions={this.state.path.instructions} version={this.state.info.version}
                    />
                </div>
            </div>
        )
    }

    private async onRouteRequested(from: [number, number], to: [number, number]) {

        const result = await route({
            key: ghKey,
            points: [from, to],
            points_encoded: false,
            method: 'GET'
        })

        if (result.paths[0].bbox)
            this.setState({bbox: result.paths[0].bbox})
        this.setState({path: result.paths[0]})
    }
}