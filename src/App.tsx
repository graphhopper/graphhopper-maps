import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";

// somehow graphhopper client is mounted onto the window object and therefore is available as global variable
// this would be nice to change I guess
require('graphhopper-js-api-client')

const styles = require('./App.css')

interface AppState {
    path?: GHPath
}

interface AppProps {
}

const ghKey = 'fb45b8b2-fdda-4093-ac1a-8b57b4e50add'

export default class App extends React.Component<AppProps, AppState> {

    constructor(props: AppProps) {
        super(props);
        this.state = {
            path: undefined,
        }
    }

    public render() {
        return (
            <div className={styles.appWrapper}>
                <div className={styles.map}>
                    <MapComponent path={this.state.path}
                    />
                </div>
                <div className={styles.sidebar}>
                    <Sidebar onSubmit={(from, to) => this.onRouteRequested(from, to)}
                             path={this.state.path}
                    />
                </div>
            </div>
        )
    }

    private async onRouteRequested(from: [number, number], to: [number, number]) {

        const routing = new GraphHopper.Routing({
            key: ghKey,
            vehicle: 'car',
            elevation: false
        })

        routing.addPoint(new GraphHopper.Input(from[0], from[1]))
        routing.addPoint(new GraphHopper.Input(to[0], to[1]))

        try {
            const result = await routing.doRequest()
            console.log(result)
            if (result.paths.length > 0)
                this.setState({path: result.paths[0]})
        } catch (error) {
            console.error(error)
        }
    }
}