"use client"

import { useId, useRef, useState } from "react"

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  maxBytes: number
  accept: string
  hint?: string
}

const ACCEPTED_HELPER =
  "Vector .ai .eps .svg .pdf · Raster .png .tiff .jpg · Source .psd .indd"

export default function FileDropZone({
  files,
  onChange,
  maxBytes,
  accept,
  hint,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const oversize = arr.find((f) => f.size > maxBytes)
    if (oversize) {
      setError(
        `${oversize.name} is ${formatBytes(oversize.size)} — max per file is ${formatBytes(maxBytes)}.`,
      )
      return
    }
    setError(null)
    const existingKeys = new Set(files.map(fileKey))
    const fresh = arr.filter((f) => !existingKeys.has(fileKey(f)))
    onChange([...files, ...fresh])
  }

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center justify-center gap-3 px-6 py-10 w-full text-center bg-[var(--surface-soft)] border-2 border-dashed rounded-2xl transition-colors ${
          dragActive
            ? "border-[var(--brand-orange)] bg-[var(--surface)]"
            : "border-[var(--border-strong)] hover:border-[var(--brand-orange)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            dragActive
              ? "text-white bg-[var(--brand-orange)]"
              : "text-[var(--brand-orange)] bg-[var(--surface)]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <span className="text-sm font-semibold text-[var(--brand-black)]">
          {dragActive
            ? "Drop your files here"
            : "Drop files here or click to browse"}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {hint ?? ACCEPTED_HELPER}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          Max {formatBytes(maxBytes)} per file
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
          className="hidden"
        />
      </button>

      {error && (
        <p className="text-xs text-[var(--brand-orange)]">{error}</p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
              {formatBytes(totalBytes)}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium text-[var(--text-soft)] hover:text-[var(--brand-orange)] transition-colors"
            >
              Clear all
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {files.map((file, idx) => (
              <li
                key={fileKey(file)}
                className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-8 h-8 text-[var(--brand-orange)] bg-[var(--surface-soft)] rounded-lg"
                >
                  <FileFamilyIcon name={file.name} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--brand-black)] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex items-center justify-center w-8 h-8 text-[var(--text-muted)] hover:text-[var(--brand-orange)] transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function fileKey(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileFamilyIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const isVector = ["ai", "eps", "svg", "pdf"].includes(ext)
  const isSource = ["psd", "indd"].includes(ext)

  if (isVector) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 3 21 12 12 21 3 12 12 3" />
      </svg>
    )
  }
  if (isSource) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
