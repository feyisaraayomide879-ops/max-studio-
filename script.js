const body = document.body;
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
const navLinks = document.querySelectorAll('.main-nav a');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = document.querySelector('.theme-icon');
const yearEl = document.getElementById('year');
const progressBar = document.querySelector('.scroll-progress');
const revealEls = document.querySelectorAll('.reveal');
const statEls = document.querySelectorAll('[data-target]');
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

const savedTheme = localStorage.getItem('max-theme');
if (savedTheme === 'light') {
  body.classList.add('light-theme');
  themeIcon.textContent = '🌙';
}

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

navToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

const updateScrollProgress = () => {
  if (!progressBar) return;
  const scrollTop = window.scrollY;
  const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = totalScroll > 0 ? (scrollTop / totalScroll) * 100 : 0;
  progressBar.style.width = `${progress}%`;
};

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

themeToggle?.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  themeIcon.textContent = isLight ? '🌙' : '☀️';
  localStorage.setItem('max-theme', isLight ? 'light' : 'dark');
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealEls.forEach((el) => revealObserver.observe(el));

const animateCount = (element) => {
  const target = Number(element.dataset.target || 0);
  const duration = 1200;
  const start = performance.now();

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
};

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.7 }
);

statEls.forEach((element) => countObserver.observe(element));

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));

    projectCards.forEach((card) => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden-project', !match);
    });
  });
});

const contactLink = document.querySelector('.cta-panel .btn');
contactLink?.addEventListener('click', (event) => {
  event.preventDefault();
  const message = 'Thanks! We will reach out within one business day.';
  const originalText = contactLink.textContent;
  contactLink.textContent = message;
  contactLink.disabled = true;

  setTimeout(() => {
    contactLink.textContent = originalText;
    contactLink.disabled = false;
  }, 2200);
});

const reviewForm = document.getElementById('review-form');
const reviewList = document.getElementById('review-list');
const REVIEW_KEY = 'icemax-reviews';
const REVIEW_CHANNEL = 'icemax-reviews-sync';

const defaultReviews = [
  {
    name: 'Chinwe Okafor',
    rating: 5,
    comment: 'Very professional service and great attention to detail. They explained everything clearly.'
  },
  {
    name: 'Tunde Adebayo',
    rating: 5,
    comment: 'Smooth process from start to finish. We felt supported and informed throughout.'
  },
  {
    name: 'Amina Yusuf',
    rating: 5,
    comment: 'Reliable, honest, and responsive. I would definitely recommend them.'
  }
];

const readReviews = () => {
  const saved = localStorage.getItem(REVIEW_KEY);
  if (!saved) return defaultReviews;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultReviews;
  } catch {
    return defaultReviews;
  }
};

const notifyReviewsUpdate = () => {
  window.dispatchEvent(new CustomEvent('reviews-updated'));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(REVIEW_CHANNEL);
    channel.postMessage({ type: 'reviews-updated' });
    channel.close();
  }
};

const syncReviews = (reviews) => {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
  notifyReviewsUpdate();
};

const renderReviews = () => {
  if (!reviewList) return;

  const reviews = readReviews();
  reviewList.innerHTML = reviews
    .slice(0, 5)
    .map((review) => {
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      return `
        <article class="review-item">
          <div class="review-item-header">
            <strong>${review.name}</strong>
            <span class="review-stars">${stars}</span>
          </div>
          <p>${review.comment}</p>
        </article>
      `;
    })
    .join('');
};

reviewForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const nameInput = document.getElementById('review-name');
  const ratingInput = document.getElementById('review-rating');
  const commentInput = document.getElementById('review-comment');

  if (!nameInput || !ratingInput || !commentInput) return;

  const newReview = {
    name: nameInput.value.trim() || 'Anonymous',
    rating: Number(ratingInput.value),
    comment: commentInput.value.trim()
  };

  const reviews = readReviews();
  const updated = [newReview, ...reviews].slice(0, 5);
  syncReviews(updated);
  renderReviews();
  reviewForm.reset();
});

if ('BroadcastChannel' in window) {
  const channel = new BroadcastChannel(REVIEW_CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type === 'reviews-updated') {
      renderReviews();
    }
  };
}

window.addEventListener('reviews-updated', () => {
  renderReviews();
});

window.addEventListener('storage', (event) => {
  if (event.key === REVIEW_KEY) {
    renderReviews();
  }
});

renderReviews();

navLinks.forEach((link) => {
  link.addEventListener('click', () => nav.classList.remove('is-open'));
});

const sections = document.querySelectorAll('main section[id]');
const highlightActiveLink = () => {
  const scrollPosition = window.scrollY + 140;
  let currentId = 'top';

  sections.forEach((section) => {
    if (scrollPosition >= section.offsetTop) {
      currentId = section.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    const match = link.getAttribute('href') === `#${currentId}`;
    link.classList.toggle('active', match);
  });
};

window.addEventListener('scroll', highlightActiveLink, { passive: true });
highlightActiveLink();

projectCards.forEach((card) => {
  card.addEventListener('mousemove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = (0.5 - (y / rect.height)) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});
