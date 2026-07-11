import { useEffect, useState, useRef } from 'react'
import { FaSpotify } from 'react-icons/fa'
import { Play, Pause, AudioLines, Plus, Trash2, X } from 'lucide-react'
import Carousel, { type CarouselItemData } from '@/components/ui/Carousel'

interface Song {
  id: string
  title: string
  artist: string
  description: string
  imageUrl: string
}

// Lagu default (hardcoded fallback)
const DEFAULT_TRACKS: CarouselItemData[] = [
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
  const [tracks, setTracks] = useState<CarouselItemData[]>(DEFAULT_TRACKS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(200)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [dbSongs, setDbSongs] = useState<Song[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [formData, setFormData] = useState({ title: '', artist: '', description: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTrack = tracks[activeTrackIndex] ?? tracks[0]

  // Fetch lagu dari DB
  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs')
      if (res.ok) {
        const songs: Song[] = await res.json()
        setDbSongs(songs)
        const dbTracks: CarouselItemData[] = songs.map((s, i) => ({
          id: 1000 + i,
          title: s.title,
          artist: s.artist,
          description: s.description,
          image: s.imageUrl,
          audioSrc: '',
        }))
        setTracks([...DEFAULT_TRACKS, ...dbTracks])
      }
    } catch (e) {
      console.error('Failed to fetch songs:', e)
    }
  }

  useEffect(() => { fetchSongs() }, [])

  // Track resizing
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Audio events
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

  // Track change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
      setProgressMs(0)
      setDurationMs(0)
      if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
    }
  }, [activeTrackIndex])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !formData.title || !formData.artist) return
    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('image', selectedFile)
      fd.append('title', formData.title)
      fd.append('artist', formData.artist)
      fd.append('description', formData.description)
      const res = await fetch('/api/songs', { method: 'POST', body: fd })
      if (res.ok) {
        setShowAddDialog(false)
        setFormData({ title: '', artist: '', description: '' })
        setSelectedFile(null)
        setPreviewUrl('')
        await fetchSongs()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Gagal menambah lagu.')
      }
    } catch {
      alert('Terjadi kesalahan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (song: Song) => {
    if (!confirm(`Hapus lagu "${song.title}"?`)) return
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' })
      if (res.ok) await fetchSongs()
      else alert('Gagal menghapus lagu.')
    } catch {
      alert('Terjadi kesalahan.')
    }
  }

  const dialogOverlay = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm'
  const dialogBox = 'relative bg-[#111] border border-white/10 rounded-xl p-5 w-[320px] max-w-[90vw] shadow-2xl'

  return (
    <>
      <audio src={activeTrack?.audioSrc || ''} ref={audioRef} preload="metadata" />

      <div className="relative flex size-full flex-col p-6 pb-5">
        <div ref={containerRef} className="min-h-0 flex-1 w-full relative">
          {containerWidth > 0 && (
            <div className="absolute inset-0">
              <Carousel
                items={tracks}
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
                {isPlaying ? 'Now playing...' : activeTrack?.artist}
              </span>
            </span>
            <span className="text-md mb-1 mr-14 line-clamp-2 leading-tight font-medium">
              {activeTrack?.title}
            </span>
            <span className="text-muted-foreground mr-10 line-clamp-1 text-xs">
              {activeTrack?.description}
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

      {/* Spotify icon */}
      <div className="text-primary absolute top-0 right-0 m-3 z-20 pointer-events-none">
        <FaSpotify size={56} />
      </div>

      {/* Play button */}
      <button
        onClick={togglePlay}
        aria-label="klik play music"
        title="klik play music"
        className="bg-border/50 text-primary ring-ring group/spotify-link absolute end-0 bottom-0 m-3 rounded-full p-3 transition-[box-shadow] duration-300 hover:ring-2 focus-visible:ring-2 cursor-pointer z-20"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Tombol tambah lagu */}
      <button
        onClick={() => setShowAddDialog(true)}
        title="Tambah lagu"
        aria-label="Tambah lagu"
        className="bg-border/50 text-primary ring-ring absolute bottom-0 right-14 m-3 rounded-full p-3 transition-[box-shadow] duration-300 hover:ring-2 cursor-pointer z-20"
      >
        <Plus size={16} />
      </button>

      {/* Tombol kelola lagu DB */}
      {dbSongs.length > 0 && (
        <button
          onClick={() => setShowManageDialog(true)}
          title="Kelola lagu"
          aria-label="Kelola lagu"
          className="bg-border/50 text-primary ring-ring absolute bottom-0 right-28 m-3 rounded-full p-3 transition-[box-shadow] duration-300 hover:ring-2 cursor-pointer z-20"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Dialog Tambah Lagu */}
      {showAddDialog && (
        <div className={dialogOverlay} onClick={() => setShowAddDialog(false)}>
          <div className={dialogBox} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowAddDialog(false)}
              className="absolute top-3 right-3 text-white/50 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="font-mono text-sm font-semibold mb-4 text-white">Tambah Lagu</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Preview gambar album */}
              <div
                className="w-full h-32 border border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden bg-black/30"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-white/30 text-xs font-mono">Klik untuk pilih gambar album</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                type="text"
                placeholder="Nama lagu *"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                required
                className="bg-black/40 border border-white/15 text-white text-xs font-mono px-3 py-2 rounded-md outline-none focus:border-white/40 placeholder:text-white/30"
              />
              <input
                type="text"
                placeholder="Nama penyanyi *"
                value={formData.artist}
                onChange={e => setFormData(p => ({ ...p, artist: e.target.value }))}
                required
                className="bg-black/40 border border-white/15 text-white text-xs font-mono px-3 py-2 rounded-md outline-none focus:border-white/40 placeholder:text-white/30"
              />
              <input
                type="text"
                placeholder="Deskripsi (opsional)"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="bg-black/40 border border-white/15 text-white text-xs font-mono px-3 py-2 rounded-md outline-none focus:border-white/40 placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="mt-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono py-2 rounded-md transition-colors"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Lagu'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Kelola Lagu */}
      {showManageDialog && (
        <div className={dialogOverlay} onClick={() => setShowManageDialog(false)}>
          <div className={dialogBox} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowManageDialog(false)}
              className="absolute top-3 right-3 text-white/50 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="font-mono text-sm font-semibold mb-4 text-white">Kelola Lagu</h3>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {dbSongs.length === 0 ? (
                <p className="text-white/30 text-xs font-mono">Belum ada lagu.</p>
              ) : dbSongs.map(song => (
                <div key={song.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                  <img src={song.imageUrl} alt={song.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-mono font-medium truncate">{song.title}</p>
                    <p className="text-white/50 text-[10px] font-mono truncate">{song.artist}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(song)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0 p-1"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SpotifyPresence
