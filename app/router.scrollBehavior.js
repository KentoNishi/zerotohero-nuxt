let feedSavedPosition

function getScrollingElement() {
  return document.querySelector('.content-area')
}

export default async function (to, from, savedPosition) {
  const scrollingElement = getScrollingElement()

  if (!scrollingElement) {
    // handle case when scrollingElement is null
    console.error("Scrolling element not found")
    return false
  }

  if (from.name === 'feed') {
    feedSavedPosition = { x: scrollingElement.scrollLeft, y: scrollingElement.scrollTop }
  }

  if (to.hash && to.hash !== '#') {
    return {
      selector: to.hash
    }
  }

  if (from.name === 'dictionary' && to.name === 'dictionary') {
    return { selector: '.dictionary-main' }
  }

  if (from.name === 'compare' && to.name === 'compare') {
    return { selector: '.dictionary-main' }
  }

  if (to.name === 'feed') {
    if (feedSavedPosition) return feedSavedPosition
    return false
  }

  scrollingElement.scrollLeft = 0
  scrollingElement.scrollTop = -40
  return false
}
