import { calcOrientation, getCurrentInstruction, toNorthBased } from '../../src/turnNavigation/GeoMethods'
import Dispatcher from '../../src/stores/Dispatcher'
import { ApiImpl } from '../../src/api/Api'

let responseHoyerswerda1 = require('./response-hoyerswerda1.json')

afterEach(() => Dispatcher.clear())

describe('calculate instruction', () => {
    // http://localhost:3000/?point=51.437233%2C14.246489&point=51.435514%2C14.239923&profile=car
    it('second instruction should not be "right turn"', () => {
        let path = ApiImpl.decodeResult(responseHoyerswerda1, true)[0]
        const { instructionIndex, distanceToNext, remainingTime, remainingDistance } = getCurrentInstruction(
            path.instructions,
            {
                lat: 51.435029,
                lng: 14.243259,
            }
        )

        expect(distanceToNext).toEqual(236)
        expect(remainingDistance).toEqual(236)
        expect(Math.round(remainingTime / 1000)).toEqual(30)

        expect(path.instructions[instructionIndex].text).toEqual('Ziel erreicht')
    })

    it('remaining time should be correct', () => {
        let path = ApiImpl.decodeResult(responseHoyerswerda1, true)[0]
        const { remainingTime, remainingDistance } = getCurrentInstruction(path.instructions, {
            lat: 51.439291,
            lng: 14.245254,
        })

        expect(Math.round(remainingTime / 1000)).toEqual(101)
        expect(Math.round(remainingDistance)).toEqual(578)
    })

    it('calc angle', () => {
        // downwards+west
        expect(Math.round(toDegrees(calcOrientation(51.439146, 14.245258, 51.438908, 14.245931)))).toEqual(-30)
        expect(
            Math.round(toDegrees(toNorthBased(calcOrientation(51.439146, 14.245258, 51.438908, 14.245931))))
        ).toEqual(120)
        // downwards
        expect(Math.round(toDegrees(calcOrientation(51.439146, 14.245258, 51.438748, 14.245255)))).toEqual(-90)
        expect(
            Math.round(toDegrees(toNorthBased(calcOrientation(51.439146, 14.245258, 51.438748, 14.245255))))
        ).toEqual(180)
        // down+west
        expect(Math.round(toDegrees(calcOrientation(51.439146, 14.245258, 51.439015, 14.244568)))).toEqual(-163)
        expect(
            Math.round(toDegrees(toNorthBased(calcOrientation(51.439146, 14.245258, 51.439015, 14.244568))))
        ).toEqual(253)
        // upward+west
        expect(Math.round(toDegrees(calcOrientation(51.439146, 14.245258, 51.43953, 14.244536)))).toEqual(140)
        expect(Math.round(toDegrees(toNorthBased(calcOrientation(51.439146, 14.245258, 51.43953, 14.244536))))).toEqual(
            310
        )
        // upward+east
        expect(Math.round(toDegrees(calcOrientation(51.439146, 14.245258, 51.439584, 14.24592)))).toEqual(47)
        expect(Math.round(toDegrees(toNorthBased(calcOrientation(51.439146, 14.245258, 51.439584, 14.24592))))).toEqual(
            43
        )
    })

    function toDegrees(radian: number) {
        return (radian / Math.PI) * 180.0
    }
})
