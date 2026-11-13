import { describe, it, expect } from 'vitest';
import { problems } from '../services/codingProblems.js';
const references = {
  'sum-array': a=>a.reduce((s,n)=>s+n,0), maximum:a=>a.length?Math.max(...a):null,
  reverse:s=>[...s].reverse().join(''), palindrome:s=>s===[...s].reverse().join(''),
  unique:a=>[...new Set(a)], evens:a=>a.filter(n=>n%2===0),
  'count-vowels':s=>(s.match(/[aeiou]/gi)||[]).length, sorted:a=>[...a].sort((a,b)=>a-b),
  second:a=>[...new Set(a)].sort((a,b)=>b-a)[1]??null,
  binary:({numbers,target})=>numbers.indexOf(target),
  'two-sum':({numbers,target})=>numbers.some((n,i)=>numbers.some((m,j)=>i!==j&&n+m===target)),
  rotate:({numbers,k})=>numbers.length?[...numbers.slice(-(k%numbers.length)),...numbers.slice(0,-(k%numbers.length))]:[],
  anagram:([a,b])=>[...a].sort().join('')===[...b].sort().join(''),
  merge:([a,b])=>[...a,...b].sort((a,b)=>a-b),
  streak:a=>{const s=new Set(a);let max=0;for(const n of s){if(s.has(n-1))continue;let k=n;while(s.has(k))k++;max=Math.max(max,k-n);}return max;},
};
describe('curated coding bank',()=>{
  it('has unique identifiers and verified sample and hidden expectations',()=>{
    expect(new Set(problems.map(p=>p.id)).size).toBe(15);
    for(const p of problems){expect(p.tests.length).toBeGreaterThan(2);for(const [input,expected] of p.tests)expect(references[p.id](structuredClone(input)),p.id).toEqual(expected);}
  });
});
