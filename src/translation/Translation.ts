export class Translation {
    data: any
    fallback: any

    constructor(data: any, fallback: any) {
        this.data = data
        this.fallback = fallback
    }

    tr(key: string, parameters?: string[]): string {
        var str: string = this.data[key]
        if (!str) return key
        if (parameters)
            for (let i = 0; i < parameters.length; i++) {
                str = str.replace('%' + (i + 1) + '$s', parameters[i])
            }
        return str || ''
    }
}

let translation: Translation
export function setTranslation(tr: Translation, overwrite = false) {
    if (translation && !overwrite) throw new Error('translation already initialized')
    translation = tr
}

export function getTranslation(): Translation {
    if (!translation) throw new Error('init translation via setTranslation before using getTranslation')
    return translation
}
