import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Pipeline } from "@/components/landing/pipeline";
import { Problems } from "@/components/landing/problems";
import { MetricsStrip } from "@/components/landing/metrics-strip";
import { Architecture } from "@/components/landing/architecture";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Pipeline />
        <Problems />
        <MetricsStrip />
        <Architecture />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
