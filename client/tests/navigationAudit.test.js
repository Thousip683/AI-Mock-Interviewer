import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const { auth, get, post, signOut } = vi.hoisted(() => ({ auth: { signedIn: true }, get: vi.fn(), post: vi.fn(), signOut: vi.fn() }));
vi.mock('@clerk/react', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: auth.signedIn, user: { firstName: 'Tester' } }),
  useClerk: () => ({ signOut }),
  Show: ({ when, children }) => ((when === 'signed-in') === auth.signedIn ? children : null),
  SignIn: () => React.createElement('p', null, 'Clerk sign-in integration'),
  SignUp: () => React.createElement('p', null, 'Clerk sign-up integration'),
}));
vi.mock('@/lib/api', () => ({ default: { get, post } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }) => React.createElement('select', { value, onChange: event => onValueChange(event.target.value) }, children),
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }) => React.createElement(React.Fragment, null, children),
  SelectItem: ({ value, children }) => React.createElement('option', { value }, children),
}));
vi.mock('recharts', () => Object.fromEntries(['PieChart', 'Pie', 'Cell', 'BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Radar'].map(name => [name, () => null])));
import App from '../src/App.jsx';
import { loginDestination } from '../src/lib/navigation.js';
let tree, location, navigate;
const record = { _id: 'standard', role: 'Backend Developer', type: 'technical', experience: 'mid', questionCount: 2, status: 'pending', questions: [{ text: 'Question one' }], answers: [] };
const report = { score: 60, role: 'Backend Developer', questionFeedback: [{ question: 'Q', answer: 'A', score: 60 }], roadmap: [] };
function Probe() { location = useLocation(); navigate = useNavigate(); return null; }
async function render(path) {
  await act(async () => { tree = create(React.createElement(MemoryRouter, { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Probe), React.createElement(App))); });
}
function output() { return JSON.stringify(tree.toJSON()); }
function button(label) { return tree.root.findAllByType('button').find(item => item.children.some(child => typeof child === 'string' && child.trim() === label)); }
async function clickLink(href) {
  const link = tree.root.findAllByType('a').find(item => item.props.href === href);
  expect(link).toBeDefined();
  await act(async () => { link.props.onClick({ button: 0, defaultPrevented: false, preventDefault() {} }); });
}
beforeEach(() => {
  vi.resetAllMocks(); auth.signedIn = true;
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  get.mockImplementation(async url => {
    if (url === '/interviews') return { data: [{ ...record, _id: 'saved', status: 'completed', score: 60 }] };
    if (url.endsWith('/feedback')) return { data: report };
    if (url.endsWith('/questions')) return { data: [{ text: 'Question one' }] };
    if (url === '/interviews/missing') throw { response: { status: 404, data: { error: 'Interview not found' } } };
    if (url === '/interviews/live') return { data: { ...record, _id: 'live', mode: 'live' } };
    return { data: structuredClone(record) };
  });
  post.mockImplementation(async url => ({ data: url === '/interviews' ? { _id: 'new' } : url.endsWith('/followup') ? { question: { text: 'Question two' }, isComplete: false } : { success: true } }));
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; vi.unstubAllGlobals(); });

