import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const shellCard =
  "relative overflow-hidden rounded-[1.35rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.016))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.68)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:bg-[linear-gradient(rgba(255,255,255,0.035),transparent)]"

const inputStyle =
  "min-h-[44px] w-full rounded-[1rem] border border-white/[0.07] bg-[#05070c] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-smc-gold/45"

const goalOptions = [
  "Powerlifting",
  "Fat loss",
  "Muscle build",
  "General strength",
  "Rehab / return to training",
  "Other",
]

async function addClient(formData: FormData) {
  "use server"

  const name = String(formData.get("name") || "").trim()
  const email = String(formData.get("email") || "").trim().toLowerCase()
  const password = String(formData.get("password") || "")
  const goal = String(formData.get("goal") || "Uncategorised").trim()
  const sendReset = formData.get("sendReset") === "on"

  if (!name || !email) {
    redirect("/coach/clients/new?error=missing-fields")
  }

  if (!sendReset && password.length < 6) {
    redirect("/coach/clients/new?error=password-too-short")
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "coach") {
    redirect("/dashboard")
  }

  const admin = createSupabaseAdminClient()

  const { data: existingClient } = await admin
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existingClient) {
    redirect("/coach/clients/new?error=client-already-exists")
  }

  const { data: createdUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: sendReset ? crypto.randomUUID() : password,
      email_confirm: true,
      user_metadata: {
        name,
        goal,
      },
    })

  if (authError || !createdUser.user) {
    const message = authError?.message?.toLowerCase() || ""

    if (message.includes("already")) {
      redirect("/coach/clients/new?error=email-already-exists")
    }

    if (message.includes("valid email")) {
      redirect("/coach/clients/new?error=invalid-email")
    }

    redirect("/coach/clients/new?error=auth-failed")
  }

  const newUserId = createdUser.user.id

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      user_id: newUserId,
      name,
      email,
      goal,
    })
    .select("id")
    .single()

  if (clientError || !client) {
    await admin.auth.admin.deleteUser(newUserId)

    redirect("/coach/clients/new?error=client-insert-failed")
  }

  if (sendReset) {
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    })
  }

  redirect(`/coach/${client.id}?created=true`)
}

function getErrorMessage(error?: string) {
  if (!error) return null

  const messages: Record<string, string> = {
    "missing-fields": "Please add the client name and email.",
    "password-too-short": "Temporary password must be at least 6 characters.",
    "client-already-exists": "A client row already exists for this email.",
    "email-already-exists": "A login account already exists for this email.",
    "invalid-email": "Please enter a valid email address.",
    "auth-failed": "Auth user could not be created.",
    "client-insert-failed":
      "Auth user was created, but the client row failed. The auth user was removed.",
  }

  return messages[error] || "Something went wrong. Please try again."
}

export default async function NewClientPage({
  searchParams,
}: {
  searchParams?: { error?: string } | Promise<{ error?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const errorMessage = getErrorMessage(resolvedSearchParams?.error)

  return (
    <div className="flex flex-col gap-3 pb-8">
      <section className="relative overflow-hidden rounded-[1.6rem] border border-smc-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.78)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/60 to-transparent" />

        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/85">
            Client Onboarding
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white">
            Add New Client
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
            Create their login account, tag their goal and attach them to your coach dashboard.
          </p>
        </div>
      </section>

      <section className={shellCard}>
        <div className="relative z-10">
          {errorMessage && (
            <div className="mb-3 rounded-[1rem] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <form action={addClient} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Full name
              </label>
              <input
                name="name"
                required
                placeholder="Client name"
                className={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Email
              </label>
              <input
                name="email"
                required
                type="email"
                placeholder="client@email.com"
                className={inputStyle}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Client goal
              </label>
              <select name="goal" defaultValue="Powerlifting" className={inputStyle}>
                {goalOptions.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Temporary password
              </label>
              <input
                name="password"
                type="text"
                placeholder="Minimum 6 characters"
                className={inputStyle}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-white/[0.07] bg-[#05070c] p-3">
              <input
                name="sendReset"
                type="checkbox"
                className="mt-1 accent-[#d4af37]"
              />

              <span>
                <span className="block text-sm font-bold text-white">
                  Send password reset email instead
                </span>
                <span className="mt-1 block text-xs leading-5 text-white/40">
                  Creates the account with a secure temporary password, then
                  prepares a password reset flow for the client.
                </span>
              </span>
            </label>

            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <button
                type="submit"
                className="min-h-[44px] rounded-[1rem] bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-110"
              >
                Create Client
              </button>

              <Link
                href="/coach/clients"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-smc-gold/35 hover:text-white"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}