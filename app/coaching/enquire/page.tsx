
import type { Metadata } from "next"
import Image from "next/image"
import CoachingEnquiryForm from "@/components/CoachingEnquiryForm"

export const metadata: Metadata = {
  title: "Coaching & Enquiries | Steve Moran Coaching",
  description:
    "Explore in-person, online, hybrid and programme-only strength coaching with Steve Moran. View prices and enquire about coaching.",
}

const services = [
  {
    title: "In-Person Coaching",
    description:
      "Hands-on coaching focused on technique, confidence and progressive strength development.",
    suitable:
      "Ideal if you want face-to-face support and structured sessions.",
    prices: [
      ["1 session per week", "£150"],
      ["2 sessions per week", "£280"],
      ["3 sessions per week", "£380"],
    ],
    billing: "Every 4 weeks",
  },
  {
    title: "2-to-1 Coaching",
    description:
      "Train together while benefiting from individual attention and coaching.",
    suitable:
      "Ideal for friends or partners who enjoy training together.",
    prices: [
      ["1 session per week", "£180"],
      ["2 sessions per week", "£300"],
      ["3 sessions per week", "£400"],
    ],
    billing: "Every 4 weeks",
  },
  {
    title: "Full Online Coaching",
    description:
      "Individualised training programming, progression and ongoing coaching support wherever you train.",
    suitable:
      "Ideal for independent lifters who still want a coach in their corner.",
    prices: [["Full online coaching", "£105"]],
    billing: "Per calendar month",
  },
  {
    title: "Hybrid Coaching",
    description:
      "Everything included in Full Online Coaching, plus one dedicated in-person coaching session every month for technique work, hands-on guidance and personalised feedback.",
    suitable:
      "Ideal for lifters who want flexibility with regular face-to-face support.",
    prices: [["Hybrid coaching", "£120"]],
    billing: "Per calendar month",
    featured: true,
  },
  {
    title: "Programme Only",
    description:
      "A structured training programme built around your goals, experience and available training time.",
    suitable:
      "Ideal if you're comfortable training independently.",
    prices: [["Programme only", "£60"]],
    billing: "Per calendar month",
  },
]

