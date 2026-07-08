import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Network, Star } from "lucide-react";

const partners = ["Travel", "Retail", "NGO", "Finance", "Education", "Healthcare"];

const avatars = [
  "bg-[#f8d7df]",
  "bg-[#dbeafe]",
  "bg-[#dcfce7]",
  "bg-[#fef3c7]"
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white px-4 py-8 text-[#303033] sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl bg-white px-5 py-5 sm:px-10 lg:px-14">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <Link className="flex items-center gap-3 text-2xl font-black tracking-[-0.02em]" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7c3aed] text-white">
              <Network size={19} />
            </span>
            Kipekee
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-[#3f3f46] md:flex">
            <Link href="/organisations">Product</Link>
            <Link className="inline-flex items-center gap-1" href="/documents">
              Services <ChevronDown size={14} />
            </Link>
            <Link className="inline-flex items-center gap-1" href="/knowledge">
              Categories <ChevronDown size={14} />
            </Link>
            <Link href="/help">Resources</Link>
            <Link href="/company-settings">About Us</Link>
          </nav>

          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#3d3d40] px-7 text-sm font-semibold text-white"
            href="/login"
          >
            Join Us
          </Link>
        </header>

        <section className="pt-14 sm:pt-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-end">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-[#f4efff] px-4 py-2 text-sm font-semibold text-[#7c3aed]">
                AI workforce platform for African businesses
              </p>
              <h1 className="max-w-4xl text-[clamp(3.1rem,8vw,5.7rem)] font-black leading-[0.92] tracking-[-0.04em] text-[#3b3b3d]">
                Empower Your Workforce
                <span className="block font-serif italic font-medium tracking-normal text-[#4b4b4d]">
                  With AI Employees
                </span>
              </h1>
            </div>

            <div className="grid gap-5 sm:grid-cols-[72px_1fr] sm:items-center">
              <div className="hidden h-24 w-24 items-center justify-center sm:flex" aria-hidden="true">
                <span className="relative block h-24 w-24">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span
                      className="absolute left-1/2 top-1/2 h-1.5 w-12 origin-left rounded-full bg-black"
                      key={index}
                      style={{ transform: `rotate(${index * 45}deg) translateX(10px)` }}
                    />
                  ))}
                </span>
              </div>

              <div>
                <p className="max-w-lg text-base leading-7 text-[#4b4b52]">
                  Hire AI employees trained on your business. Scale sales, support, finance, research, proposals, and operations without the overhead of building an AI department from scratch.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#3d3d40] px-6 text-sm font-semibold text-white"
                    href="/login"
                  >
                    Get Started - It&apos;s Free
                  </Link>
                  <Link
                    aria-label="Open dashboard"
                    className="grid h-12 w-12 place-items-center rounded-full bg-[#3d3d40] text-white"
                    href="/dashboard"
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {avatars.slice(0, 3).map((color, index) => (
                        <span className={`grid h-10 w-10 place-items-center rounded-xl border-2 border-white ${color} text-sm font-bold`} key={color}>
                          {["L", "A", "M"][index]}
                        </span>
                      ))}
                    </div>
                    <div>
                      <div className="flex gap-0.5 text-[#303033]">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star fill="currentColor" key={index} size={15} />
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-[#4b4b52]">4.8/5 from pilot operators</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-[0.62fr_1.28fr]">
            <Image
              alt="African business owner using Kipekee Networks on mobile"
              className="h-[22rem] w-full rounded-2xl object-cover"
              height={900}
              priority
              src="/landing/founder-ai-workforce.png"
              unoptimized
              width={900}
            />
            <Image
              alt="Business team collaborating with AI employees"
              className="h-[22rem] w-full rounded-2xl object-cover"
              height={900}
              priority
              src="/landing/team-ai-workforce.png"
              unoptimized
              width={1400}
            />
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-6 text-center text-2xl font-black text-[#4b4b4d] opacity-80 sm:grid-cols-3 lg:grid-cols-6">
            {partners.map((partner) => (
              <span key={partner}>{partner}</span>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <h2 className="max-w-4xl text-[clamp(2.3rem,5vw,4.1rem)] font-medium leading-tight tracking-[-0.035em] text-[#3b3b3d]">
            Moving beyond simple automation to create a world where your digital workforce
            <span className="font-serif italic tracking-normal"> anticipates the work before it slows you down.</span>
          </h2>

          <div className="grid gap-6">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {avatars.map((color, index) => (
                  <span className={`grid h-14 w-14 place-items-center rounded-full border-4 border-white ${color} font-bold`} key={color}>
                    {["C", "P", "F", "R"][index]}
                  </span>
                ))}
                <span className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-[#262626] text-2xl font-black text-white">
                  4k
                </span>
              </div>
            </div>
            <blockquote className="max-w-md text-2xl leading-snug tracking-[-0.02em] text-[#3f3f46]">
              Reclaimed 15 hours of my week. I&apos;m never going back to managing business work manually.
            </blockquote>
          </div>
        </section>
      </section>
    </main>
  );
}
