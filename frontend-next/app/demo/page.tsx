'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Video data ────────────────────────────────────────────────────────────────
// Replace `videoId` with your YouTube video ID (e.g. "dQw4w9WgXcQ")
// or set `vimeoId` for Vimeo. Leave as placeholder until recorded.
// `thumb` is optional — if omitted, the auto-generated YouTube thumbnail is used.

interface DemoVideo {
  id: string
  title: string
  description: string
  duration: string
  videoId: string          // YouTube video ID — replace with yours
  isPlaceholder?: boolean  // true = not recorded yet
  icon: React.ReactNode
}

const VIDEOS: DemoVideo[] = [
  {
    id: 'overview',
    title: 'Aimoro Overview',
    description: 'Everything you need to know about Aimoro Smart Sourcing in under 2 minutes.',
    duration: '2:00',
    videoId: 'PLACEHOLDER_OVERVIEW',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
  },
  {
    id: 'find',
    title: 'Finding Suppliers',
    description: 'Search any product and get AI-scored supplier results from Alibaba, AliExpress & more.',
    duration: '1:30',
    videoId: 'PLACEHOLDER_FIND',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'score',
    title: 'The Aimoro Score',
    description: 'How the AI scores suppliers on price, rating, delivery speed, and verification — and why it matters.',
    duration: '1:15',
    videoId: 'PLACEHOLDER_SCORE',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'saved',
    title: 'Managing Your Shortlist',
    description: 'Save suppliers, add notes, set status tags, and export your shortlist to CSV.',
    duration: '1:45',
    videoId: 'PLACEHOLDER_SAVED',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    id: 'compare',
    title: 'Comparing Suppliers',
    description: 'Select up to 3 suppliers and compare them side-by-side with best-value highlights.',
    duration: '0:55',
    videoId: 'PLACEHOLDER_COMPARE',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'negotiate',
    title: 'Drafting Negotiation Emails',
    description: 'Pick a template, set your target price, and let Aimoro AI write the negotiation email.',
    duration: '1:40',
    videoId: 'PLACEHOLDER_NEGOTIATE',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics & AI Report',
    description: 'Track your supplier portfolio with charts and generate an AI sourcing report in one click.',
    duration: '1:20',
    videoId: 'PLACEHOLDER_ANALYTICS',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    description: 'Ask anything about sourcing — strategy, pricing, supplier vetting, platform comparisons.',
    duration: '1:00',
    videoId: 'PLACEHOLDER_AI',
    isPlaceholder: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

// ── Video Thumbnail Card ──────────────────────────────────────────────────────

function VideoCard({ video, onClick }: { video: DemoVideo; onClick: () => void }) {
  return (
    <div
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#c40000]/20 transition-all cursor-pointer"
      onClick={video.isPlaceholder ? undefined : onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[#0f172a] to-[#1e293b] overflow-hidden">
        {/* If not a placeholder, show YouTube thumbnail */}
        {!video.isPlaceholder && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Feature icon watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-white/10 scale-[3] ${!video.isPlaceholder ? 'opacity-0' : ''}`}>
            {video.icon}
          </div>
        </div>

        {/* Play button */}
        <div className={`absolute inset-0 flex items-center justify-center ${video.isPlaceholder ? 'opacity-40' : ''}`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform ${
            video.isPlaceholder
              ? 'bg-white/10 border border-white/20'
              : 'bg-[#c40000] shadow-lg group-hover:scale-110'
          }`}>
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
          {video.duration}
        </div>

        {/* Coming soon badge */}
        {video.isPlaceholder && (
          <div className="absolute top-2 left-2 bg-[#c40000]/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide">
            Coming soon
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#fff1f1] text-[#c40000] flex items-center justify-center flex-shrink-0 mt-0.5">
            {video.icon}
          </div>
          <div>
            <h3 className="font-bold text-[#0f172a] text-sm mb-1 group-hover:text-[#c40000] transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{video.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Video Modal ───────────────────────────────────────────────────────────────

function VideoModal({ video, onClose }: { video: DemoVideo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>

        {/* Video player */}
        <div className="relative aspect-video bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Video title below */}
        <div className="mt-4 text-center">
          <h2 className="text-white font-bold text-lg">{video.title}</h2>
          <p className="text-white/50 text-sm mt-1">{video.description}</p>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [playing, setPlaying] = useState<DemoVideo | null>(null)

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlaying(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const featuredVideo = VIDEOS[0]
  const gridVideos = VIDEOS.slice(1)

  return (
    <div className="min-h-screen">
      {/* Video modal */}
      {playing && <VideoModal video={playing} onClose={() => setPlaying(null)} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-8 py-14 text-center">
        <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-2">See it in action</p>
        <h1 className="text-3xl font-extrabold text-white mb-3">Aimoro Demo Videos</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
          Short, focused demos showing exactly how to use each feature. Pick what you want to learn.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/find-suppliers"
            className="bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
          >
            Try it yourself
          </Link>
          <Link
            href="/settings"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            Take the guided tour
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 space-y-12">

        {/* Featured video — full width */}
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-4">Start here</p>
          <div
            className="group relative bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all"
            onClick={() => !featuredVideo.isPlaceholder && setPlaying(featuredVideo)}
          >
            {/* 16:9 aspect ratio container */}
            <div className="relative" style={{ paddingTop: '42%' }}>
              {/* Background texture */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

              {/* Centre content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                  featuredVideo.isPlaceholder
                    ? 'bg-white/10 border-2 border-white/20'
                    : 'bg-[#c40000] shadow-lg shadow-[#c40000]/40'
                }`}>
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white font-extrabold text-xl mb-1">{featuredVideo.title}</p>
                  <p className="text-white/50 text-sm">{featuredVideo.description}</p>
                  {featuredVideo.isPlaceholder && (
                    <span className="inline-block mt-3 bg-[#c40000]/80 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Video coming soon
                    </span>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {featuredVideo.duration}
              </div>
            </div>
          </div>
        </div>

        {/* Video grid */}
        <div>
          <p className="text-xs font-bold text-[#c40000] uppercase tracking-widest mb-4">Feature demos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gridVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setPlaying(video)}
              />
            ))}
          </div>
        </div>

        {/* Record your own callout */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-start gap-6 flex-col md:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-[#fff1f1] text-[#c40000] flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-[#0f172a] text-base mb-1">Recording your demo videos</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                The video slots above are ready and waiting. Record your demos with Loom, QuickTime, or any screen recorder, upload to YouTube, then replace the <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-mono">videoId</code> values in <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-mono">app/demo/page.tsx</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Loom (recommended)', href: 'https://loom.com' },
                  { label: 'QuickTime (Mac)', href: '#' },
                  { label: 'OBS (free)', href: 'https://obsproject.com' },
                ].map(tool => (
                  <a
                    key={tool.label}
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:border-[#c40000]/30 hover:text-[#c40000] px-3 py-1.5 rounded-lg transition-all"
                  >
                    {tool.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-10 text-center">
          <h2 className="text-xl font-extrabold text-white mb-2">Ready to try it yourself?</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Find your first verified supplier in under 60 seconds. No account required to browse.
          </p>
          <Link
            href="/find-suppliers"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#c40000] to-[#950000] text-white font-bold px-6 py-3 rounded-xl text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-px transition-all"
          >
            Find suppliers now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
