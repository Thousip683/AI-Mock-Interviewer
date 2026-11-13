import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
export default function DeviceCheck() {
  const [status,setStatus]=useState(''),[active,setActive]=useState(false),[level,setLevel]=useState(0);
  const resources=useRef(null);
  function stop(){const r=resources.current;if(r){r.cancelled=true;r.stream?.getTracks().forEach(t=>t.stop());clearInterval(r.interval);clearTimeout(r.timeout);void r.context?.close().catch(()=>{});}resources.current=null;}
  useEffect(()=>()=>stop(),[]);
  async function test(){stop();const r={};resources.current=r;setActive(true);setStatus('Allow microphone access. Speak to move the meter.');try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access needs HTTPS or localhost.');
    r.stream=await navigator.mediaDevices.getUserMedia({audio:true});if(r.cancelled){r.stream.getTracks().forEach(t=>t.stop());return;}
    const Audio=window.AudioContext||window.webkitAudioContext;r.context=new Audio();await r.context.resume();if(r.cancelled)return;
    const analyser=r.context.createAnalyser();analyser.fftSize=256;r.context.createMediaStreamSource(r.stream).connect(analyser);const samples=new Uint8Array(256);
    r.interval=setInterval(()=>{analyser.getByteTimeDomainData(samples);setLevel(Math.min(100,Math.sqrt(samples.reduce((sum,v)=>sum+(v-128)**2,0)/256)*8));},100);
    r.timeout=setTimeout(()=>{stop();setActive(false);setLevel(0);setStatus('Check complete. The microphone is off.');},8000);
  }catch(e){if(r.cancelled)return;stop();setActive(false);setStatus(e.message||'Could not test microphone. Check permission.');}}
  async function speaker(){try{const Audio=window.AudioContext||window.webkitAudioContext;const context=new Audio();await context.resume();const oscillator=context.createOscillator(),gain=context.createGain();gain.gain.value=.08;oscillator.frequency.value=440;oscillator.connect(gain).connect(context.destination);oscillator.onended=()=>void context.close();oscillator.start();oscillator.stop(context.currentTime+.35);setStatus('Did you hear the short tone? If not, check your output volume.');}catch{setStatus('Speaker check is unavailable in this browser.');}}
  return <section className="mb-5 rounded-xl border p-4 text-left"><h2 className="text-xl">Check your setup</h2><p className="my-2 text-xs text-muted-foreground">Eight-second local microphone check. No audio is saved or sent.</p><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={test} disabled={active}>Test microphone</Button><Button variant="outline" onClick={speaker}>Test speaker</Button>{active&&<Button variant="ghost" onClick={()=>{stop();setActive(false);setLevel(0);setStatus('Microphone off.');}}>Stop check</Button>}</div><meter className="mt-3 w-full" min="0" max="100" value={level} aria-label="Microphone level"/><p role="status" className="mt-2 text-xs">{status}</p></section>;
}
