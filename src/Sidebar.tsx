import React, {Component} from 'react'
import {Instruction} from "@/routing/Api";

const styles = require('./Sidebar.css')

export interface SidebarProps {
    onSubmit: (from: [number, number], to: [number, number]) => void
    instructions: Instruction[]
}

interface SidebarState {
    from: [number, number],
    to: [number, number]
}

export default class Sidebar extends Component<SidebarProps, SidebarState> {

    constructor(props: SidebarProps) {
        super(props);
        this.state = {
            from: [47.400905, 8.534317],
            to: [47.394108, 8.538265]
        }
    }


    public render() {
        return (
            <div className={styles.sidebar}>
                <h1>Directions</h1>
                <label>From</label>
                <input type="text" value={Sidebar.convertToText(this.state.from)}
                       onChange={e => this.handleFromChanged(e.target.value)}/>
                <label>To</label>
                <input type="text" value={Sidebar.convertToText(this.state.to)}
                       onChange={e => this.handleToChanged(e.target.value)}/>
                <button onClick={() => this.props.onSubmit(this.state.from, this.state.to)}>Go!</button>
                <Instructions instructions={this.props.instructions}/>
            </div>
        )
    }

    private handleFromChanged(value: string) {
        const coord = Sidebar.convertToCoord(value)
        this.setState({
            from: coord
        })
    }

    private handleToChanged(value: string) {
        const coord = Sidebar.convertToCoord(value)
        this.setState({
            to: coord
        })
    }

    private static convertToText(coord: [number, number]) {
        return coord[0] + ', ' + coord[1]
    }

    private static convertToCoord(text: string) {

        // this only works as a showcase since it is not doing any validation
        return text.split(',')
            .map(value => value.trim())
            .map(value => Number.parseFloat(value)) as [number, number]
    }
}
const Instructions = (props: { instructions: Instruction[] }) => (
    <ul>
        {props.instructions.map((instruction, i) => <li key={i}>{instruction.text}</li>)}
    </ul>
)