it.each(['/dashboard', '/create-interview', '/interview/standard', '/feedback', '/feedback/saved'])('protects signed-out route %s and preserves its destination', async path => {
  auth.signedIn = false; await render(path);
  expect(location.pathname).toBe('/login');
  expect(new URLSearchParams(location.search).get('redirect')).toBe(path);
  expect(output()).toContain('Clerk sign-in integration');
});
it.each([
  ['/', 'Your next chapter'], ['/dashboard', 'Your Interviews'], ['/create-interview', 'Build your interview'],
  ['/interview/standard', 'Ready to Begin?'], ['/interview/live', 'Start live interview'],
  ['/feedback', 'Interview Feedback'], ['/feedback/saved', 'Interview Feedback'],
  ['/interview/missing', 'Something went wrong'], ['/unknown-route', 'Page not found'],
])('renders route %s', async (path, text) => { await render(path); expect(output()).toContain(text); });
it.each([['/login', 'Clerk sign-in integration'], ['/sign-up', 'Clerk sign-up integration']])('renders public authentication page %s', async (path, text) => {
  auth.signedIn = false; await render(path); expect(output()).toContain(text); await clickLink('/'); expect(location.pathname).toBe('/');
});
it('supports logo, navigation, account menu, signed-out mobile menu, back and forward', async () => {
  await render('/'); await clickLink('/dashboard'); expect(location.pathname).toBe('/dashboard');
  await clickLink('/create-interview'); expect(location.pathname).toBe('/create-interview');
  await act(async () => navigate(-1)); expect(location.pathname).toBe('/dashboard');
  await act(async () => navigate(1)); expect(location.pathname).toBe('/create-interview');
  await clickLink('/'); expect(location.pathname).toBe('/');
  act(() => tree.root.findByProps({ 'aria-label': 'Account menu' }).props.onClick());
  expect(tree.root.findByProps({ id: 'account-menu' })).toBeDefined();
  await act(async () => { await button('Sign Out').props.onClick(); });
  expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/' });
  auth.signedIn = false; act(() => tree.update(React.createElement(MemoryRouter, null, React.createElement(Probe), React.createElement(App))));
  act(() => tree.root.findByProps({ 'aria-label': 'Open navigation' }).props.onClick());
  expect(tree.root.findByProps({ id: 'mobile-navigation' }).findAllByType('a').map(item => item.props.href)).toEqual(['/login', '/sign-up']);
});
it('validates configuration, preserves wizard choices and handles a failed create submission', async () => {
  await render('/create-interview'); expect(button('Next').props.disabled).toBe(true);
  const values = ['Backend Developer', 'technical', 'mid'];
  act(() => tree.root.findAllByType('select').forEach((item, index) => item.props.onChange({ target: { value: values[index] } })));
  await act(async () => button('Next').props.onClick()); expect(output()).toContain('Additional Details');
  act(() => tree.root.findByProps({ id: 'job-description' }).props.onChange({ target: { value: 'Build APIs' } }));
  await act(async () => button('Review').props.onClick());
  post.mockRejectedValueOnce({ response: { data: { error: 'Service unavailable' } } });
  await act(async () => { await button('Prepare for interview').props.onClick(); }); expect(output()).toContain('Service unavailable');
  await act(async () => { await button('Prepare for interview').props.onClick(); });
  expect(post).toHaveBeenLastCalledWith('/interviews', expect.objectContaining({ role: 'Backend Developer', jobDescription: 'Build APIs' }));
  expect(location.pathname).toBe('/interview/new');
});
it('creates a fresh interview when Practice again is selected', async () => {
  await render('/feedback/saved');
  await act(async () => { await button('Practice again').props.onClick(); });
  expect(post).toHaveBeenCalledWith('/interviews', expect.objectContaining({ role: 'Backend Developer' }));
  expect(location.pathname).toBe('/interview/new');
});
it('keeps API failures distinguishable from empty history and retries them', async () => {
  get.mockRejectedValueOnce(new Error('offline')); await render('/dashboard');
  expect(output()).toContain('Unable to load interviews'); expect(output()).not.toContain('No interviews yet');
  await act(async () => { await button('Try again').props.onClick(); }); expect(output()).toContain('Your Interviews');
});
it('preserves the answer after a follow-up failure and does not silently submit', async () => {
  await render('/interview/standard'); act(() => button('Start Interview').props.onClick());
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'My answer' } }));
  post.mockRejectedValueOnce({ response: { data: { error: 'Follow-up unavailable' } } });
  await act(async () => { await button('Next').props.onClick(); });
  expect(tree.root.findByType('textarea').props.value).toBe('My answer');
  expect(output()).toContain('Follow-up unavailable');
  expect(post.mock.calls.some(([url]) => url.endsWith('/submit'))).toBe(false);
});
it('revisits a question without duplicating answers, and submits the edited answer', async () => {
  await render('/interview/standard'); act(() => button('Start Interview').props.onClick());
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'First answer' } }));
  await act(async () => { await button('Next').props.onClick(); });
  act(() => button('Previous').props.onClick());
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'Edited answer' } }));
  await act(async () => { await button('Next').props.onClick(); });
  act(() => tree.root.findByType('textarea').props.onChange({ target: { value: 'Second answer' } }));
  await act(async () => { await button('Complete').props.onClick(); });
  expect(post).toHaveBeenCalledWith('/interviews/standard/submit', expect.objectContaining({ answers: [expect.objectContaining({ answer: 'Edited answer' }), expect.objectContaining({ answer: 'Second answer' })] }));
  expect(location.pathname).toBe('/feedback/standard');
});
it('opens the requested roadmap tab from a real deep link', async () => {
  await render('/feedback/saved?tab=roadmap');
  expect(tree.root.findAll(item => item.props.value === 'roadmap' && typeof item.props.onValueChange === 'function').length).toBeGreaterThan(0);
});
it('accepts only known local post-login destinations', () => {
  expect(loginDestination({ search: '?redirect=%2Ffeedback%2Fsaved', state: null })).toBe('/feedback/saved');
  for (const target of ['https://evil.test', '//evil.test', '/login', '/unknown']) expect(loginDestination({ search: `?redirect=${encodeURIComponent(target)}` })).toBe('/dashboard');
});
