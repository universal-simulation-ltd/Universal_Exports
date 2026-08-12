// The page container for the landing view — shared with the navbar via the
// SDK's `contentClassName`, so the suite switcher lines up with the left edge
// of the page content (and the profile/changelog cluster with its right edge)
// at every breakpoint.
//
// Note the padding scale is md: here, not sm:/lg: like the other apps — it
// mirrors what Landing.tsx already used. The navbar takes the class verbatim,
// so the two cannot drift.
export const CONTAINER = 'max-w-7xl mx-auto px-4 md:px-6'
