import { useEffect, useState, useRef } from 'react'
import { FaSpotify } from 'react-icons/fa'
import { Play, Pause, AudioLines } from 'lucide-react'

const SpotifyPresence = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
    if (isNaN(ms)) return '0:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const albumArt = '/album/pic%20nadif%20basatha.webp'

  return (
    <>
      <audio
        src="/music/Nadhif%20Basalamah%20-%20penjaga%20hati.mp3"
        ref={audioRef}
        preload="metadata"
      />
      <div className="relative flex size-full flex-col gap-4 p-6 pb-5">
        <div className="min-h-0 flex-1">
          <div
            className="aspect-square h-full border bg-cover bg-center grayscale sepia-50"
            style={{ backgroundImage: `url("${albumArt}")` }}
            role="img"
            aria-label="Album art"
          />
        </div>
        <div className="shrink-0">
          <div className="flex flex-col">
            <span className="mb-2 flex items-center gap-2">
              <AudioLines size={12} className="text-primary shrink-0" />
              <span className="text-primary text-xs">
                {isPlaying ? 'Now playing...' : 'Nadhif Basalamah'}
              </span>
            </span>
            <span className="text-md mb-1 mr-14 line-clamp-2 leading-tight font-medium">
              Penjaga Hati
            </span>
            <span className="text-muted-foreground mr-10 line-clamp-1 text-xs">
              kenangan sama sayang
            </span>
          </div>
          <div className="mt-3 mr-10">
            <div className="bg-border h-0.5 overflow-hidden">
              <div
                className="bg-primary h-full"
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
      <div className="text-primary absolute top-0 right-0 m-3">
        <FaSpotify size={56} />
      </div>
      <button
        onClick={togglePlay}
        aria-label="klik play music"
        title="klik play music"
        className="bg-border/50 text-primary ring-ring group/spotify-link absolute end-0 bottom-0 m-3 rounded-full p-3 transition-[box-shadow] duration-300 hover:ring-2 focus-visible:ring-2 cursor-pointer"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </>
  )
}

export default SpotifyPresence
