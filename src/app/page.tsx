import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Ticker } from '@/components/Ticker';
import { Signals } from '@/components/landing/Signals';
import { Room } from '@/components/landing/Room';
import { How } from '@/components/landing/How';
import { Ladder } from '@/components/landing/Ladder';
import { Loop } from '@/components/landing/Loop';
import { Faq } from '@/components/Faq';
import { Join } from '@/components/JoinForm';
import { Footer } from '@/components/Footer';
import './landing.css';

export default function Page() {
  return (
    <div id="top" className="flex min-h-dvh flex-col bg-ink">
      <Nav />
      <main className="flex flex-col">
        <Hero />
        <Ticker />
        <Signals />
        <Room />
        <How />
        <Ladder />
        <Loop />
        <Faq />
        <Join />
      </main>
      <Footer />
    </div>
  );
}
