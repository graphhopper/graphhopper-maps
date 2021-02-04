import React, {Component, useState} from 'react'
import {InfoResult, Instruction, Path, RoutingArgs} from "@/routing/Api";
import {getApiInfoStore, getQueryStore, getRouteStore} from "@/stores/Stores";
import {RouteStoreState} from "@/stores/RouteStore";

const styles = require('./Sidebar.css')

interface SidebarState {
    query: RoutingArgs
    routeState: RouteStoreState
    infoState: InfoResult
}

export default class Sidebar extends Component<{}, SidebarState> {

    private queryStore = getQueryStore()
    private routeStore = getRouteStore()
    private infoStore = getApiInfoStore()

    constructor(props: {}) {
        super(props);

        this.queryStore.register(() => this.setState({query: this.queryStore.state}))
        this.routeStore.register(() => this.setState({routeState: this.routeStore.state}))
        this.infoStore.register(() => this.setState({infoState: this.infoStore.state}))
        this.state = {
            query: this.queryStore.state,
            routeState: this.routeStore.state,
            infoState: this.infoStore.state
        }
    }

    public render() {
        return (
            <div className={styles.sidebar}>
                <SearchBox points={this.queryStore.state.points}/>
                {
                    /*
                    <Instructions instructions={this.state.routeState.selectedPath.instructions}/>
                     */
                }
                <QueryResults paths={this.routeStore.state.routingResult.paths}/>

            </div>
        )
    }
}

interface SearchBoxProps {
    readonly points: ReadonlyArray<[number, number]>
}

const SearchBox = (props: SearchBoxProps) => {

    if (props.points.length > 2) throw Error('only 0, 1 or two points implemented yet.')

    const from = props.points.length > 0 ? coordinateToText(props.points[0]) : ''//'Click on the map to select a start'
    const to = props.points.length > 1 ? coordinateToText(props.points[1]) : ''

    return (<div className={styles.serachBox}>
        <input type="text" className={styles.serachBoxInput} readOnly={true} value={from}
               placeholder={"Click on the map to select a start"}/>
        <input type="text" className={styles.serachBoxInput} readOnly={true} value={to}
               placeholder={"Click on the map again to select destination"}/>
    </div>)
}

const QueryResults = (props: { paths: Path[] }) => (
    <ul className={styles.resultList}>
        {props.paths.map(path => <li><QueryResult path={path}/></li>)}
    </ul>
)

const QueryResult = (props: { path: Path }) => {

    const [isExpanded, setExpanded] = useState(false)

    return (

        <div className={styles.resultRow}>
            <div className={styles.resultSummary}>
                <div className={styles.resultValues}>
                    <span>{props.path.distance / 1000}km</span>
                    <span>{milliSecondsToText(props.path.time)}</span>
                </div>
                <button className={styles.resultExpandDirections} onClick={() => setExpanded(!isExpanded)}>Details
                </button>
            </div>
            {isExpanded && <Instructions instructions={props.path.instructions}/>}
        </div>
    )
}

const Instructions = (props: { instructions: Instruction[] }) => (
    <ul>
        {props.instructions.map((instruction, i) => <li key={i}>{instruction.text}</li>)}
    </ul>
)

function coordinateToText(coord: [number, number]) {
    return coord[0] + ', ' + coord[1]
}

function milliSecondsToText(seconds: number) {
    const hours = Math.floor(seconds / 3600000)
    const minutes = Math.floor(seconds % 3600000 / 60000)

    const hourText = hours > 0 ? hours + 'h' : ''
    return hourText + ' ' + minutes + 'min'
}
