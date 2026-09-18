export function scrollToSection(sectionId, onDone) {
  return (event) => {
    event.preventDefault()
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (typeof onDone === 'function') {
      onDone()
    }
  }
}
