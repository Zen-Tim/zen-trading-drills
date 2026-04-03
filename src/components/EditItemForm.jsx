import { useState, useRef, useEffect } from 'react'

export default function EditItemForm({ item, sectionTitle, onUpdate, onDelete, onClose }) {
  const [text, setText] = useState(item.text)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(item.image_url || null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    setRemoveImage(false)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  function handleRemoveImage() {
    setImageFile(null)
    if (imagePreview && imagePreview !== item.image_url) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setRemoveImage(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)

    const result = await onUpdate(item.id, trimmed, imageFile || null, removeImage)

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

    const sid = item.section_id
    const result = await onDelete(sid, item.id)

    if (result.success) {
      onClose()
    } else {
      setError(result.error)
      setDeleting(false)
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
          <h2 className="text-base font-semibold text-gray-900">Edit Item</h2>
          <button
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 -mr-2"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section label */}
        <p className="text-xs text-gray-400 mb-2">{sectionTitle}</p>

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
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"
            >
              x
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
            {imagePreview ? 'Change Image' : 'Add Image'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`h-14 rounded-full font-medium text-base active:scale-[0.97] transition-all flex items-center justify-center px-6
              ${confirmDelete
                ? 'bg-red-500 text-white'
                : 'border border-red-200 text-red-500'
              }`}
          >
            {deleting ? (
              <div className="w-5 h-5 border-2 border-red-200 border-t-white rounded-full animate-spin" />
            ) : confirmDelete ? (
              'Confirm Delete'
            ) : (
              'Delete'
            )}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="flex-1 h-14 rounded-full bg-gray-900 text-white font-medium text-base active:scale-[0.97] transition-all disabled:opacity-40 flex items-center justify-center"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
