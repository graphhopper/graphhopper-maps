import { textToCoordinate, nominatimHitToItem, hitToItem } from '@/Converters'
import { GeocodingHit } from '@/api/graphhopper'

describe('Converters', function () {
    describe('textToCoordinate', function () {
        it('should convert 2 digits separated by ","', function () {
            expect(textToCoordinate('1.2345, 2.6534')).toEqual({ lat: 1.2345, lng: 2.6534 })
        })
        it('should convert 2 digits separated by " "', function () {
            expect(textToCoordinate('1.2345   2.6534')).toEqual({ lat: 1.2345, lng: 2.6534 })
        })
        it('should return null if not 2 elements are found', function () {
            expect(textToCoordinate('first second third')).toBeNull()
            expect(textToCoordinate('1.2345')).toBeNull()
        })
        it('should return null if any of the elements is NaN', function () {
            expect(textToCoordinate('2.6534 second')).toBeNull()
        })
    })

    describe('hitToItem', function () {
        it('default city', function () {
            expect(
                hitToItem({
                    ...emptyHit(),
                    name: 'Hoyerswerda - Wojerecy',
                    country: 'Germany',
                    state: 'Saxony',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({ mainText: 'Hoyerswerda - Wojerecy', secondText: '02977, Germany' })
        })

        it('default address', function () {
            expect(
                hitToItem({
                    ...emptyHit(),
                    name: 'somestreet',
                    country: 'Germany',
                    state: 'Saxony',
                    city: 'Berlin',
                    street: 'somestreet',
                    housenumber: '6',
                    postcode: '10117',
                } as GeocodingHit)
            ).toEqual({ mainText: 'somestreet 6', secondText: '10117 Berlin, Germany' })
        })

        it('default poi', function () {
            expect(
                hitToItem({
                    ...emptyHit(),
                    name: 'Wasserturm Hoyerswerda Bahnhof',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    street: 'Am Bahnhofsvorplatz',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({
                mainText: 'Wasserturm Hoyerswerda Bahnhof',
                secondText: 'Am Bahnhofsvorplatz, 02977 Hoyerswerda - Wojerecy, Germany',
            })
        })

        it('default poi 2', function () {
            expect(
                hitToItem({
                    ...emptyHit(),
                    name: 'An der Schule',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    county: 'Bautzen',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({ mainText: 'An der Schule', secondText: '02977 Hoyerswerda - Wojerecy, Germany' })
        })

        it('default poi 3', function () {
            expect(
                hitToItem({
                    ...emptyHit(),
                    name: 'Am Wasserturm',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({ mainText: 'Am Wasserturm', secondText: '02977 Hoyerswerda - Wojerecy, Germany' })
        })
    })

    describe('nominatimHitToItem', function () {
        it('nominatim city', function () {
            expect(
                nominatimHitToItem({
                    ...emptyHit(),
                    name: '02977 Hoyerswerda - Wojerecy, Germany',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    county: 'Bautzen',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({ mainText: '02977 Hoyerswerda - Wojerecy', secondText: 'Germany' })
        })

        it('nominatim poi', function () {
            expect(
                nominatimHitToItem({
                    ...emptyHit(),
                    name: 'GraphHopper GmbH, Kirchstraße 17, 02977 Hoyerswerda - Wojerecy, Germany',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    street: 'Kirchstraße',
                    housenumber: '17',
                    county: 'Bautzen',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({
                mainText: 'GraphHopper GmbH',
                secondText: 'Kirchstraße 17, 02977 Hoyerswerda - Wojerecy, Germany',
            })
        })

        it('nominatim poi - ignore name', function () {
            expect(
                nominatimHitToItem({
                    ...emptyHit(),
                    name: 'An der Schule, 02977 Hoyerswerda - Wojerecy, Germany',
                    country: 'Germany',
                    city: 'Hoyerswerda - Wojerecy',
                    state: 'Saxony',
                    street: 'An der Schule',
                    county: 'Bautzen',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({ mainText: 'An der Schule', secondText: '02977 Hoyerswerda - Wojerecy, Germany' })
        })

        it('nominatim city 2', function () {
            expect(
                nominatimHitToItem({
                    ...emptyHit(),
                    name: '02977 Hoyerswerda, Deutschland',
                    country: 'Deutschland',
                    city: 'Hoyerswerda',
                    state: 'Saxony',
                    county: 'Bautzen',
                    postcode: '02977',
                } as GeocodingHit)
            ).toEqual({mainText: '02977 Hoyerswerda', secondText: 'Deutschland'})
        })

        it('nominatim city 3', function () {
                expect(
                    nominatimHitToItem({
                        ...emptyHit(),
                        name: 'Wittensee, something else',
                        country: 'Deutschland',
                        city: 'Groß Wittensee',
                        state: "Schleswig-Holstein",
                        county: "Rendsburg-Eckernförde",
                    } as GeocodingHit)
                ).toEqual({ mainText: 'Wittensee', secondText: 'Groß Wittensee, Deutschland' })
        })
    })

    function emptyHit(): GeocodingHit {
        // We do "response.json() as GeocodingHit" in Api which can lead to undefined entries
        // So we should not just set empty strings
        return ({} as any) as GeocodingHit
    }
})
