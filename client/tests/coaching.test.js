import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { progressStats } from '../src/lib/progress';
import LaunchButton from '../src/components/LaunchButton';
let tree;
afterEach(()=>{if(tree)act(()=>tree.unmount());tree=null;vi.unstubAllGlobals();vi.useRealTimers();});
it('excludes fallback scores and compares matching role, mode, type and level',()=>{const base={status:'completed',evaluationSource:'gemini',role:'Developer',mode:'standard',type:'technical',experience:'entry'};const records=[{...base,score:75,completedAt:'2026-11-03'},{...base,score:99,evaluationSource:'heuristic',completedAt:'2026-11-04'},{...base,score:30,role:'Teacher',completedAt:'2026-11-02'},{...base,score:65,completedAt:'2026-11-01'}];expect(progressStats(records)).toMatchObject({averageScore:57,improvement:10,completed:4});expect(progressStats([]).averageScore).toBeNull();});
it('skips the portal when reduced motion is requested',async()=>{vi.stubGlobal('window',{matchMedia:()=>({matches:true})});let path;function Probe(){path=useLocation().pathname;return null;}await act(async()=>{tree=create(React.createElement(MemoryRouter,null,React.createElement(LaunchButton),React.createElement(Probe)));});act(()=>tree.root.findByType('button').props.onClick());expect(path).toBe('/create-interview');expect(JSON.stringify(tree.toJSON())).not.toContain('launch-portal');});

