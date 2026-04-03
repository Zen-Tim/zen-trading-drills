import { useState, useRef, useEffect } from 'react'

const ICON_OPTIONS = [
  '\u{1F4CB}', '\u{1F4CA}', '\u{1F4C8}', '\u{1F4C9}', '\u{1F3AF}',
  '\u{1F50D}', '\u{1F4A1}', '\u{1F4D0}', '\u26A1', '\u{1F9E0}',
  '\u{1F4DD}', '\u{1F511}', '\u2B50', '\u{1F3F7}\uFE0F', '\u{1F4CC}',
  '\u{1F512}', '\u{1F393}', '\u{1F4B9}', '\u{1F5C2}\uFE0F', '\u270F\uFE0F',
]

export default function SectionForm({ section, onSave, onDelete, onClose }) {
  const isEditing = !!section
  const [title, setTitle] = useState(section?.title || '')
  const [subtitle, setSubtitle] = useState(section?.subtitle || '')
  const [icon, setIcon] = useState(section?.icon || ICON_OPTIONS[0])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  async function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setSaving(true)
    setError(null)

    let result
    if (isEditing) {
      result = await onSave(section.id, {
        title: trimmedTitle,
        subtitle: subtitle.trim(),
        icon,
      })
    } else {
      result = await onSave(trimmedTitle, subtitle.trim(), icon)
    }

    if (result.success) {
      onClose()
    } else {
      setError(result.error)
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setDeleting(true)
    setError(null)

    const result = await onDelete(section.id)

    if (result.success) {
      onClose()
    } else {
      setError(result.error)
      setDeleting(false)
    }
  }

  const itemCount = section?.items?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-5 pb-8 animate-slide-up" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Edit Section' : 'New Section'}
          </h2>
          <button
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 -mr-2"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Icon picker */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all
                  ${icon === emoji
                    ? 'bg-gray-900 ring-2 ring-gray-900 ring-offset-2'
                    : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
                  }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Title input */}
        <div className="mb-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Subtitle input */}
        <div className="mb-4">
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtitle (optional)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-sm text-red-500">{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full h-14 rounded-full bg-gray-900 text-white font-medium text-base active:scale-[0.97] transition-all disabled:opacity-40 flex items-center justify-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Save'
          )}
        </button>

        {/* Delete section (only in edit mode) */}
        {isEditing && onDelete && (
          <div className="mt-4">
            {confirmDelete ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm text-red-600 mb-3">
                  This will delete all {itemCount} item{itemCount !== 1 ? 's' : ''} in this section. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 h-12 rounded-full border border-gray-200 text-gray-500 font-medium text-sm active:scale-[0.97] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 h-12 rounded-full bg-red-500 text-white font-medium text-sm active:scale-[0.97] transition-all flex items-center justify-center"
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-red-200 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="w-full h-12 rounded-full border border-red-200 text-red-500 font-medium text-sm active:scale-[0.97] transition-all"
              >
                Delete Section
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
