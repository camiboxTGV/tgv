export default function CatalogLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading catalog"
      className="mx-auto min-h-[70vh] max-w-6xl px-6 py-16 lg:px-8 lg:py-20"
    >
      <div className="motion-safe:animate-pulse">
        <div className="h-3 w-24 rounded-full bg-[var(--border)]" />
        <div className="mt-5 h-10 w-full max-w-xl rounded-xl bg-[var(--surface-elevated)] sm:h-14" />
        <div className="mt-4 h-4 w-full max-w-md rounded-full bg-[var(--border-soft)]" />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} aria-hidden="true">
              <div className="aspect-[4/3] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)]" />
              <div className="mt-4 h-5 w-2/3 rounded-full bg-[var(--border)]" />
              <div className="mt-2 h-3 w-full rounded-full bg-[var(--border-soft)]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
