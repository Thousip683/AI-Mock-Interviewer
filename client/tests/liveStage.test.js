import React from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
vi.mock('../src/components/AudioWaveform', () => ({ default: () => null }));
import LiveInterviewStage from '../src/components/LiveInterviewStage';
it('shows real session content and keeps microphone, finish, and pause controls independent', async () => {
  const toggleMute=vi.fn(), togglePause=vi.fn(), finish=vi.fn();
  let tree;
  await act(async()=>{tree=create(React.createElement(LiveInterviewStage,{interview:{role:'Cloud Architect'},live:{status:'speaking',muted:false,paused:false,toggleMute,togglePause,level:.4,caption:'Describe a resilient cloud architecture.'},elapsed:125,transcript:[{speaker:'interviewer',text:'Describe a resilient cloud architecture.'}],onFinish:finish}));});
  const buttons=tree.root.findAllByType('button');
  const text=JSON.stringify(tree.toJSON());
  expect(tree.root.findByProps({className:'conversation-timer'}).children.filter(x=>typeof x==='string').join('')).toBe('02:05');
  expect(text).toContain('Describe a resilient cloud architecture.');
  act(()=>buttons.find(b=>b.props['aria-pressed']===false && !b.props.title).props.onClick());
  expect(toggleMute).toHaveBeenCalledOnce();
  act(()=>buttons.find(b=>b.props.title==='Pause interview').props.onClick());
  expect(togglePause).toHaveBeenCalledOnce();
  expect(toggleMute).toHaveBeenCalledOnce();
  act(()=>tree.root.findAllByType('button').find(b=>b.props.className==='conversation-end').props.onClick());
  expect(finish).toHaveBeenCalledOnce();
  act(()=>tree.unmount());
});

it('updates fullscreen controls when the browser enters fullscreen or exits with Escape', async () => {
  const listeners=new Map();
  const doc={fullscreenElement:null,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
  vi.stubGlobal('document',doc);
  let tree;
  try {
    await act(async()=>{tree=create(React.createElement(LiveInterviewStage,{interview:{role:'Engineer'},live:{status:'listening'},elapsed:0,transcript:[]}));});
    expect(tree.root.findByProps({title:'Enter fullscreen'})).toBeDefined();
    act(()=>{doc.fullscreenElement={};listeners.get('fullscreenchange')();});
    expect(tree.root.findByProps({title:'Exit fullscreen'})).toBeDefined();
    act(()=>{doc.fullscreenElement=null;listeners.get('fullscreenchange')();});
    expect(tree.root.findByProps({title:'Enter fullscreen'})).toBeDefined();
  } finally { if(tree)act(()=>tree.unmount());vi.unstubAllGlobals(); }
});
