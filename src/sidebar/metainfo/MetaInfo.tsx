import { Info } from "@/api/graphhopper";
import styles from '@/sidebar/metainfo/MetaInfo.module.css'
import { tr } from '@/translation/Translation'

export default function (props: { info: Info }) {
    return (
        <li className={styles.MetaInfoUpperList}>
            <ul className={styles.MetaInfoList}>
                <li>{tr('road_data_timestamp')}: {props.info.road_data_timestamp}</li>
            </ul>
        </li>
    )
}
