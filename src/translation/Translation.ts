import trJson from './tr.json'

export class Translation {
    data: any

    constructor(data: any) {
        this.data = data
    }

    tr(key: string, parameters?: string[]): string {
        var str: string = this.data[key]
        if (parameters)
            for (let i = 0; i < parameters.length; i++) {
                str = str.replace('%s' + (i + 1), parameters[i])
            }
        return str || ''
    }
}

let translation: Translation
export function setTranslation(lang: string, overwrite = false): Translation {
    if (translation && !overwrite) throw new Error('translation already initialized')
    let json = ((trJson as any) as Record<string, any>)[lang]
    translation = new Translation(json)
    return translation
}

export function getTranslation(): Translation {
    if (!translation) throw new Error('init translation via setTranslation before using getTranslation')
    return translation
}
