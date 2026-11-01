import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { ArrowRight, Mic, BookOpen, Route, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StudioPreview from '@/components/StudioPreview';

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const destination = isSignedIn ? '/create-interview' : '/login';
  return <main>
    <section className="container grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-20">
      <div className="editorial-enter">
        <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-medium tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" />A little practice. A different future.</p>
        <h1 className="text-5xl leading-[1.04] tracking-tight sm:text-6xl xl:text-7xl">Your next chapter<br />starts with a<br /><em className="font-medium text-primary">better conversation.</em></h1>
        <p className="mt-7 max-w-lg text-base leading-8 text-muted-foreground">A thoughtful space to practice interviews, find your voice, and turn feedback into confidence. Built around you, one answer at a time.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4"><Button variant="gradient" size="xl" className="group" asChild><Link to={destination}>Enter your studio<ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></Button><a href="#experience" className="rounded-full px-3 py-3 text-sm font-medium underline decoration-primary/30 underline-offset-8">Explore the experience</a></div>
        <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">{['Natural voice interviews', 'Feedback worth keeping', 'A path forward'].map(item => <span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" />{item}</span>)}</div>
      </div>
      <div className="editorial-enter"><StudioPreview /></div>
    </section>
    <section id="experience" className="border-y border-border/70 bg-white/70 py-16 sm:py-20">
      <div className="container"><div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-primary">Designed for your progress</p><h2 className="text-4xl sm:text-5xl">Less pressure. More possibility.</h2></div><p className="max-w-sm text-sm leading-7 text-muted-foreground">From that first introduction to the answer you’re proud of, every session helps you take the next step.</p></div>
        <div className="grid gap-5 md:grid-cols-3">{[
          { icon: Mic, title: 'Find your rhythm', text: 'Speak with an AI interviewer that adapts to your answers. Think aloud, ask questions, and practice your way.', number: '01', link: 'Practice a conversation' },
          { icon: BookOpen, title: 'See what matters', text: 'Get a clear overview, detailed reference answers, and useful study notes. Revisit everything in your saved interviews.', number: '02', link: 'Build your understanding' },
          { icon: Route, title: 'Know what’s next', text: 'Follow a personal learning path with focused exercises and small, measurable milestones.', number: '03', link: 'Make your next move' },
        ].map(item => <Link key={item.number} to={isSignedIn ? (item.number === '01' ? '/create-interview' : item.number === '03' ? '/feedback?tab=roadmap' : '/feedback') : `/login?redirect=${encodeURIComponent(item.number === '01' ? '/create-interview' : item.number === '03' ? '/feedback?tab=roadmap' : '/feedback')}`} className="surface-card dimensional-link rounded-2xl border bg-background p-7 transition-transform"><div className="mb-8 flex items-center justify-between"><span className="rounded-2xl border border-white bg-gradient-to-br from-white to-purple-100 p-4 text-primary shadow-md shadow-primary/5"><item.icon className="h-6 w-6" /></span><span className="editorial-title text-3xl text-primary/30">{item.number}</span></div><h3 className="editorial-title text-3xl">{item.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p><p className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">{item.link}<ArrowRight className="h-3.5 w-3.5" /></p></Link>)}</div>
      </div>
    </section>
    <section className="container py-16 sm:py-20"><div className="relative overflow-hidden rounded-[2rem] bg-[#401626] px-7 py-12 text-white sm:px-12"><div className="pointer-events-none absolute -right-10 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" /><div className="relative flex flex-wrap items-center justify-between gap-8"><div><p className="mb-3 text-xs uppercase tracking-[.2em] text-[#e9c2cb]">The next step is yours</p><h2 className="max-w-xl text-4xl sm:text-5xl">Walk into your next interview<br /><em>a little more yourself.</em></h2></div><Button size="xl" className="bg-white text-primary hover:bg-purple-50" asChild><Link to={destination}>Start a new session<ArrowRight className="ml-3 h-4 w-4" /></Link></Button></div></div></section>
    <footer className="container flex flex-wrap justify-between gap-3 border-t py-7 text-xs text-muted-foreground"><span className="font-semibold text-primary">MockAI · Your interview studio</span><span>Practice thoughtfully. Grow deliberately.</span></footer>
  </main>;
}
