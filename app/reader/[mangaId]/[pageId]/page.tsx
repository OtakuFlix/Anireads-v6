'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Settings, 
  BookOpen,
  Maximize,
  Minimize,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Bookmark,
  Share2,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  X,
  Play,
  Pause,
  ScrollText,
  FlipHorizontal,
  FlipVertical,
  BookOpenCheck
} from 'lucide-react'
import { getMangaDxChapterPages, getMangaDxChapter, getMangaDxChapters } from '@/lib/mangadx-api'
import { toast } from 'sonner'
import Image from 'next/image'

interface ReaderSettings {
  readingMode: 'single' | 'double' | 'webtoon' | 'scroll-vertical' | 'scroll-horizontal'
  flipDirection: 'rtl' | 'ltr'
  autoPlay: boolean
  autoPlaySpeed: number
  soundEnabled: boolean
  preloadPages: number
  showUI: boolean
  fullscreen: boolean
  zoom: number
  autoZoom: boolean
  fitMode: 'width' | 'height' | 'page' | 'original'
}

interface PageData {
  url: string
  loaded: boolean
  error: boolean
  width?: number
  height?: number
}

export default function MangaReaderPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const mangaId = params.mangaId as string
  const pageId = parseInt(params.pageId as string) || 1
  const chapterId = searchParams.get('chapter')

  const [pages, setPages] = useState<PageData[]>([])
  const [currentPage, setCurrentPage] = useState(pageId)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chapterInfo, setChapterInfo] = useState<any>(null)
  const [allChapters, setAllChapters] = useState<any[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())

  const [settings, setSettings] = useState<ReaderSettings>({
    readingMode: 'single',
    flipDirection: 'rtl',
    autoPlay: false,
    autoPlaySpeed: 10,
    soundEnabled: true,
    preloadPages: 3,
    showUI: true,
    fullscreen: false,
    zoom: 100,
    autoZoom: true,
    fitMode: 'width'
  })

  const [showSettings, setShowSettings] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load chapter data
  useEffect(() => {
    if (!chapterId) return

    const loadChapterData = async () => {
      try {
        setLoading(true)
        
        // Load current chapter info
        const chapterResponse = await getMangaDxChapter(chapterId)
        setChapterInfo(chapterResponse.data)

        // Load chapter pages
        const pagesResponse = await getMangaDxChapterPages(chapterId)
        const baseUrl = pagesResponse.baseUrl
        const chapterHash = pagesResponse.chapter.hash
        const pageFiles = pagesResponse.chapter.data

        const pageUrls = pageFiles.map((file: string) => ({
          url: `${baseUrl}/data/${chapterHash}/${file}`,
          loaded: false,
          error: false
        }))

        setPages(pageUrls)
        setTotalPages(pageUrls.length)

        // Load all chapters for navigation
        const chaptersResponse = await getMangaDxChapters(mangaId)
        const sortedChapters = chaptersResponse.data.sort((a: any, b: any) => {
          const aNum = parseFloat(a.attributes.chapter || "0")
          const bNum = parseFloat(b.attributes.chapter || "0")
          return aNum - bNum
        })
        setAllChapters(sortedChapters)
        
        const currentIndex = sortedChapters.findIndex((ch: any) => ch.id === chapterId)
        setCurrentChapterIndex(currentIndex)

      } catch (error) {
        console.error('Error loading chapter:', error)
        toast.error('Failed to load chapter')
      } finally {
        setLoading(false)
      }
    }

    loadChapterData()
  }, [chapterId, mangaId])

  // Auto-play functionality
  useEffect(() => {
    if (settings.autoPlay && !loading) {
      autoPlayIntervalRef.current = setInterval(() => {
        nextPage()
      }, settings.autoPlaySpeed * 1000)
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
        autoPlayIntervalRef.current = null
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
      }
    }
  }, [settings.autoPlay, settings.autoPlaySpeed, loading])

  // Preload pages
  useEffect(() => {
    const preloadPage = (index: number) => {
      if (index < 0 || index >= pages.length || preloadedPages.has(index)) return

      const img = new window.Image()
      img.onload = () => {
        setPages(prev => prev.map((p, i) => 
          i === index ? { ...p, loaded: true, width: img.naturalWidth, height: img.naturalHeight } : p
        ))
        setPreloadedPages(prev => new Set([...prev, index]))
      }
      img.onerror = () => {
        setPages(prev => prev.map((p, i) => 
          i === index ? { ...p, error: true } : p
        ))
      }
      img.src = pages[index].url
    }

    // Preload current page and surrounding pages
    const startIndex = Math.max(0, currentPage - 1 - settings.preloadPages)
    const endIndex = Math.min(pages.length, currentPage - 1 + settings.preloadPages + 1)

    for (let i = startIndex; i < endIndex; i++) {
      preloadPage(i)
    }
  }, [currentPage, pages, settings.preloadPages, preloadedPages])

  const playFlipSound = () => {
    if (!settings.soundEnabled) return
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const navigateToPage = (page: number) => {
    if (page < 1 || page > totalPages || isTransitioning) return
    
    setIsTransitioning(true)
    setCurrentPage(page)
    
    if (settings.soundEnabled) {
      playFlipSound()
    }
    
    // Update URL
    router.replace(`/reader/${mangaId}/${page}?chapter=${chapterId}`, { scroll: false })
    
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const nextPage = () => {
    if (settings.readingMode === 'double' && currentPage < totalPages) {
      // Handle dual page navigation
      if (currentPage === 1) {
        navigateToPage(2)
      } else {
        const nextPageNum = currentPage + 2
        if (nextPageNum <= totalPages) {
          navigateToPage(nextPageNum)
        } else if (currentPage < totalPages) {
          navigateToPage(totalPages)
        } else {
          nextChapter()
        }
      }
    } else {
      if (currentPage < totalPages) {
        navigateToPage(currentPage + 1)
      } else {
        nextChapter()
      }
    }
  }

  const prevPage = () => {
    if (settings.readingMode === 'double' && currentPage > 1) {
      // Handle dual page navigation
      if (currentPage === totalPages && totalPages % 2 === 0) {
        navigateToPage(currentPage - 1)
      } else {
        const prevPageNum = currentPage - 2
        if (prevPageNum >= 1) {
          navigateToPage(prevPageNum)
        } else {
          navigateToPage(1)
        }
      }
    } else {
      if (currentPage > 1) {
        navigateToPage(currentPage - 1)
      } else {
        prevChapter()
      }
    }
  }

  const nextChapter = () => {
    if (currentChapterIndex < allChapters.length - 1) {
      const nextChapter = allChapters[currentChapterIndex + 1]
      router.push(`/reader/${mangaId}/1?chapter=${nextChapter.id}`)
    }
  }

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevChapter = allChapters[currentChapterIndex - 1]
      router.push(`/reader/${mangaId}/1?chapter=${prevChapter.id}`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setSettings(prev => ({ ...prev, fullscreen: true }))
    } else {
      document.exitFullscreen()
      setSettings(prev => ({ ...prev, fullscreen: false }))
    }
  }

  const toggleAutoPlay = () => {
    setSettings(prev => ({ ...prev, autoPlay: !prev.autoPlay }))
  }

  const handleZoomChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, zoom: value[0], autoZoom: false }))
  }

  const resetZoom = () => {
    setSettings(prev => ({ ...prev, zoom: 100, autoZoom: true }))
  }

  // Get pages to display based on reading mode
  const getPagesToDisplay = () => {
    if (settings.readingMode === 'double') {
      if (currentPage === 1) {
        return [currentPage - 1] // Show only first page
      } else {
        // Show current page and previous page as spread
        const leftPage = currentPage % 2 === 0 ? currentPage - 1 : currentPage
        const rightPage = leftPage + 1
        return rightPage <= totalPages ? [leftPage - 1, rightPage - 1] : [leftPage - 1]
      }
    } else if (settings.readingMode === 'webtoon' || settings.readingMode === 'scroll-vertical') {
      return pages.map((_, index) => index) // Show all pages
    } else {
      return [currentPage - 1] // Show single page
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          settings.flipDirection === 'rtl' ? nextPage() : prevPage()
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          settings.flipDirection === 'rtl' ? prevPage() : nextPage()
          break
        case 'ArrowUp':
          e.preventDefault()
          if (settings.readingMode === 'scroll-vertical') {
            scrollContainerRef.current?.scrollBy(0, -200)
          } else {
            prevPage()
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (settings.readingMode === 'scroll-vertical') {
            scrollContainerRef.current?.scrollBy(0, 200)
          } else {
            nextPage()
          }
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'h':
        case 'H':
          e.preventDefault()
          setSettings(prev => ({ ...prev, showUI: !prev.showUI }))
          break
        case 's':
        case 'S':
          e.preventDefault()
          setShowSettings(!showSettings)
          break
        case ' ':
          e.preventDefault()
          toggleAutoPlay()
          break
        case 'Escape':
          setShowSettings(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [settings, showSettings])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl">Loading Chapter...</div>
          {chapterInfo && (
            <div className="text-gray-400 mt-2">
              Chapter {chapterInfo.attributes?.chapter || '?'}
            </div>
          )}
        </div>
      </div>
    )
  }

  const pagesToDisplay = getPagesToDisplay()

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Top Navigation Bar */}
      {settings.showUI && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/manga/${mangaId}`)}
                className="text-white hover:bg-white/20"
              >
                <Home className="w-5 h-5" />
              </Button>
              
              <div className="text-sm">
                <div className="font-semibold">
                  {chapterInfo?.attributes?.title || `Chapter ${chapterInfo?.attributes?.chapter || '?'}`}
                </div>
                <div className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20">
                {settings.readingMode.toUpperCase()}
              </Badge>
              
              {settings.autoPlay && (
                <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                  AUTO {settings.autoPlaySpeed}s
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettings(prev => ({ ...prev, showUI: !prev.showUI }))}
                className="text-white hover:bg-white/20"
              >
                {settings.showUI ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Reader Area */}
      <div 
        ref={containerRef}
        className="flex items-center justify-center min-h-screen p-4"
        style={{ paddingTop: settings.showUI ? '80px' : '0', paddingBottom: settings.showUI ? '80px' : '0' }}
      >
        {settings.readingMode === 'webtoon' || settings.readingMode === 'scroll-vertical' ? (
          // Vertical scroll mode
          <div 
            ref={scrollContainerRef}
            className="w-full max-w-4xl h-screen overflow-y-auto overflow-x-hidden"
            style={{ 
              scrollBehavior: 'smooth',
              transform: `scale(${settings.zoom / 100})`,
              transformOrigin: 'top center'
            }}
          >
            {pages.map((page, index) => (
              <div key={index} className="mb-2 flex justify-center">
                <div className="relative max-w-full">
                  {page.loaded ? (
                    <Image
                      src={page.url}
                      alt={`Page ${index + 1}`}
                      width={page.width || 800}
                      height={page.height || 1200}
                      className="max-w-full h-auto"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-96 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div>Loading page {index + 1}...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : settings.readingMode === 'scroll-horizontal' ? (
          // Horizontal scroll mode
          <div 
            ref={scrollContainerRef}
            className="w-screen h-full overflow-x-auto overflow-y-hidden flex"
            style={{ 
              scrollBehavior: 'smooth',
              transform: `scale(${settings.zoom / 100})`,
              transformOrigin: 'center'
            }}
          >
            {pages.map((page, index) => (
              <div key={index} className="flex-shrink-0 mr-2 flex items-center">
                <div className="relative h-full">
                  {page.loaded ? (
                    <Image
                      src={page.url}
                      alt={`Page ${index + 1}`}
                      width={page.width || 800}
                      height={page.height || 1200}
                      className="h-full w-auto max-h-screen"
                      unoptimized
                    />
                  ) : (
                    <div className="w-96 h-full bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div>Loading page {index + 1}...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Single/Double page mode
          <div 
            className="flex items-center justify-center gap-4"
            style={{ 
              transform: `scale(${settings.zoom / 100})`,
              transformOrigin: 'center',
              transition: 'transform 0.3s ease'
            }}
          >
            {pagesToDisplay.map((pageIndex) => {
              const page = pages[pageIndex]
              if (!page) return null

              return (
                <div key={pageIndex} className="relative">
                  {page.loaded ? (
                    <Image
                      src={page.url}
                      alt={`Page ${pageIndex + 1}`}
                      width={page.width || 800}
                      height={page.height || 1200}
                      className={`max-h-screen w-auto ${
                        settings.fitMode === 'width' ? 'max-w-full' :
                        settings.fitMode === 'height' ? 'h-screen' :
                        settings.fitMode === 'page' ? 'max-w-full max-h-screen' :
                        ''
                      }`}
                      unoptimized
                    />
                  ) : page.error ? (
                    <div className="w-96 h-96 bg-gray-800 flex items-center justify-center border border-red-500">
                      <div className="text-center text-red-400">
                        <X className="w-8 h-8 mx-auto mb-2" />
                        <div>Failed to load page {pageIndex + 1}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-96 h-96 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div>Loading page {pageIndex + 1}...</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {settings.showUI && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevChapter}
                disabled={currentChapterIndex === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={prevPage}
                disabled={currentPage === 1 && currentChapterIndex === 0}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAutoPlay}
                className={`text-white hover:bg-white/20 ${settings.autoPlay ? 'bg-green-600/20' : ''}`}
              >
                {settings.autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <div className="text-center">
                <div className="text-sm text-gray-400">
                  {currentPage} / {totalPages}
                </div>
                <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={nextPage}
                disabled={currentPage === totalPages && currentChapterIndex === allChapters.length - 1}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={nextChapter}
                disabled={currentChapterIndex === allChapters.length - 1}
                className="text-white hover:bg-white/20 disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-700 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Reader Settings</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Reading Mode */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">
                  Reading Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'single', label: 'Single', icon: Smartphone },
                    { value: 'double', label: 'Double', icon: Monitor },
                    { value: 'webtoon', label: 'Webtoon', icon: ScrollText },
                    { value: 'scroll-vertical', label: 'Scroll V', icon: FlipVertical },
                    { value: 'scroll-horizontal', label: 'Scroll H', icon: FlipHorizontal }
                  ].map((mode) => {
                    const Icon = mode.icon
                    return (
                      <Button
                        key={mode.value}
                        variant={settings.readingMode === mode.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, readingMode: mode.value as any }))}
                        className="flex flex-col gap-1 h-auto py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{mode.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Zoom Controls */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">
                  Zoom: {settings.zoom}%
                </label>
                <div className="space-y-3">
                  <Slider
                    value={[settings.zoom]}
                    onValueChange={handleZoomChange}
                    min={50}
                    max={300}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleZoomChange([settings.zoom - 10])}
                      className="flex-1"
                    >
                      <ZoomOut className="w-4 h-4 mr-1" />
                      -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetZoom}
                      className="flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleZoomChange([settings.zoom + 10])}
                      className="flex-1"
                    >
                      <ZoomIn className="w-4 h-4 mr-1" />
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Auto Play */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">
                  Auto Play: {settings.autoPlaySpeed}s
                </label>
                <div className="space-y-3">
                  <Slider
                    value={[settings.autoPlaySpeed]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, autoPlaySpeed: value[0] }))}
                    min={3}
                    max={180}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Auto Play</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleAutoPlay}
                      className={`text-gray-400 hover:text-white ${settings.autoPlay ? 'text-green-400' : ''}`}
                    >
                      {settings.autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reading Direction */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Reading Direction
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={settings.flipDirection === 'rtl' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, flipDirection: 'rtl' }))}
                    className="flex-1"
                  >
                    Right to Left
                  </Button>
                  <Button
                    variant={settings.flipDirection === 'ltr' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, flipDirection: 'ltr' }))}
                    className="flex-1"
                  >
                    Left to Right
                  </Button>
                </div>
              </div>

              {/* Other Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Sound Effects</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className="text-gray-400 hover:text-white"
                  >
                    {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Fullscreen</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-gray-400 hover:text-white"
                  >
                    {settings.fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 space-y-1">
                <div>• Use arrow keys or A/D to navigate</div>
                <div>• Press F for fullscreen</div>
                <div>• Press H to hide/show UI</div>
                <div>• Press Space for auto-play</div>
                <div>• Press S for settings</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  )
}