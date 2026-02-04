export interface NativeNavigation {
    start(navigateUrl: string, requestBody: string, onClose: () => void): void
    stop(): void
}
