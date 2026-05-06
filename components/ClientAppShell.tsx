import BottomNav from "@/components/BottomNav"

export default function ClientAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-5">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}