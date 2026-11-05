import { useCallback, useEffect, useRef, useState } from 'react'

export type LocationStatus = 'pending' | 'on' | 'denied' | 'unavailable' | 'unsupported'

export interface MyLocation {
  status: LocationStatus
  /** [lat, lng] of the latest fix, null until there is one (and after a denial) */
  pos: [number, number] | null
  /** metres */
  accuracy: number
  /** one fresh fix, for the locate button; resolves with why when there's none to be had */
  locateOnce: () => Promise<[number, number] | 'denied' | 'unavailable' | 'unsupported'>
}

const OPTS: PositionOptions = { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 }

/**
 * The visitor's position, watched from page load. The browser asks for permission the first
 * time; a denial clears the position, and a later grant (made in the browser's settings)
 * picks the watch back up without a reload.
 */
export function useMyLocation(): MyLocation {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [status, setStatus] = useState<LocationStatus>(supported ? 'pending' : 'unsupported')
  const [pos, setPos] = useState<[number, number] | null>(null)
  const [accuracy, setAccuracy] = useState(0)
  const watch = useRef<number | null>(null)

  const onFix = useCallback((p: GeolocationPosition) => {
    setPos([p.coords.latitude, p.coords.longitude])
    setAccuracy(p.coords.accuracy)
    setStatus('on')
  }, [])

  const onError = useCallback((e: GeolocationPositionError) => {
    if (e.code === e.PERMISSION_DENIED) {
      setPos(null)
      setStatus('denied')
    } else {
      // no signal or a timeout: keep any earlier fix on screen, the watch keeps trying
      setStatus((s) => (s === 'on' ? s : 'unavailable'))
    }
  }, [])

  const start = useCallback(() => {
    if (!supported || watch.current != null) return
    watch.current = navigator.geolocation.watchPosition(onFix, onError, OPTS)
  }, [supported, onFix, onError])

  const stop = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null
  }, [])

  useEffect(() => {
    if (!supported) return
    start()
    // follow permission changes made in the browser while the page is open (not every browser reports them)
    let perm: PermissionStatus | null = null
    const onPerm = () => {
      if (perm?.state === 'denied') {
        stop()
        setPos(null)
        setStatus('denied')
      } else if (perm?.state === 'granted') {
        stop()
        start()
      }
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        perm = p
        p.addEventListener('change', onPerm)
      })
      .catch(() => {})
    return () => {
      perm?.removeEventListener('change', onPerm)
      stop()
    }
  }, [supported, start, stop])

  const locateOnce = useCallback(
    () =>
      new Promise<[number, number] | 'denied' | 'unavailable' | 'unsupported'>((resolve) => {
        if (!supported) return resolve('unsupported')
        navigator.geolocation.getCurrentPosition(
          (p) => {
            onFix(p)
            stop()
            start() // a fresh grant may have come from this request
            resolve([p.coords.latitude, p.coords.longitude])
          },
          (e) => {
            onError(e)
            resolve(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable')
          },
          OPTS,
        )
      }),
    [supported, onFix, onError, start, stop],
  )

  return { status, pos, accuracy, locateOnce }
}
