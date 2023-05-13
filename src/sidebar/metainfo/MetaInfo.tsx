import { Info } from "@/api/graphhopper";
import styles from '@/sidebar/metainfo/MetaInfo.module.css'
import { tr } from '@/translation/Translation'

export default function (props: { info: Info }) {
    return (
        <li className={styles.MetaInfoUpperList}>
            <ul className={styles.MetaInfoList}>
                <li>{tr('data_import_date')}: {props.info.data_import_date}</li>
                {props.info.data_source_date && <li>{tr('data_source_date')}: {props.info.data_source_date}</li>}
            </ul>
        </li>
    )
}
