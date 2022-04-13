import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
// todonow: this belongs to this app and we should not take it from the demo...
import 'custom-model-editor/demo/style.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import React, { useEffect, useRef, useState } from 'react'
import { create } from 'custom-model-editor/src/index'
import Dispatcher from '@/stores/Dispatcher'
import { DismissLastError, ErrorAction, SetCustomModel, SetCustomModelBoxEnabled } from '@/actions/Actions'
import { CustomModel } from '@/stores/QueryStore'

const initialCustomModel: CustomModel = {
    speed: [],
    priority: [],
}

export interface CustomModelBoxProps {
    enabled: boolean
    encodedValues: object[]
}

export default function CustomModelBox({ enabled, encodedValues }: CustomModelBoxProps) {
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const divElement = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        // we start with empty categories. they will be set later using info
        const instance = create({}, (element: Node) => divElement.current?.appendChild(element))
        instance.value = JSON.stringify(initialCustomModel, null, 2)
        setEditor(instance)
        instance.validListener = (valid: boolean) => {
            if (valid) {
                Dispatcher.dispatch(new SetCustomModel(instance.jsonObj, true))
                Dispatcher.dispatch(new DismissLastError())
            } else {
                try {
                    const customModel = JSON.parse(instance.value)
                    Dispatcher.dispatch(new SetCustomModel(customModel, false))
                    Dispatcher.dispatch(new ErrorAction('Invalid custom model'))
                } catch (e) {
                    Dispatcher.dispatch(new ErrorAction('Cannot parse custom model'))
                    Dispatcher.dispatch(new SetCustomModel(null, false))
                }
            }
        }
        Dispatcher.dispatch(new SetCustomModel(initialCustomModel, true))
    }, [])

    useEffect(() => {
        editor?.cm.setSize('100%', '100%')
    }, [enabled])

    useEffect(() => {
        if (!editor) return

        // todo: maybe do this 'conversion' in Api.ts already and use types from there on
        const categories: any = {}
        Object.keys(encodedValues).forEach((k: any) => {
            const v: any = encodedValues[k]
            if (v.length === 2 && v[0] === 'true' && v[1] === 'false') {
                categories[k] = { type: 'boolean' }
            } else if (v.length === 2 && v[0] === '>number' && v[1] === '<number') {
                categories[k] = { type: 'numeric' }
            } else {
                categories[k] = { type: 'enum', values: v.sort() }
            }
        })
        editor.categories = categories
    }, [encodedValues])

    return (
        <>
            <label>
                custom
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                        if (enabled) {
                            Dispatcher.dispatch(new DismissLastError())
                        }
                        Dispatcher.dispatch(new SetCustomModelBoxEnabled(!enabled))
                    }}
                />
            </label>
            {/*we use 'display: none' instead of conditional rendering to preserve the custom model box's state when it is closed*/}
            <div ref={divElement} className={styles.customModelBox} style={{ display: enabled ? 'block' : 'none' }} />
        </>
    )
}
