import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
// todonow: this belongs to this app and we should not take it from the demo...
import 'custom-model-editor/demo/style.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import React, { useEffect, useRef, useState } from 'react'
import { create } from 'custom-model-editor/src/index'
import { CustomModel } from '@/stores/QueryStore'
import { ApiInfo } from '@/api/graphhopper'

export interface CustomModelBoxProps {
    model: CustomModel
    // todo: maybe just the encoded values here ...
    info: ApiInfo
}

export default function CustomModelBox({ model, info }: CustomModelBoxProps) {
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const divElement = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        // start with empty categories, will be set via /info
        const ed = create({}, (element: any) => divElement.current?.appendChild(element))
        ed.cm.setSize('100%', '100%')
        ed.value = JSON.stringify(model, null, 2)
        setEditor(ed)
    }, [])

    useEffect(() => {
        // todo: is this needed or is there a better way?
        if (!editor)
            return
        // todo: maybe do this 'conversion' in Api.ts already and use types from there on
        const categories : any = {}
        Object.keys(info.encoded_values).forEach((k : any) => {
            const v : any = info.encoded_values[k]
            if (v.length == 2 && v[0] === 'true' && v[1] === 'false') {
                categories[k] = { type: 'boolean' }
            } else if (v.length === 2 && v[0] === '>number' && v[1] === '<number') {
                categories[k] = { type: 'numeric' }
            } else {
                categories[k] = { type: 'enum', values: v.sort() }
            }
        })
        editor.categories = categories
    }, [info])

    useEffect(() => {
        if (editor) editor.value = JSON.stringify(model, null, 2)
    }, [model])
    return <div ref={divElement} className={styles.customModelBox} />
}
