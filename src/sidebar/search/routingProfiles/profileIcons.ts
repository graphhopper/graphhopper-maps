import BicycleIcon from './bike.svg'
import BikeScenicIcon from './bike_scenic.svg'
import CarIcon from './car.svg'
import FootIcon from './foot.svg'
import HikeIcon from './hike.svg'
import MotorcycleIcon from './motorcycle.svg'
import MtbBicycleIcon from './mtb-bicycle.svg'
import RacingbikeIcon from './racingbike.svg'
import ScooterIcon from './scooter.svg'
import SmallTruckIcon from './small_truck.svg'
import TruckIcon from './truck.svg'
import WheelchairIcon from './wheelchair.svg'
import QuestionMarkIcon from './question_mark.svg'
import EcargobikeIcon from './ecargobike.svg'
import MotorwayDisabledIcon from './motorway_disabled.svg'
import FerryDisabledIcon from './ferry_disabled.svg'
import TollDisabledIcon from './toll_disabled.svg'

// ALL AVAILABLE ICONS
// every svg gets mapped to a key, so icons can be easily added
export const icons: Record<string, any> = {
    car: CarIcon,
    small_truck: SmallTruckIcon,
    truck: TruckIcon,
    scooter: ScooterIcon,
    foot: FootIcon,
    hike: HikeIcon,
    bike: BicycleIcon,
    bike_scenic: BikeScenicIcon,
    mtb: MtbBicycleIcon, // Mountainbike
    racingbike: RacingbikeIcon,
    ecargobike: EcargobikeIcon,
    motorcycle: MotorcycleIcon,
    wheelchair: WheelchairIcon,
    question_mark: QuestionMarkIcon,
    car_avoid_motorway: MotorwayDisabledIcon,
    car_avoid_ferry: FerryDisabledIcon,
    car_avoid_toll: TollDisabledIcon,
}

// Resolve an icon for a routing-profile name. Falls back to the base-profile icon for custom profiles
// like 'bike_scenic' → 'bike', and finally to the question-mark icon if nothing matches.
export function findIcon(profileName: string): any {
    if (icons[profileName]) return icons[profileName]
    const baseKey = Object.keys(icons).find(k => profileName.startsWith(k + '_'))
    return baseKey ? icons[baseKey] : icons.question_mark
}
