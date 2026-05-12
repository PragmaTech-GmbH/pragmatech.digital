// Reveal.js init for the PragmaTech pitch deck.
// Notes plugin enables speaker view (press 's').
Reveal.initialize({
  width: 1280,
  height: 800,
  margin: 0.06,
  minScale: 0.3,
  maxScale: 1.8,

  controls: true,
  progress: true,
  hash: true,
  history: false,
  center: true,
  transition: 'slide',
  transitionSpeed: 'default',
  backgroundTransition: 'fade',

  slideNumber: false,
  showSlideNumber: 'all',

  plugins: [RevealNotes, RevealHighlight],
});

// Keep the chrome (logo + slide counter) in sync with the current slide.
Reveal.on('slidechanged', updateChrome);
Reveal.on('ready', updateChrome);

function updateChrome(evt) {
  var indices = Reveal.getIndices();
  var totalSlides = Reveal.getTotalSlides();
  var current = (indices.h + 1).toString().padStart(2, '0');
  var total = totalSlides.toString().padStart(2, '0');
  var cur = document.querySelector('.deck-chrome .slide-num .cur');
  var tot = document.querySelector('.deck-chrome .slide-num .tot');
  if (cur) cur.textContent = current;
  if (tot) tot.textContent = total;
}
