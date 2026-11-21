'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import styles from './blog-page.module.css'

export type BlogVideo = { src: string; poster: string; title: string; by: string; length: string; vertical?: boolean }

/**
 * One interview: the poster with a play button; pressing it swaps in the video, playing with its own controls.
 * Nothing is downloaded until a visitor chooses to watch.
 */
export function VideoCard({ video }: { video: BlogVideo }) {
  const [playing, setPlaying] = useState(false)
  const player = useRef<HTMLVideoElement>(null)
  return <figure className={styles.video} data-vertical={video.vertical || undefined}>
    <div className={styles.screen}>
      {playing
        ? <video ref={player} src={video.src} poster={video.poster} controls autoPlay playsInline preload="metadata" onEnded={() => player.current?.load()}>
          <a href={video.src}>Download the video</a>
        </video>
        : <button type="button" className={styles.play} onClick={() => setPlaying(true)} aria-label={`Play: ${video.title} (${video.length})`}>
          <Image src={video.poster} alt="" fill sizes={video.vertical ? '(max-width: 560px) 60vw, 16vw' : '(max-width: 860px) 100vw, 36vw'}/>
          <span className={styles.playIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>
          <span className={styles.length}>{video.length}</span>
        </button>}
    </div>
    <figcaption><b>{video.title}</b><span>{video.by}</span></figcaption>
  </figure>
}
