import React, {Component} from 'react'
import {Instruction, RoutingArgs} from "@/routing/Api";
import {getQueryStore, getRouteStore} from "@/stores/Stores";
import {RouteStoreState} from "@/stores/RouteStore";

const styles = require('./Sidebar.css')

interface SidebarState {
    query: RoutingArgs
    routeState: RouteStoreState
}

export default class Sidebar extends Component<{ } , SidebarState> {

    private queryStore = getQueryStore()
    private routeStore = getRouteStore()

    constructor(props: { }) {
        super(props);

        this.queryStore.register(() => this.setState({query: this.queryStore.state }))
        this.routeStore.register(() => this.setState({routeState: this.routeStore.state}))
        this.state = {
            query : this.queryStore.state,
            routeState: this.routeStore.state
        }
    }

    public render() {
        return (
            <div className={styles.sidebar}>
                <h1>Directions</h1>
                <SearchBox points={this.queryStore.state.points}/>
                <Instructions instructions={this.state.routeState.selectedPath.instructions}/>
            </div>
        )
    }
}

interface SearchBoxProps {
    readonly points: ReadonlyArray<[number, number]>
}

const SearchBox = (props: SearchBoxProps) => {

    if (props.points.length > 2) throw Error('only 0, 1 or two points implemented yet.')

    const from = props.points.length > 0 ? convertToText(props.points[0]) : 'Click on the map to select a start'
    const to = props.points.length > 1 ? convertToText(props.points[1]) : 'Click on the map again to select destination'

    return (<div className={styles.serachBox}>
        <label>From</label>
        <input type="text" readOnly={true} value={from}/>
        <label>To</label>
        <input type="text" readOnly={true} value={to}/>
    </div>)
}

const Instructions = (props: { instructions: Instruction[] }) => (
    <ul>
        {props.instructions.map((instruction, i) => <li key={i}>{instruction.text}</li>)}
    </ul>
)

function convertToText(coord: [number, number]) {
    return coord[0] + ', ' + coord[1]
}
