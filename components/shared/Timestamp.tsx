const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23', timeZone: 'Africa/Lagos',
})

export function Timestamp({ value }: { value?: string | null }) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return <span className="text-muted-foreground">Unavailable</span>
  return <time dateTime={date.toISOString()} title={date.toISOString()} className="text-xs tabular-nums">{dateFormat.format(date)} WAT</time>
}
