import { useEffect, useState, useRef } from 'react'
import { FaSpotify } from 'react-icons/fa'
import { Play, Pause, AudioLines } from 'lucide-react'
import Carousel, { type CarouselItemData } from '@/components/ui/Carousel'

const TRACKS: CarouselItemData[] = [
  {
    id: 1,
    title: 'Penjaga Hati',
    artist: 'Nadhif Basalamah',
    description: 'kenangan sama sayang',
    image: '/album/pic%20nadif%20basatha.webp',
    audioSrc: '/music/Nadhif%20Basalamah%20-%20penjaga%20hati.mp3'
  },
  {
    id: 2,
    title: 'Risk It All',
    artist: 'Bruno Mars',
    description: 'music ganteng',
    image: '/album/bruno%20mars.png',
    audioSrc: '/music/Bruno%20Mars%20-%20Risk%20It%20All.mp3'
  }
]

const SpotifyPresence = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(200)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTrack = TRACKS[activeTrackIndex]

  // Track resizing of the container for the Carousel
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      // Use offsetWidth or contentRect width, offsetWidth includes padding, but we measure inner div
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Audio player events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => setProgressMs(audio.currentTime * 1000)
    const updateDuration = () => setDurationMs(audio.duration * 1000)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  // Handle track change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
      setProgressMs(0)
      setDurationMs(0)
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false))
      }
    }
  }, [activeTrackIndex])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  function formatMs(ms: number): string {
    if (isNaN(ms) || ms === 0) return '0:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <>
      <audio
        src={activeTrack.audioSrc || ''}
        ref={audioRef}
        preload="metadata"
      />
      <div className="relative flex size-full flex-col p-6 pb-5">
        <div ref={containerRef} className="min-h-0 flex-1 w-full relative">
          {containerWidth > 0 && (
            <div className="absolute inset-0">
              <Carousel
                items={TRACKS}
                baseWidth={containerWidth}
                onSlideChange={setActiveTrackIndex}
                isPlaying={isPlaying}
              />
            </div>
          )}
        </div>
        
        <div className="shrink-0 z-10 mt-2">
          <div className="flex flex-col">
            <span className="mb-2 flex items-center gap-2">
              <AudioLines size={12} className="text-primary shrink-0" />
              <span className="text-primary text-xs">
                {isPlaying ? 'Now playing...' : activeTrack.artist}
              </span>
            </span>
            <span className="text-md mb-1 mr-14 line-clamp-2 leading-tight font-medium">
              {activeTrack.title}
            </span>
            <span className="text-muted-foreground mr-10 line-clamp-1 text-xs">
              {activeTrack.description}
            </span>
          </div>
          <div className="mt-3 mr-10">
            <div className="bg-border h-0.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-100 ease-linear"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
              <span>{formatMs(progressMs)}</span>
              <span>{formatMs(durationMs)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-primary absolute top-0 right-0 m-3 z-20 pointer-events-none">
        <FaSpotify size={56} />
      </div>
      <button
        onClick={togglePlay}
        aria-label="klik play music"
        title="klik play music"
        className="bg-border/50 text-primary ring-ring group/spotify-link absolute end-0 bottom-0 m-3 rounded-full p-3 transition-[box-shadow] duration-300 hover:ring-2 focus-visible:ring-2 cursor-pointer z-20"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </>
  )
}

export default SpotifyPresence
