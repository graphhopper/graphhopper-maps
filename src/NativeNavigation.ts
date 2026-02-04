export interface NativeNavigation {
    start(navigateUrl: string, requestBody: string, onClose: () => void, showDistanceInMiles?: boolean): void
    stop(): void
}
