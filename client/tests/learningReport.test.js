import RoadmapTree from '../src/components/RoadmapTree.jsx';
import FeedbackCharts from '../src/components/FeedbackCharts.jsx';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: { get, post } }));
vi.mock('@/components/ui/tabs', () => Object.fromEntries(['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'].map(name => [name, ({ children }) => React.createElement('div', null, children)])));
vi.mock('recharts', () => Object.fromEntries(['PieChart', 'Pie', 'Cell', 'BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Radar'].map(name => [name, () => null])));
import Feedback from '../src/components/Feedback.jsx';
import InterviewerAvatar from '../src/components/InterviewerAvatar.jsx';

it('reopens saved reference answers and roadmap, and can refresh the saved report', async () => {
  const report = { score: 40, questionFeedback: [{ question: 'Explain indexes', answer: 'Unsure', score: 40, correctAnswer: 'Indexes trade write costs for read speed.', missingConcepts: ['Write overhead'], studyPoints: ['Read EXPLAIN plans'], summary: 'Measure first', practiceTask: 'Compare plans' }], roadmap: [{ topic: 'Database indexing', priority: 'high', steps: ['Analyze a query plan'], practiceTask: 'Benchmark a query', successCriteria: 'Explain the measured trade-off' }] };
  get.mockImplementation(async url => ({ data: url === '/interviews' ? [{ _id: 'saved', status: 'completed' }] : report }));
  post.mockResolvedValue({ data: report });
  let tree;
  await act(async () => { tree = create(React.createElement(MemoryRouter, { initialEntries: ['/feedback/saved'] }, React.createElement(Routes, null, React.createElement(Route, { path: '/feedback/:id', element: React.createElement(Feedback) })))); });
  const output = JSON.stringify(tree.toJSON());
  for (const text of ['40/100', report.questionFeedback[0].correctAnswer, 'Read EXPLAIN plans', 'Database indexing', 'Explain the measured trade-off']) expect(output).toContain(text);
  const refresh = tree.root.findAllByType('button').find(button => button.children.includes('Re-analyze saved answers'));
  await act(async () => { await refresh.props.onClick(); });
  expect(post).toHaveBeenCalledWith('/interviews/saved/feedback/refresh');
  act(() => tree.unmount());
});
it('animates the interviewer only in the speaking state', () => {
  const tree = create(React.createElement(InterviewerAvatar, { speaking: true }));
  expect(JSON.stringify(tree.toJSON())).toContain('interviewer-mouth speaking');
  tree.update(React.createElement(InterviewerAvatar, { speaking: false }));
  expect(JSON.stringify(tree.toJSON())).not.toContain('interviewer-mouth speaking');
  tree.unmount();
});

it('expands and collapses roadmap branches with their saved concept notes', () => {
  const tree = create(React.createElement(RoadmapTree, { roadmap: [
    { topic: 'Indexes', summary: 'Indexes trade write work for faster reads.', keyPoints: ['Indexes occupy storage'], steps: ['Read a query plan'] },
    { topic: 'Caching', summary: 'Reuse expensive results.', keyPoints: ['Plan for invalidation'] },
  ] }));
  expect(tree.root.findAllByType('details').map(item => item.props.open)).toEqual([true, false]);
  act(() => tree.root.findAllByType('button').find(item => item.children.includes('Expand all')).props.onClick());
  expect(tree.root.findAllByType('details').every(item => item.props.open)).toBe(true);
  act(() => tree.root.findAllByType('button').find(item => item.children.includes('Collapse all')).props.onClick());
  expect(tree.root.findAllByType('details').some(item => item.props.open)).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain('Indexes occupy storage');
  tree.unmount();
});
it('filters chart table scores using the keyboard-accessible band buttons', () => {
  const tree = create(React.createElement(FeedbackCharts, { feedback: { questionFeedback: [
    { question: 'Strong answer', score: 90 }, { question: 'Weak answer', score: 30 },
  ] } }));
  const band = tree.root.findAllByType('button').find(item => item.findAllByType('span').some(span => span.children.includes('Focus first')));
  act(() => band.props.onClick());
  let table = JSON.stringify(tree.root.findByType('table').toJSON?.() || tree.root.findByType('table').findAllByType('th').map(item => item.children));
  expect(table).toContain('Weak answer');
  expect(table).not.toContain('Strong answer');
  act(() => tree.root.findAllByType('button').find(item => item.children.includes('Clear filter')).props.onClick());
  expect(tree.root.findByType('tbody').findAllByType('tr')).toHaveLength(2);
  tree.unmount();
});
