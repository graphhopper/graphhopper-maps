import trJson from './tr.json'

export class Translation {
    data: { [index: string]: string }
    fallback: { [index: string]: string }

    constructor(data: { [index: string]: string }, fallback: { [index: string]: string }) {
        if (!data) throw Error('Translation is undefined')
        if (!fallback) throw Error('Translation fallback is undefined')
        this.data = data
        this.fallback = fallback
    }

    tr(key: string, parameters?: string[]): string {
        var str: string = this.data[key]
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
}

let translation: Translation
export function setTranslation(lang: string, overwrite = false): Translation {
    if (translation && !overwrite) throw new Error('translation already initialized')

    let json = trJson as Record<string, any>
    for (let property in json) {
        if (property.startsWith(lang)) {
            translation = new Translation(json[property], json['en_US'])
            return translation
        }
    }
    throw new Error('language ' + lang + ' not found')
}

export function getTranslation(): Translation {
    if (!translation) throw new Error('init translation via setTranslation before using getTranslation')
    return translation
}
