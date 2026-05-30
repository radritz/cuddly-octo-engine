import { registerSW } from 'virtual:pwa-register'

export function registerHomeOSPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      window.setInterval(
        () => {
          void registration?.update()
        },
        60 * 60 * 1000,
      )
    },
  })
}
