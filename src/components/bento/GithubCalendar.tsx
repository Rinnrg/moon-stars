'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { type FunctionComponent, useCallback, useEffect, useState, useRef } from 'react'
import Calendar, {
  type Props as ActivityCalendarProps,
} from 'react-activity-calendar'

// Adopted from https://github.com/grubersjoe/react-github-calendar
// Copyright (c) 2019 Jonathan Gruber, MIT License

interface Props extends Omit<ActivityCalendarProps, 'data' | 'theme'> {
  username: string
}

async function fetchCalendarData(username: string): Promise<ApiResponse> {
  const startDate = new Date('2023-12-06T00:00:00Z')
  const endDate = new Date()
  
  const contributions: Activity[] = []
  
  let current = new Date(startDate)
  let totalCount = 0
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    
    // Generate a deterministic but varied level between 1 and 4
    const seed = current.getDate() + current.getMonth() * 31 + current.getFullYear() * 365
    const level = ((seed * 13) % 4 + 1) as 1 | 2 | 3 | 4
    const count = 1
    totalCount += count
    
    contributions.push({
      date: dateStr,
      count,
      level,
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return {
    total: {
      "last": totalCount
    },
    contributions
  }
}

const GithubCalendar: FunctionComponent<Props> = ({ username, ...props }) => {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollContainerMobileRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchCalendarData(username)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [username])

  useEffect(fetchData, [fetchData])

  // Scroll to the end (right) when data is loaded
  useEffect(() => {
    if (!loading && data) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
      }
      if (scrollContainerMobileRef.current) {
        scrollContainerMobileRef.current.scrollLeft = scrollContainerMobileRef.current.scrollWidth
      }
    }
  }, [loading, data])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <img
          src="/static/images/bento/bento-discord-futon.svg"
          alt="Error"
          width={0}
          height={0}
          className="bento-lg:w-48 h-auto w-24"
        />
        <p className="bento-lg:w-64 text-muted-foreground w-48 text-center text-sm">
          This component is down. Please email me!
        </p>
      </div>
    )
  }

  if (loading || !data) {
    return <Skeleton className="size-full" />
  }

  const contributionsByYear = data.contributions.reduce((acc, curr) => {
    const year = new Date(curr.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(curr)
    return acc
  }, {} as Record<number, Activity[]>)

  const years = Object.keys(contributionsByYear).map(Number).sort((a, b) => a - b)

  return (
    <div className="flex flex-col w-full">
      <div className="text-foreground/80 text-sm mb-2 font-medium pl-2 hidden sm:block">
        {data.total.last} Hari sejak 6 Des 2023
      </div>
      <div 
        ref={scrollContainerRef}
        className="[&_.react-activity-calendar\\_\\_legend-month]:text-foreground/80 hidden w-full overflow-x-auto sm:flex sm:gap-8 pb-2 custom-scrollbar"
      >
        {years.map((year) => (
          <div key={year} className="flex flex-col gap-2 shrink-0">
            <div className="text-muted-foreground text-sm font-bold pl-2">{year}</div>
            <Calendar
              data={contributionsByYear[year]}
              theme={{
                dark: ['#1e293b', '#3b82f6'],
              }}
              colorScheme="dark"
              blockSize={15}
              blockMargin={4}
              blockRadius={0}
              {...props}
              maxLevel={4}
              hideTotalCount
              hideColorLegend
            />
          </div>
        ))}
      </div>
      
      <div className="text-foreground/80 text-xs mb-2 font-medium pl-2 sm:hidden block">
        {data.total.last} Hari sejak 6 Des 2023
      </div>
      <div 
        ref={scrollContainerMobileRef}
        className="[&_.react-activity-calendar\\_\\_legend-month]:text-foreground/80 w-full overflow-x-auto sm:hidden flex gap-4 pb-2 custom-scrollbar"
      >
        {years.map((year) => (
          <div key={year} className="flex flex-col gap-2 shrink-0">
            <div className="text-muted-foreground text-xs font-bold pl-2">{year}</div>
            <Calendar
              data={contributionsByYear[year]}
              theme={{
                dark: ['#1e293b', '#3b82f6'],
              }}
              colorScheme="dark"
              blockSize={12}
              blockMargin={3}
              blockRadius={0}
              {...props}
              maxLevel={4}
              hideTotalCount
              hideColorLegend
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface Activity {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface ApiResponse {
  total: {
    [year: number]: number
    [year: string]: number
  }
  contributions: Array<Activity>
}

export default GithubCalendar
