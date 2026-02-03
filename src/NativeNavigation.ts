import { Path } from '@/api/graphhopper'

export interface NativeNavigation {
    start(path: Path, navigateUrl: string, profile: string, onClose: () => void): void
    stop(): void
}
