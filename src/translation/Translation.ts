import trJson from './tr.json'

export class Translation {
    data: { [index: string]: string }
    fallback: { [index: string]: string }
    lang: string

    constructor(lang: string, data: { [index: string]: string }, fallback: { [index: string]: string }) {
        if (!data) throw Error('Translation is undefined')
        if (!fallback) throw Error('Translation fallback is undefined')
        this.lang = lang
        this.data = data
        this.fallback = fallback
    }

    get(key: string, parameters?: string[]): string {
        let str: string = this.data[key]
        if (!str) {
            str = this.fallback[key]
            if (!str) return key
        }
        if (parameters)
            for (let i = 0; i < parameters.length; i++) {
                str = str.replace('%' + (i + 1) + '$s', parameters[i])
            }
        return str || ''
    }

    getLang() {
        return this.lang
    }
}

let translation: Translation
export function setTranslation(lang: string, overwrite = false): Translation {
    if (translation && !overwrite) throw new Error('translation already initialized')
    lang = lang.replace('-', '_')

    let json = trJson as Record<string, any>
    let selectedLang = Object.keys(json).find(property => lang == property || property.indexOf("_") > 0 && lang == property.substring(0, property.indexOf("_")))
    if (!selectedLang) {
        let genericLang = lang.length > 2 ? lang.substring(0, 2) : lang
        selectedLang = Object.keys(json).find(property => property.startsWith(genericLang))
        if (!selectedLang) {
            selectedLang = 'en_US'
            console.warn('cannot find language ' + lang + ' fallback to ' + selectedLang)
        }
    }
    return (translation = new Translation(selectedLang, json[selectedLang], json['en_US']))
}

export function getTranslation(): Translation {
    if (!translation) throw new Error('init translation via setTranslation before using getTranslation')
    return translation
}

export function tr(key: string, parameters?: string[]) {
    return getTranslation().get(key, parameters)
}
