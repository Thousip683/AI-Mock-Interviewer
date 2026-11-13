import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
export default function LaunchButton({ to = '/quick-interview', children = 'Start the interview', variant }) {
  const [launching, setLaunching] = useState(false);
  const timer = useRef();
  const navigate = useNavigate();
  useEffect(() => () => clearTimeout(timer.current), []);
  function launch() {
    if (launching) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { navigate(to); return; }
    setLaunching(true); timer.current = setTimeout(() => navigate(to), 850);
  }
  const cls = `launch-button${variant === 'secondary' ? ' launch-button--secondary' : ''}${launching ? ' launching' : ''}`;
  return <><button className={cls} onClick={launch} disabled={launching}><span className="reactor-core" aria-hidden="true"/><span>{launching ? 'Opening your next chapter…' : children}</span><ArrowUpRight size={20}/></button>{launching && <div className="launch-portal" aria-hidden="true"><span/><span/><span/><b>YOUR NEXT CHAPTER</b></div>}</>;
}
