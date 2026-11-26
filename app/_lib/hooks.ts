import { useSyncExternalStore } from 'react';

const PHONE_QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(PHONE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Updates when the phone is rotated or the window is resized. */
export const useIsPhone = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false
  );
