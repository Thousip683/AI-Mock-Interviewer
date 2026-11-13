import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Code2, Compass, GraduationCap, Sparkles, Target, Pause } from 'lucide-react';
import LaunchButton from './LaunchButton';
import DailyInspiration from './DailyInspiration';
const milestones = [
  { image: 'https://images.squarespace-cdn.com/content/5882531c2994ca603aa92146/1703181653126-1SUOH9QAY9XFSEA0XK0Q/Employer%2BResponsibilities%2BWhen%2BHiring%2BForeign%2BWorkers.jpg?format=1000w', alt: 'Candidate discussing their résumé with an interviewer', icon: Compass, title: 'Choose your direction.', tag: '01 / PREPARE FOR YOUR ROLE', text: 'From engineering to marketing, choose your role and bring your résumé. Make the conversation relevant to you.', to: '/create-interview', action: 'Build your interview' },
  { image: 'https://images.unsplash.com/photo-1534665482403-a909d0d97c67?auto=format&fit=crop&w=1000&q=85', alt: 'Developer practicing programming on a laptop', icon: Code2, title: 'Show how you think.', tag: '02 / GO BEYOND THE ANSWER', text: 'Talk through real problems. Add a coding round for technical roles and explain the decisions behind your solution.', to: '/create-interview?coding=true', action: 'Explore technical practice' },
  { image: 'https://images.unsplash.com/photo-1672173351437-f63d63fe1347?auto=format&fit=crop&w=1000&q=85', alt: 'Writing goals and next steps in a notebook', icon: Target, title: 'Make progress visible.', tag: '03 / COME BACK STRONGER', text: 'Turn feedback into focused practice. Check off your learning goals and watch comparable attempts develop over time.', to: '/feedback?tab=roadmap', action: 'Open your learning path' },
];
export function PublicNav() { return <nav className="career-nav"><Link to="/" className="career-brand"><GraduationCap/>MockAI<span>INTERVIEW STUDIO</span></Link><div><a href="/#experience">The journey</a><Link to="/dashboard">Your studio <ArrowUpRight size={15}/></Link></div></nav>; }
export default function LandingPage() {
  const root = useRef(null), [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('revealed'); }), { threshold: .15 });
    element.querySelectorAll('[data-reveal]').forEach(item => { item.classList.add('will-reveal'); observer.observe(item); });
    let frame;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const box = element.querySelector('.career-journey').getBoundingClientRect();
      element.style.setProperty('--journey-progress', String(Math.min(1, Math.max(0, (window.innerHeight * .65 - box.top) / box.height))));
    }); };
    window.addEventListener('scroll', update, { passive: true }); update();
    return () => { observer.disconnect(); window.removeEventListener('scroll', update); cancelAnimationFrame(frame); };
  }, []);
  return <main ref={root} className={`career-site ${paused ? 'motion-paused' : ''}`}>
    <PublicNav/>
    <section className="career-hero"><div className="hero-copy"><div className="eyebrow"><span/> YOUR POTENTIAL. IN MOTION.</div><h1>Your next chapter<br/>starts with <em>you.</em></h1><p>You have a story worth telling.<br/>Practice the conversation that opens your next door.</p><LaunchButton>Interview for a role</LaunchButton><div className="hero-footnote">Personalized interviews · Your pace</div></div>
    <figure className="success-photo"><div className="photo-frame"><img src="/images/student-success.png" alt="A student with a burgundy backpack climbing sunlit stone steps toward a new opportunity" width="1122" height="1402" fetchPriority="high"/><div className="photo-shade"/><div className="photo-caption"><span>THE NEXT STEP IS YOURS</span><strong>From possibility<br/>to <em>progress.</em></strong></div></div><div className="photo-note"><Sparkles size={18}/><span>Every step forward<br/><strong>starts with believing you can.</strong></span></div><figcaption>One step. One conversation. A new beginning.</figcaption></figure>
    <div className="hero-bottom"><a href="#experience">SCROLL TO FIND YOUR PATH <span>↓</span></a><button onClick={() => setPaused(!paused)} aria-pressed={paused}><Pause size={14}/>{paused ? 'Resume motion' : 'Pause ambient motion'}</button></div></section>
    <div className="career-strip"><span>REAL CONVERSATIONS</span><i>✦</i><span>PERSONAL FEEDBACK</span><i>✦</i><span>MEASURABLE PROGRESS</span><i>✦</i><span>YOUR NEXT CHAPTER</span></div>
    <section id="experience" className="career-journey"><div className="journey-heading" data-reveal><div className="eyebrow">A LITTLE PRACTICE. A DIFFERENT FUTURE.</div><h2>Every great career<br/>starts with a <em>first step.</em></h2><p>Follow the path from “Where do I begin?” to “I’m ready.”</p></div><div className="journey-track" aria-hidden="true"><div className="journey-fill"/><div className="journey-marker"><ArrowUpRight size={17}/></div></div>{milestones.map((item, i) => <div key={item.tag} className={`journey-step journey-step-${i}`}><article className="journey-card" data-reveal><div className="milestone-icon"><item.icon size={30}/></div><div><div className="eyebrow">{item.tag}</div><h3>{item.title}</h3><p>{item.text}</p><Link to={item.to}>{item.action}<ArrowUpRight size={18}/></Link></div><span className="milestone-number">0{i + 1}</span></article><figure className="journey-image" data-reveal><img src={item.image} alt={item.alt} width="448" height="368" loading="lazy" decoding="async"/></figure></div>)}</section>
    <DailyInspiration/>
    <section className="career-finale" data-reveal><div className="eyebrow">NO PERFECT ANSWERS REQUIRED</div><h2>Meet your<br/><em>next possibility.</em></h2><p>Start with yourself. We’ll help with the practice.</p><LaunchButton>Interview for a role</LaunchButton></section><footer className="career-footer"><Link to="/">MockAI / INTERVIEW STUDIO</Link><span>Practice. Reflect. Grow.</span><Link to="/privacy">Privacy & your data</Link></footer>
  </main>;
}
