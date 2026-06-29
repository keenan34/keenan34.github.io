// Shared loading-skeleton primitives. Pair these (inside an `animate-pulse`
// container) with the `.ifn-fade-in` utility on the real content so loading
// states fade in/out instead of popping. Keep skeletons the same size/shape as
// the real layout to avoid layout shift on swap.

export function SkeletonBar({ className = "" }) {
  return <div className={`rounded bg-[#e2e8f0] ${className}`} />;
}

export function SkeletonCircle({ className = "" }) {
  return <div className={`rounded-full bg-[#e2e8f0] ${className}`} />;
}

// Wraps loading placeholders with the shared pulse + container styling.
export function SkeletonBlock({ className = "", children }) {
  return <div className={`animate-pulse ${className}`}>{children}</div>;
}
