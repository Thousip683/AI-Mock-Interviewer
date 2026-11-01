export default function InterviewerAvatar({ speaking, busy }) {
  return <div className="relative mb-6" role="img" aria-label={speaking ? 'Animated interviewer speaking' : 'Animated interviewer listening'}>
    <svg viewBox="0 0 200 220" className="h-48 w-44" aria-hidden="true">
      <circle cx="100" cy="100" r="90" fill="#401626" />
      <path d="M25 220v-27q0-46 75-46t75 46v27" fill="#87344f" />
      <path d="m74 153 26 35 26-35" fill="#f4f1ff" />
      <path d="M85 133v27q15 17 30 0v-27" fill="#c98d6a" />
      <ellipse cx="100" cy="92" rx="43" ry="56" fill="#e6b38f" />
      <path d="M57 85q-11-67 44-65 53 0 43 66l-17-37q-30 19-63 13z" fill="#27232b" />
      <path d="M72 84h18m20 0h18" stroke="#49352e" strokeWidth="4" strokeLinecap="round" />
      <circle cx="82" cy="94" r="3" fill="#27232b" /><circle cx="118" cy="94" r="3" fill="#27232b" />
      <path d="m100 96-4 17h8" fill="none" stroke="#ba7b59" strokeWidth="2" />
      <ellipse className={speaking ? 'interviewer-mouth speaking' : 'interviewer-mouth'} cx="100" cy="128" rx="12" ry="3" fill="#773e40" />
      <path d="M55 90v29m90-29v29M55 90q0-66 45-66t45 66" stroke="#d69aa9" strokeWidth="7" fill="none" />
      <path d="M145 117q0 20-27 20" stroke="#d69aa9" strokeWidth="4" fill="none" /><circle cx="116" cy="137" r="4" fill="#f5e1e5" />
    </svg>
    {busy && <span className="absolute bottom-1 right-0 rounded-full bg-violet-600 px-3 py-1 text-xs">Connecting…</span>}
  </div>;
}
