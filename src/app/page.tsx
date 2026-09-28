import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { WhyJoin } from '@/components/WhyJoin';
import { Week } from '@/components/Week';
import { Ranks } from '@/components/Ranks';
import { Events } from '@/components/Events';
import { Faq } from '@/components/Faq';
import { Leadership } from '@/components/Leadership';
import { Join } from '@/components/JoinForm';
import { Footer } from '@/components/Footer';

export default function Page() {
  return (
    <div id="top" className="flex min-h-dvh flex-col bg-ink">
      <Nav />
      <main className="flex flex-col">
        <Hero />
        <WhyJoin />
        <Week />
        <Ranks />
        <Events />
        <Faq />
        <Leadership />
        <Join />
      </main>
      <Footer />
    </div>
  );
}
