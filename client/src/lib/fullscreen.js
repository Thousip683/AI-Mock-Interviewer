import { useEffect, useState } from 'react';
export function enterFullscreen(element = document.documentElement) {
  if (!document.fullscreenElement && element?.requestFullscreen) return element.requestFullscreen().catch(() => {});
}
export function leaveFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen().catch(() => {});
}

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  return fullscreen;
}
