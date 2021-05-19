import React from 'react'
import { QueryStoreState } from '@/stores/QueryStore'
import Search from '@/sidebar/search/Search'
import styles from '@/sidebar/Sidebar.module.css'
import { ApiInfo } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import ErrorMessage from '@/sidebar/ErrorMessage'

type SidebarProps = {
    query: QueryStoreState
    info: ApiInfo
    error: ErrorStoreState
}

export default function ({ query, info, error }: SidebarProps) {
    return (
        <div className={styles.sidebar}>
            <div>
                <Search
                    points={query.queryPoints}
                    routingProfiles={info.profiles}
                    selectedProfile={query.routingProfile}
                />
            </div>
            {!error.isDismissed && <ErrorMessage error={error} />}
        </div>
    )
}
