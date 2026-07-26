import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-rose-200/60 bg-white/70 p-10 text-center shadow-sm">
      <div className="text-5xl">🍪</div>
      <h1 className="mt-4 text-3xl font-bold">Crumb not found</h1>
      <p className="mt-2 text-stone-600">That flavor or week isn&apos;t in the archive yet.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700"
      >
        Back to this week
      </Link>
    </div>
  );
}
