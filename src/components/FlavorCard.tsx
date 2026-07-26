import Link from "next/link";
import Image from "next/image";

type Props = {
  slug: string;
  name: string;
  partnerBrand: string | null;
  imageUrl: string | null;
  isDebut?: boolean;
  isReturn?: boolean;
  isFeatured?: boolean;
  meta?: React.ReactNode | null;
};

export function FlavorCard({
  slug,
  name,
  partnerBrand,
  imageUrl,
  isDebut,
  isReturn,
  isFeatured,
  meta,
}: Props) {
  return (
    <Link
      href={`/flavors/${slug}`}
      className="group flex overflow-hidden rounded-2xl border border-rose-100 bg-white/80 transition hover:border-rose-300 hover:shadow-md"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-rose-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🍪</div>
        )}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-rose-700 sm:text-base">
            {name}
          </div>
          {partnerBrand && (
            <div className="mt-0.5 truncate text-xs text-stone-500">ft. {partnerBrand}</div>
          )}
          {meta && <div className="mt-1 text-xs text-stone-600">{meta}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isDebut && <Badge tone="rose">NEW</Badge>}
          {!isDebut && isReturn && <Badge tone="amber">RETURN</Badge>}
          {isFeatured && <span className="text-sm">🔥</span>}
        </div>
      </div>
    </Link>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "rose" | "amber";
}) {
  const cls =
    tone === "rose"
      ? "bg-rose-600 text-white"
      : "bg-amber-200 text-amber-900";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}
