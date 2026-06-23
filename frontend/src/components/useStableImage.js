import { useEffect, useState } from "react";

// Loads an image (or the first working source from a list) off-screen and only
// returns its URL once it has fully decoded. The displayed <img> therefore never
// flashes to blank/initials when the source changes. Already-cached images
// resolve synchronously so reopening a card shows them instantly with no flash.
// keepPrevious: when the source changes, keep showing the already-loaded image
// until the new one finishes decoding (instead of flashing the placeholder).
// Use it for logos that swap between known values so they never flicker.
// Probe the browser cache without triggering a visible load. Returns the first
// source that is already fully cached, else null.
function cachedSource(list, crossOrigin) {
  for (const src of list) {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.src = src;
    if (img.complete && img.naturalWidth > 0) return src;
  }
  return null;
}

export function useStableImage(sources, { crossOrigin, keepPrevious } = {}) {
  const list = (Array.isArray(sources) ? sources : [sources]).filter(Boolean);
  const key = list.join("|");
  // Lazy init probes the cache during the first render so a cached image shows
  // immediately — no one-frame placeholder flash when the component (re)mounts.
  const [shownSrc, setShownSrc] = useState(() => cachedSource(list, crossOrigin));

  useEffect(() => {
    let cancelled = false;
    if (!list.length) {
      setShownSrc(null);
      return undefined;
    }

    let index = 0;
    let resolvedSync = false;

    const attempt = () => {
      if (cancelled || index >= list.length) return;
      const src = list[index];
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => {
        if (!cancelled) setShownSrc(src);
      };
      img.onerror = () => {
        index += 1;
        attempt();
      };
      img.src = src;
      // Cached images report complete synchronously — show immediately, no flash.
      if (img.complete && img.naturalWidth > 0) {
        resolvedSync = true;
        setShownSrc(src);
      }
    };

    attempt();
    // Fall back to the placeholder while a truly-uncached image loads, unless we
    // were told to hold the previous image (avoids logo flicker on team change).
    if (!resolvedSync && !keepPrevious) setShownSrc(null);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, crossOrigin, keepPrevious]);

  return shownSrc;
}
