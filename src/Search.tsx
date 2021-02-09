import React from "react";
import Dispatcher from "@/stores/Dispatcher";
import {ClearGeocodingResults, QueryAddress, QueryPoint} from "@/stores/QueryStore";

const styles = require('./Search.css')

export default function Search({points}: { points: QueryPoint[] }) {

    //const [from, setFrom] = useState('')
    //const [to, setTo] = useState('')

    if (points.length !== 2) throw new Error("only from and to points are supported yet.")

    return (<div className={styles.serachBox}>
        <input type="text" className={styles.serachBoxInput} value={points[0].queryString}
               placeholder={"Click on the map to select a start"}
               onChange={e => {
                   Dispatcher.dispatch(new QueryAddress(e.target.value, 0))
               }}
               onBlur={() => Dispatcher.dispatch(new ClearGeocodingResults())}
        />
        <input type="text" className={styles.serachBoxInput} value={points[1].queryString}
               placeholder={"Click on the map again to select destination"}
               onChange={e => {
                   Dispatcher.dispatch(new QueryAddress(e.target.value, 1))
               }}
               onBlur={() => Dispatcher.dispatch(new ClearGeocodingResults())}
        />
    </div>)
}
