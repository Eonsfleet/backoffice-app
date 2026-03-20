'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  value?: string | null
  name?: string
  onChange: (url: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
}

const ICON_SIZE_MAP = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AvatarUpload({
  value,
  name,
  onChange,
  className,
  size = 'md',
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const current = preview ?? value ?? null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    setUploading(true)
    try {
      const url = await uploadFile(file)
      onChange(url)
      toast.success('Avatar updated')
    } catch {
      toast.error('Upload failed — please try again')
      setPreview(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
      URL.revokeObjectURL(objectUrl)
    }
  }

  const handleClear = () => {
    setPreview(null)
    onChange('')
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={cn(SIZE_MAP[size], 'ring-2 ring-border')}>
        {current && <AvatarImage src={current} alt={name ?? 'Avatar'} />}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {uploading ? (
            <Loader2 className={cn(ICON_SIZE_MAP[size], 'animate-spin')} />
          ) : (
            getInitials(name)
          )}
        </AvatarFallback>
      </Avatar>

      {/* Upload button overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:pointer-events-none',
          size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-6 w-6' : 'h-7 w-7'
        )}
        aria-label="Upload avatar"
      >
        <Camera className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      </button>

      {/* Clear button — only when there's a value */}
      {current && !uploading && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={handleClear}
          className={cn(
            'absolute -right-2 -top-2 rounded-full',
            size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
          )}
          aria-label="Remove avatar"
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
