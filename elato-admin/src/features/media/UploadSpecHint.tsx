import { formatByteLimit } from "./upload-limits";
import type { DimensionSpec } from "./upload-specs";

/**
 * Small, unobtrusive line shown below/beside an upload control: the actual
 * enforced size cap first ("Required"), then the editorial dimension/aspect
 * guidance ("Recommended") — never the other way around, so admins can't
 * mistake the recommendation for what's actually enforced.
 */
export function UploadSpecHint({ maxBytes, spec }: { maxBytes: number; spec: DimensionSpec }) {
  const dims = spec.height ? `${spec.width} × ${spec.height} px` : `${spec.width} px wide`;
  return (
    <p className="text-[11px] leading-snug text-neutral-400">
      Required: Max {formatByteLimit(maxBytes)} • Recommended: {dims} • {spec.aspectLabel} • {spec.formats}
    </p>
  );
}
