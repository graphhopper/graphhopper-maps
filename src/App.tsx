import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";
import {doRequest, Path} from "@/routing/Api";

// somehow graphhopper client is mounted onto the window object and therefore is available as global variable
// this would be nice to change I guess
require('graphhopper-js-api-client')

const styles = require('./App.css')

interface AppState {
    path: Path
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
                }
            },
        }
    }

    public render() {
        return (
            <div className={styles.appWrapper}>
                <div className={styles.map}>
                    <MapComponent points={this.state.path.points} bbox={this.state.path.bbox}/>
                </div>
                <div className={styles.sidebar}>
                    <Sidebar onSubmit={(from, to) => this.onRouteRequested(from, to)}
                             instructions={this.state.path.instructions}
                    />
                </div>
            </div>
        )
    }

    private async onRouteRequested(from: [number, number], to: [number, number]) {

        const result = await doRequest({
            key: ghKey,
            points: [from, to]
        })

        this.setState({path: result.paths[0]})
    }
}