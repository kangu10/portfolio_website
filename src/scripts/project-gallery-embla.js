import EmblaCarousel from 'embla-carousel';

const WHEEL_STEP = 120;
const WHEEL_SPEED = 2.5;

export function initProjectGalleryEmbla(root = document) {
  const lightbox = root.querySelector('.project-lightbox');
  const lightboxImage = root.querySelector('.project-lightbox-image');
  const lightboxCaption = root.querySelector('.project-lightbox-caption');
  const lightboxClose = root.querySelector('.project-lightbox-close');
  const lightboxPrev = root.querySelector('.project-lightbox-prev');
  const lightboxNext = root.querySelector('.project-lightbox-next');

  let activeLightboxItems = [];
  let activeLightboxIndex = 0;

  const updateLightbox = () => {
    if (!lightboxImage || !lightboxCaption || !activeLightboxItems.length) return;

    const activeItem = activeLightboxItems[activeLightboxIndex];
    lightboxImage.src = activeItem.src;
    lightboxImage.alt = activeItem.alt;
    lightboxCaption.textContent = activeItem.caption;
  };

  const openLightbox = (items, index) => {
    if (!lightbox || !items.length) return;

    activeLightboxItems = items;
    activeLightboxIndex = index;
    updateLightbox();

    if ('showModal' in lightbox && !lightbox.open) {
      lightbox.showModal();
    }
  };

  const stepLightbox = (direction) => {
    if (!activeLightboxItems.length) return;

    activeLightboxIndex =
      (activeLightboxIndex + direction + activeLightboxItems.length) %
      activeLightboxItems.length;

    updateLightbox();
  };

  if (
    lightbox &&
    lightboxClose &&
    lightboxPrev &&
    lightboxNext &&
    lightbox.dataset.initialized !== 'true'
  ) {
    lightbox.dataset.initialized = 'true';

    lightboxClose.addEventListener('click', () => lightbox.close());
    lightboxPrev.addEventListener('click', () => stepLightbox(-1));
    lightboxNext.addEventListener('click', () => stepLightbox(1));

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        lightbox.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!lightbox.open) return;

      if (event.key === 'Escape') lightbox.close();
      if (event.key === 'ArrowLeft') stepLightbox(-1);
      if (event.key === 'ArrowRight') stepLightbox(1);
    });
  }

  root.querySelectorAll('.project-gallery-shell').forEach((galleryShell) => {
    if (!(galleryShell instanceof HTMLElement)) return;
    if (galleryShell.dataset.initialized === 'true') return;

    const viewport = galleryShell.querySelector('.project-gallery-viewport');
    const container = galleryShell.querySelector('.project-gallery');
    const prevButton = galleryShell.querySelector('.project-gallery-arrow-prev');
    const nextButton = galleryShell.querySelector('.project-gallery-arrow-next');

    if (
      !(viewport instanceof HTMLElement) ||
      !(container instanceof HTMLElement) ||
      !(prevButton instanceof HTMLButtonElement) ||
      !(nextButton instanceof HTMLButtonElement)
    ) {
      return;
    }

    galleryShell.dataset.initialized = 'true';

    const embla = EmblaCarousel(viewport, {
      align: 'center',
      containScroll: 'trimSnaps',
      dragFree: true,
      duration: 22,
      skipSnaps: false,
      watchDrag: true,
      container: '.project-gallery',
      slides: '.project-gallery-item',
    });

    const imageButtons = Array.from(
      container.querySelectorAll('.project-gallery-open')
    ).filter((button) => button instanceof HTMLButtonElement);

    const galleryItems = imageButtons
      .map((button) => {
        const image = button.querySelector('img');
        const caption = button.closest('.project-gallery-item')?.querySelector('figcaption');

        if (!(image instanceof HTMLImageElement)) return null;

        image.draggable = false;

        return {
          src: image.currentSrc || image.src,
          alt: image.alt,
          caption: caption?.textContent?.trim() || '',
        };
      })
      .filter(Boolean);

    let pointerStartX = 0;
    let dragMoved = false;

    viewport.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });

    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      pointerStartX = event.clientX;
      dragMoved = false;
      viewport.classList.add('is-dragging');
    });

    viewport.addEventListener('pointermove', (event) => {
      if (Math.abs(event.clientX - pointerStartX) > 8) {
        dragMoved = true;
      }
    });

    const clearDragState = () => {
      viewport.classList.remove('is-dragging');
    };

    viewport.addEventListener('pointerup', clearDragState);
    viewport.addEventListener('pointercancel', clearDragState);
    viewport.addEventListener('mouseleave', clearDragState);

    imageButtons.forEach((button, index) => {
      button.addEventListener('click', (event) => {
        if (dragMoved) {
          event.preventDefault();
          event.stopPropagation();
          dragMoved = false;
          return;
        }

        openLightbox(galleryItems, index);
      });
    });

    const updateButtons = () => {
      prevButton.disabled = !embla.canScrollPrev();
      nextButton.disabled = !embla.canScrollNext();
    };

    prevButton.addEventListener('click', () => embla.scrollPrev());
    nextButton.addEventListener('click', () => embla.scrollNext());

    let wheelDistance = 0;

    const getWheelDistance = (event) => {
      const primaryDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const deltaUnit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 32
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? viewport.clientWidth
            : 1;

      return primaryDelta * deltaUnit * WHEEL_SPEED;
    };

    viewport.addEventListener(
      'wheel',
      (event) => {
        const distance = getWheelDistance(event);
        const canScroll =
          (distance > 0 && embla.canScrollNext()) ||
          (distance < 0 && embla.canScrollPrev());

        if (!distance || !canScroll) return;

        event.preventDefault();
        wheelDistance += distance;

        if (Math.abs(wheelDistance) < WHEEL_STEP) return;

        if (wheelDistance > 0) {
          embla.scrollNext();
        } else {
          embla.scrollPrev();
        }

        wheelDistance = 0;
      },
      { passive: false }
    );

    embla
      .on('init', updateButtons)
      .on('reInit', updateButtons)
      .on('select', updateButtons)
      .on('settle', updateButtons);

    requestAnimationFrame(() => {
      embla.reInit();
      updateButtons();
    });
  });
}

if (typeof document !== 'undefined') {
  const boot = () => initProjectGalleryEmbla(document);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
