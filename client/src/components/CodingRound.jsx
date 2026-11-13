import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

const starters = { javascript: 'function solve(input) {\n  // Return your result here\n  return null;\n}', python: 'def solve(input):\n    # Return your result here\n    return None' };
export default function CodingRound() {
  const [problems,setProblems]=useState([]), [selected,setSelected]=useState(''), [language,setLanguage]=useState('javascript');
  const [code,setCode]=useState(starters.javascript), [result,setResult]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [difficulty,setDifficulty]=useState('all'), [topic,setTopic]=useState('all'), [hint,setHint]=useState(false), [attempts,setAttempts]=useState([]);
  const [minutes,setMinutes]=useState(30), [deadline,setDeadline]=useState(null), [now,setNow]=useState(Date.now());
  const problem=problems.find(p=>p.id===selected);
  const draftKey=`coding:${selected}:${language}`;
  useEffect(()=>{api.get('/coding/problems').then(({data})=>{setProblems(data);setSelected(data[0]?.id||'');}).catch(()=>setError('Could not load problems. Refresh to retry.'));},[]);
  useEffect(()=>{if(!selected)return;try{setCode(sessionStorage.getItem(draftKey)||starters[language]);}catch{setCode(starters[language]);}setResult(null);setHint(false);},[draftKey,selected,language]);
  useEffect(()=>{if(!deadline)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[deadline]);
  async function history(){try{const {data}=await api.get('/coding/attempts');setAttempts(data);}catch{setError('Saved attempts are unavailable. Check the database connection.');}}
  function edit(value){setCode(value);try{sessionStorage.setItem(draftKey,value);}catch{}}
  async function execute(submit){setBusy(true);setError('');setResult(null);try{const {data}=await api.post('/coding/execute',{problemId:selected,language,code,submit,hintUsed:hint},{timeout:120000});setResult(data);if(submit)await history();}catch(e){setError(e.response?.data?.error||'Execution failed. Your code remains in the editor.');}finally{setBusy(false);}}
  const seconds=deadline?Math.max(0,Math.ceil((deadline-now)/1000)):null;
  return <main className="container py-8">
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Your coding studio</p>
    <h1 className="mt-2 text-4xl sm:text-5xl">Think it through. Make it work.</h1>
    <p className="mt-3 text-muted-foreground">Practice a focused coding round, explore examples, and submit your solution.</p>
    <div className="my-6 flex flex-wrap items-end gap-4">
      <label className="text-sm">Difficulty<select disabled={busy} value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="mt-2 block rounded-xl border bg-white p-3"><option value="all">All levels</option><option>easy</option><option>medium</option></select></label>
      <label className="text-sm">Topic<select disabled={busy} value={topic} onChange={e=>setTopic(e.target.value)} className="mt-2 block rounded-xl border bg-white p-3"><option value="all">All topics</option>{[...new Set(problems.map(p=>p.topic))].map(t=><option key={t}>{t}</option>)}</select></label>
      <label className="text-sm">Practice timer<select disabled={!!deadline} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} className="mt-2 block rounded-xl border bg-white p-3">{[20,30,45].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label>
      <Button variant="outline" onClick={()=>{setNow(Date.now());setDeadline(deadline?null:Date.now()+minutes*60000);}}>{deadline?'Stop timer':'Start timer'}</Button>
      {seconds!==null&&<span role="timer" className="p-3 font-mono text-primary">{seconds===0?'Time is up — you can still submit':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}</span>}
    </div>
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-2" aria-label="Coding problems">{problems.filter(p=>(difficulty==='all'||p.difficulty===difficulty)&&(topic==='all'||p.topic===topic)).map(p=><button disabled={busy} key={p.id} onClick={()=>setSelected(p.id)} className={`block w-full rounded-xl border p-3 text-left text-sm ${selected===p.id?'border-primary bg-primary/10 text-primary':'bg-white'}`}><strong>{p.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{p.difficulty} · {p.topic}</span></button>)}</aside>
      {problem&&<section className="surface-card rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-3xl">{problem.title}</h2><p className="mt-3 leading-7">{problem.description}</p><p className="mt-2 text-sm text-muted-foreground">{problem.constraints}</p>
        <div className="my-5 grid gap-3 sm:grid-cols-2">{problem.examples.map(([input,output],i)=><pre key={i} className="overflow-auto rounded-xl bg-muted p-4 text-xs">Example {i+1}{'\n'}Input: {JSON.stringify(input)}{'\n'}Output: {JSON.stringify(output)}</pre>)}</div>
        <Button variant="ghost" onClick={()=>setHint(true)}>Reveal hint</Button>{hint&&<p className="my-3 rounded-xl bg-primary/5 p-4 text-sm">{problem.hint}</p>}
        <div className="my-4 flex items-center justify-between gap-3"><label className="text-sm">Language <select disabled={busy} value={language} onChange={e=>setLanguage(e.target.value)} className="ml-2 rounded-lg border p-2"><option value="javascript">JavaScript</option><option value="python">Python</option></select></label><Button disabled={busy} variant="ghost" onClick={()=>{if(window.confirm('Replace your code with starter code?'))edit(starters[language]);}}>Reset code</Button></div>
        <label htmlFor="coding-editor" className="sr-only">Solution code</label><textarea id="coding-editor" spellCheck={false} disabled={busy} value={code} onChange={e=>edit(e.target.value)} onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();const start=e.target.selectionStart,end=e.target.selectionEnd;edit(code.slice(0,start)+'    '+code.slice(end));requestAnimationFrame(()=>e.target.setSelectionRange(start+4,start+4));}}} className="min-h-80 w-full resize-y rounded-xl border bg-[#260d17] p-5 font-mono text-sm leading-7 text-white" />
        <div className="mt-4 flex gap-3"><Button disabled={busy} variant="outline" onClick={()=>execute(false)}>Run examples</Button><Button disabled={busy} onClick={()=>execute(true)}>{busy?'Evaluating…':'Submit solution'}</Button></div>
        {result&&<div className="mt-6 rounded-xl border p-5" role="status"><h3 className="font-semibold">{result.passed}/{result.total} tests passed · {result.score}%{result.saved?' · Saved':''}</h3><p className="my-3 whitespace-pre-wrap text-sm">{result.feedback}</p>{result.results.map((r,i)=><details key={i} className="border-t py-3"><summary>Test {i+1}{i>1?' (hidden)':''}: {r.passed?'Passed':r.status==='Accepted'?'Wrong answer':r.status}</summary>{i<2&&<pre className="mt-3 overflow-auto text-xs">Expected: {JSON.stringify(r.expected)}{'\n'}Actual: {r.output}</pre>}<p className="mt-2 text-xs">Time: {r.time??'—'} s · Memory: {r.memory??'—'} KB</p></details>)}</div>}
      </section>}
    </div>
    {error&&<p role="alert" className="my-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <section className="my-8 rounded-2xl border bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-2xl">Your saved attempts</h2><Button variant="outline" onClick={history}>Load attempts</Button></div>{attempts.map(a=><details key={a._id} className="mt-4 border-t pt-4"><summary>{problems.find(p=>p.id===a.problemId)?.title||a.problemId} · {a.language} · {a.score}% · {new Date(a.createdAt).toLocaleString()}</summary><p className="mt-3 whitespace-pre-wrap text-sm">{a.feedback}</p><p className="text-xs">{a.hintUsed?"Hint used":"No hint used"}</p><pre className="mt-3 overflow-auto rounded-xl bg-muted p-4 text-xs">{a.code}</pre></details>)}</section>
  </main>;
}