export default function CoachingEnquirePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav
          className="flex items-center justify-between border-b border-white/10 py-5"
          aria-label="Page navigation"
        >
          <a
            href="#top"
            className="text-xs font-black uppercase leading-5 tracking-[0.16em]"
          >
            STEVE <span className="text-smc-gold">MORAN</span>
            <br />
            COACHING
          </a>

          <a
            href="#enquire"
            className="rounded-full border border-smc-gold/40 px-4 py-2 text-xs font-bold text-smc-gold transition hover:bg-smc-gold/10"
          >
            Get in touch
          </a>
        </nav>

        {/* Hero */}
        <header
          id="top"
          className="relative isolate mt-3 overflow-hidden rounded-[1.5rem] bg-[#080808] lg:mt-6"
        >
          <div className="absolute inset-0 lg:left-[35%]">
            <Image
              src="/images/coaching/hero.webp"
              alt="Steve coaching a lifter during a strength competition"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[center_43%] lg:object-center"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/35 lg:bg-gradient-to-r lg:from-[#050505] lg:via-[#050505]/85 lg:to-[#050505]/15" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#050505] to-transparent" />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#050505]/60 to-transparent" />

          <div className="relative flex min-h-[540px] flex-col justify-end px-5 pb-12 pt-16 sm:px-10 lg:min-h-[590px] lg:w-[65%] lg:justify-center lg:px-14 lg:py-16">
            <p className="mb-5 w-fit rounded-full border border-smc-gold/35 bg-black/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.19em] text-smc-gold">
              Strength · Confidence · Progress
            </p>

            <h1 className="max-w-xl text-[clamp(2.35rem,7.4vw,5.6rem)] font-black uppercase leading-[0.98] tracking-[-0.055em]">
              Your goals.
              <br />
              <span className="text-smc-gold">
                Your journey.
              </span>
              <br />
              Your coach.
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/80 sm:text-base">
              From your first session in the gym to the competition
              platform, coaching should be built around you — your
              goals, your experience and your lifestyle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#enquire"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-smc-gold px-7 text-sm font-black text-black transition hover:brightness-110"
              >
                Jump to enquiry form
              </a>

              <a
                href="#options"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-black/35 px-7 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Explore coaching ↓
              </a>
            </div>

            <div className="mt-8 grid max-w-md grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/35 py-3 text-center backdrop-blur-sm">
              <div>
                <p className="text-xl font-black text-smc-gold">
                  10+
                </p>
                <p className="mt-1 text-[10px] text-white/65">
                  Years coaching
                </p>
              </div>

              <div>
                <p className="text-xl font-black text-smc-gold">
                  All
                </p>
                <p className="mt-1 text-[10px] text-white/65">
                  Experience levels
                </p>
              </div>

              <div>
                <p className="text-xl font-black text-smc-gold">
                  1:1
                </p>
                <p className="mt-1 text-[10px] text-white/65">
                  Personal approach
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Coaching philosophy */}
        <section
          className="grid items-center gap-8 py-10 lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:py-16"
          aria-labelledby="philosophy-title"
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-smc-gold">
              More than just a programme
            </p>

            <h2
              id="philosophy-title"
              className="mt-4 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl"
            >
              Coaching that meets you{" "}
              <span className="text-smc-gold">
                where you are.
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-white/65">
              Whether you want to build muscle, get stronger, improve
              your confidence or compete at the highest level, the
              approach is always the same: understand you first, then
              build a plan that works.
            </p>

            <div className="mt-7 space-y-3">
              {[
                [
                  "01",
                  "Built for you",
                  "Training shaped around your goals, ability and schedule.",
                ],
                [
                  "02",
                  "Real coaching",
                  "Clear guidance, honest feedback and support as you progress.",
                ],
                [
                  "03",
                  "Progress that lasts",
                  "A sustainable approach to getting stronger and moving better.",
                ],
              ].map(([number, title, body]) => (
                <div
                  key={number}
                  className="flex gap-4 border-b border-white/10 px-1 py-4 last:border-b-0"
                >
                  <span className="pt-0.5 text-xs font-black text-smc-gold">
                    {number}
                  </span>

                  <div>
                    <h3 className="font-black">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-white/55">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[340px] overflow-hidden sm:h-[460px] lg:h-[550px]">
            <Image
              src="/images/coaching/coaching.webp"
              alt="Steve giving hands-on guidance during a powerlifting bench press"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/35" />

            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#050505] to-transparent" />

            <div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-20">
              <p className="text-sm font-black">
                Real coaching. Real progress.
              </p>
            </div>
          </div>
        </section>

        {/* Coaching options */}
        <section
          id="options"
          className="scroll-mt-8 py-12 lg:py-16"
          aria-labelledby="coaching-options"
        >
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-smc-gold">
              Find your fit
            </p>

            <h2
              id="coaching-options"
              className="mt-3 text-3xl font-black sm:text-4xl"
            >
              Your coaching options.
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Different goals, different lifestyles, different ways
              to train. Explore the options and tap to see pricing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.title}
                className={`rounded-[1.25rem] border p-5 transition-colors sm:p-6 ${
                  service.featured
                    ? "border-smc-gold/30 bg-smc-gold/[0.04]"
                    : "border-white/[0.08] bg-white/[0.025]"
                }`}
              >
                {service.featured && (
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
                    Flexible coaching option
                  </p>
                )}

                <h3 className="text-xl font-black">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/70">
                  {service.description}
                </p>

                <p className="mt-2 text-xs leading-5 text-white/45">
                  {service.suitable}
                </p>

                <details className="group mt-5 border-t border-white/10 pt-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-smc-gold/25 bg-smc-gold/[0.06] px-4 py-3 text-sm font-bold text-smc-gold transition hover:bg-smc-gold/[0.12] [&::-webkit-details-marker]:hidden">
                    <span>View pricing</span>

                    <svg
                      className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>

                  <div className="space-y-3 px-1 pt-5">
                    {service.prices.map(([label, price]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-white/65">
                          {label}
                        </span>

                        <span className="whitespace-nowrap text-lg font-black text-smc-gold">
                          {price}
                        </span>
                      </div>
                    ))}

                    <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                      {service.billing}
                    </p>
                  </div>
                </details>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-6 text-white/45">
            In-person coaching is charged every four weeks.
            Online, hybrid and programme-only coaching are
            charged per calendar month.
          </p>

          <div className="mt-7 text-center">
            <a
              href="#enquire"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-smc-gold px-8 text-sm font-black text-black sm:w-auto"
            >
              Start your enquiry ↗
            </a>
          </div>
        </section>

        {/* SMC Community */}
        <section
          className="py-12 lg:py-16"
          aria-labelledby="community-title"
        >
          <div className="mb-7">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-smc-gold">
              The SMC community
            </p>

            <h2
              id="community-title"
              className="mt-3 max-w-xl text-3xl font-black tracking-tight sm:text-4xl"
            >
              The people make the progress{" "}
              <span className="text-smc-gold">
                worth celebrating.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="relative h-64 overflow-hidden bg-[#0c0c0c] sm:h-96">
              <Image
                src="/images/coaching/community.webp"
                alt="Steve celebrating with an athlete after a competition lift"
                fill
                sizes="(max-width: 640px) 50vw, 45vw"
                className="object-cover object-center"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/20" />

              <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#050505]/75 to-transparent" />

              <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#050505]/75 to-transparent" />
            </div>

            <div className="relative h-64 overflow-hidden bg-[#0c0c0c] sm:h-96">
              <Image
                src="/images/coaching/celebration.webp"
                alt="Steve congratulating an athlete at an SMC event"
                fill
                sizes="(max-width: 640px) 50vw, 45vw"
                className="object-cover object-center"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/20" />

              <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#050505]/75 to-transparent" />

              <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#050505]/75 to-transparent" />
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65">
            From first-time gym sessions to personal bests and
            competition days, every milestone matters. You'll
            have someone in your corner for all of them.
          </p>
        </section>

        {/* Enquiry form */}
        <section
          id="enquire"
          className="mx-auto max-w-2xl scroll-mt-8 border-t border-white/10 py-12 lg:py-16"
        >
          <div className="mb-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-smc-gold">
              Your next step
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Let's talk about your goals.
            </h2>

            <p className="mt-4 text-sm leading-7 text-white/60">
              Not sure which coaching option suits you?
              That's absolutely fine. Tell me a little about
              yourself and we'll find the right approach.
            </p>
          </div>

          <CoachingEnquiryForm />
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 text-center text-xs text-white/35">
          © {new Date().getFullYear()} Steve Moran Coaching
        </footer>
      </div>
    </main>
  )
}
