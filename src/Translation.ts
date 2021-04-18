export class TranslationMap {

    get(locale: string): Translation {
        if(locale == "de") {
            return new Translation({
               welcome: "Willkommen",
               in_x_meters: "In %s1 Metern %s2",
               too_far_away: "Vom Weg abgekommen."
            });
        }
        return new Translation({
            welcome: "Welcome",
            in_x_meters: "In %s1 meters %s2",
            too_far_away: "Too far away from route."
        });
    }
}

export class Translation {
    data: any;

    constructor(data: any) {
        this.data = data;
    }

    tr(key: string, parameters?: string[]): string {
        var str: string = this.data[key]
        if(parameters)
            for(let i = 0; i < parameters.length; i++){
                str = str.replace("%s"+(i+1), parameters[i])
            }
        return str || ''
    }
}