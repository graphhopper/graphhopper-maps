import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/lint/lint.css'
import '@/sidebar/CustomModelBox.css'
import styles from '@/sidebar/CustomModelBox.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'custom-model-editor/src/index'
import Dispatcher from '@/stores/Dispatcher'
import { ClearRoute, DismissLastError, DrawAreas, SetCustomModel, SetCustomModelEnabled } from '@/actions/Actions'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import { customModel2prettyString, customModelExamples } from '@/sidebar/CustomModelExamples'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import DrawAreasIcon from '@/sidebar/edit_square.svg'
import DrawAreasDisabledIcon from '@/sidebar/edit_square_disabled.svg'

function convertEncodedValuesForEditor(encodedValues: object[]): any {
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
    return categories
}

export interface CustomModelBoxProps {
    customModelEnabled: boolean
    encodedValues: object[]
    customModelStr: string
    queryOngoing: boolean
    drawAreas: boolean
}

export default function CustomModelBox({
    customModelEnabled,
    encodedValues,
    customModelStr,
    queryOngoing,
    drawAreas,
}: CustomModelBoxProps) {
    // todo: add types for custom model editor later
    const [editor, setEditor] = useState<any>()
    const [isValid, setIsValid] = useState(false)
    const divElement = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        // we start with the encoded values we already have, but they might be empty still
        const instance = create(convertEncodedValuesForEditor(encodedValues), (element: Node) =>
            divElement.current?.appendChild(element)
        )
        setEditor(instance)

        instance.cm.setSize('100%', '100%')
        instance.cm.on('change', () => Dispatcher.dispatch(new SetCustomModel(instance.value, false)))
        instance.validListener = (valid: boolean) => setIsValid(valid)
    }, [])

    useEffect(() => {
        if (!editor) return
        editor.categories = convertEncodedValuesForEditor(encodedValues)
        // focus the box when it is opened
        if (customModelEnabled) editor.cm.focus()
        if (editor.value !== customModelStr) editor.value = customModelStr
    }, [editor, encodedValues, customModelEnabled, customModelStr])

    const triggerRouting = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.ctrlKey && event.key === 'Enter') {
                // Using this keyboard shortcut we can skip the custom model validation and directly request a routing
                // query.
                Dispatcher.dispatch(new SetCustomModel(editor.value, true))
            }
        },
        [editor, isValid]
    )

    return (
        <>
            <div className={styles.customModelOptionTable}>
                <PlainButton
                    style={{ color: customModelEnabled ? '' : 'lightgray' }}
                    onClick={() => {
                        if (customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new SetCustomModelEnabled(!customModelEnabled))
                    }}
                >
                    {customModelEnabled ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: customModelEnabled ? '#5b616a' : 'gray' }}>{tr('custom_model_enabled')}</div>
                {customModelEnabled && (
                    <PlainButton
                        className={styles.drawAreas}
                        title={tr('draw_areas_enabled')}
                        style={{ color: drawAreas ? '' : 'lightgray' }}
                        onClick={() => Dispatcher.dispatch(new DrawAreas(!drawAreas))}
                    >
                        {drawAreas ? <DrawAreasIcon /> : <DrawAreasDisabledIcon />}
                    </PlainButton>
                )}
            </div>
            <div ref={divElement} className={styles.customModelBox} onKeyUp={triggerRouting} />
            <div className={styles.customModelBoxBottomBar}>
                <select
                    className={styles.examples}
                    onChange={(e: any) => {
                        // When selecting an example we request a routing request and act like the model is valid,
                        // even when it is not according to the editor validation.
                        Dispatcher.dispatch(
                            new SetCustomModel(customModel2prettyString(customModelExamples[e.target.value]), true)
                        )
                    }}
                >
                    <option value="default_example">{tr('examples_custom_model')}</option>
                    <option value="exclude_motorway">{tr('exclude_motorway_example')}</option>
                    <option value="limit_speed">{tr('limit_speed_example')}</option>
                    <option value="cargo_bike">{tr('cargo_bike_example')}</option>
                    <option value="bike_network">{tr('prefer_bike_network')}</option>
                    <option value="combined">{tr('combined_example')}</option>
                </select>

                <a
                    target="_blank"
                    className={styles.helpLink}
                    href="https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md"
                >
                    {tr('help_custom_model')}
                </a>
                <div
                    className={`${styles.applyButton} ${!isValid ? styles.applyButtonInvalid : ''} ${
                        queryOngoing ? styles.applyButtonProgress : ''
                    }`}
                >
                    <PlainButton
                        title={tr('Apply custom model of text box to routing request')}
                        disabled={!isValid || queryOngoing}
                        // If the model was invalid the button would be disabled anyway, so it does not really matter
                        // if we set valid to true or false here.
                        onClick={() => {
                            if (!customModelEnabled) Dispatcher.dispatch(new SetCustomModelEnabled(true))
                            Dispatcher.dispatch(new SetCustomModel(editor.value, true))
                        }}
                    >
                        {tr('apply_custom_model')}
                    </PlainButton>
                    {queryOngoing && <div className={styles.infiniteProgressBar}></div>}
                </div>
            </div>
        </>
    )
}
