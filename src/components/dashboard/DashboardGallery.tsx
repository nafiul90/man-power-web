'use client';
import Image from 'next/image';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  { src: '/images/bnp1.jpeg', alt: 'Program highlight 1' },
  { src: '/images/bnp2.jpeg', alt: 'Program highlight 2' },
  { src: '/images/bnp3.jpeg', alt: 'Program highlight 3' },
  { src: '/images/bnp4.jpeg', alt: 'Program highlight 4' },
  { src: '/images/bnp5.jpeg', alt: 'Program highlight 5' },
  { src: '/images/bnp6.jpeg', alt: 'Program highlight 6' },
  { src: '/images/bnp7.jpeg', alt: 'Program highlight 7' },
  { src: '/images/bnp8.jpeg', alt: 'Program highlight 8' },
];

export function DashboardGallery() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const close = () => setActiveIdx(null);
  const prev = () => setActiveIdx((i) => (i === null ? null : (i - 1 + IMAGES.length) % IMAGES.length));
  const next = () => setActiveIdx((i) => (i === null ? null : (i + 1) % IMAGES.length));

  return (
    <section className="mt-10 pt-8 border-t border-[var(--card-border)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Gallery</h2>
        <p className="text-sm text-[var(--muted)]">Highlights from recent programs and activities.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {IMAGES.map((img, idx) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {activeIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div
            className="relative w-full max-w-5xl aspect-[16/10]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={IMAGES[activeIdx].src}
              alt={IMAGES[activeIdx].alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </section>
  );
}
