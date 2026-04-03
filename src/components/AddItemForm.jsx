import { useState, useRef, useEffect } from 'react'

export default function AddItemForm({ sectionId, sectionTitle, onAdd, onClose }) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const textRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    textRef.current?.focus()
  }, [])

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  function removeImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)

    const result = await onAdd(sectionId, trimmed, imageFile || null)

    if (result.success) {
      onClose()
    } else {
      setError(result.error)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-5 pb-8 animate-slide-up" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Add to {sectionTitle}</h2>
          <button
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 -mr-2"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Text input */}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What to drill..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:border-gray-400 transition-colors"
        />

        {/* Image preview */}
        {imagePreview && (
          <div className="mt-3 relative inline-block">
            <img src={imagePreview} alt="" className="max-h-[120px] rounded-lg object-contain" />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}

        {/* Add image button */}
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="min-h-[48px] px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add Image
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!text.trim() || saving}
          className="mt-4 w-full h-14 rounded-full bg-gray-900 text-white font-medium text-base active:scale-[0.97] transition-all disabled:opacity-40 flex items-center justify-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  )
}
