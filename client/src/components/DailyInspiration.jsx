import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, Lightbulb, Quote } from 'lucide-react';
import { dailyTips, encouragement, localDayIndex, tipForDate } from '@/lib/dailyTips';

export default function DailyInspiration() {
  const [today, setToday] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const [completed, setCompleted] = useState({});
  useEffect(() => { const timer = setInterval(() => setToday(new Date()), 60000); return () => clearInterval(timer); }, []);
  const day = localDayIndex(today);
  const tip = offset === 0 ? tipForDate(today) : dailyTips[((day + offset) % dailyTips.length + dailyTips.length) % dailyTips.length];
  const key = `${day}:${offset}`;
  return <section className="inspiration-section" aria-label="Daily interview inspiration">
    <div className="inspiration-heading" data-reveal><div><p className="eyebrow">A LITTLE ENCOURAGEMENT, EVERY DAY</p><h2>Build confidence.<br/><em>One day at a time.</em></h2></div><p>A thoughtful reminder. One useful habit.<br/>A small step closer to the conversation that matters.</p></div>
    <div className="inspiration-grid">
      <article className="quote-feature" data-reveal><Quote aria-hidden="true" size={36}/><span className="eyebrow">A NOTE FOR YOUR JOURNEY</span><blockquote>“{encouragement[((day % encouragement.length) + encouragement.length) % encouragement.length]}”</blockquote><p>— A reminder from MockAI</p><div className="quote-steps" aria-hidden="true"><i/><i/><i/><i/></div></article>
      <article className="daily-tip" data-reveal><div className="tip-header"><span><Lightbulb size={17}/> {offset === 0 ? 'TODAY’S INTERVIEW TIP' : 'MORE TO PRACTICE'}</span><time dateTime={`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`}>{today.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></div>
        <div className="tip-content" key={key}><p className="eyebrow">{tip.category}</p><h3>{tip.title}</h3><p>{tip.tip}</p><div className="tip-challenge"><span><Clock size={14}/> YOUR {tip.minutes}-MINUTE PRACTICE</span><p>{tip.task}</p><button className={completed[key] ? 'task-done' : ''} aria-pressed={!!completed[key]} onClick={()=>setCompleted(previous=>({...previous,[key]:!previous[key]}))}><Check size={15}/>{completed[key] ? 'Practiced today' : 'Mark as practiced'}</button></div></div>
        <div className="tip-controls"><button aria-label="Previous interview tip" onClick={()=>setOffset((offset+dailyTips.length-1)%dailyTips.length)}><ArrowLeft size={17}/></button><span aria-live="polite">{offset===0?'A fresh tip each day':`${offset+1} / ${dailyTips.length} tips`}</span><button aria-label="Next interview tip" onClick={()=>setOffset((offset+1)%dailyTips.length)}><ArrowRight size={17}/></button></div>
      </article>
    </div>
    <div className="encouragement-notes" data-reveal><p>“Your first attempt is a starting point, not a verdict.”</p><Link to="/quick-interview">Put today’s tip into practice <ArrowRight size={16}/></Link></div>
  </section>;
}
