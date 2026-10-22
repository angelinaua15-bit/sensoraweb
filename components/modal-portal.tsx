'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Renders its children directly into document.body instead of wherever the
// component happens to sit in the React tree. Belt-and-suspenders fix for
// full-screen modals: even if some future ancestor gets a CSS transform/
// filter/contain (any of which silently turns "position: fixed" into
// "positioned relative to that ancestor" instead of the real viewport),
// a modal mounted here is immune, because it isn't a DOM descendant of that
// ancestor at all.
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
