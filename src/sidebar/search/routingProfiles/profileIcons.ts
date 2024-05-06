import BicycleIcon from './bike.svg'
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
    mtb: MtbBicycleIcon, // Mountainbike
    racingbike: RacingbikeIcon,
    motorcycle: MotorcycleIcon,
    wheelchair: WheelchairIcon,
    question_mark: QuestionMarkIcon,
}
