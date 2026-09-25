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

const runtimeSupabaseConfig = window.ICEMAX_SUPABASE_CONFIG || {};

const SUPABASE_URL = runtimeSupabaseConfig.url || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = runtimeSupabaseConfig.anonKey || 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
const REVIEW_TABLE = runtimeSupabaseConfig.table || 'reviews';

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

const reviewForm = document.getElementById('review-form');
const reviewList = document.getElementById('review-list');
const REVIEW_KEY = 'icemax-reviews';
const REVIEW_CHANNEL = 'icemax-reviews-sync';
const LIVE_REVIEW_REFRESH_MS = 5000;

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

const isSupabaseConfigured = () => {
  return typeof SUPABASE_URL === 'string'
    && SUPABASE_URL.includes('supabase.co')
    && typeof SUPABASE_ANON_KEY === 'string'
    && !SUPABASE_ANON_KEY.includes('your-anon-key');
};

const fetchPublicReviews = async () => {
  if (!isSupabaseConfigured()) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${REVIEW_TABLE}?select=id,name,rating,comment&order=created_at.desc&limit=5`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Supabase fetch failed');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Falling back to local reviews:', error);
    return null;
  }
};

const savePublicReview = async (review) => {
  if (!isSupabaseConfigured()) {
    const reviews = readReviews();
    const updated = [review, ...reviews].slice(0, 5);
    syncReviews(updated);
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${REVIEW_TABLE}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        name: review.name,
        rating: review.rating,
        comment: review.comment
      })
    });

    if (!response.ok) {
      throw new Error('Supabase save failed');
    }
  } catch (error) {
    console.warn('Supabase save failed, using local storage fallback:', error);
    const reviews = readReviews();
    const updated = [review, ...reviews].slice(0, 5);
    syncReviews(updated);
  }
};

const renderReviews = async () => {
  if (!reviewList) return;

  let reviews = await fetchPublicReviews();
  if (!reviews) {
    reviews = readReviews();
  }

  reviewList.replaceChildren(...reviews.slice(0, 5).map((review) => {
    const article = document.createElement('article');
    const header = document.createElement('div');
    const name = document.createElement('strong');
    const stars = document.createElement('span');
    const comment = document.createElement('p');
    const rating = Math.min(Math.max(Number(review.rating) || 0, 0), 5);

    article.className = 'review-item';
    header.className = 'review-item-header';
    stars.className = 'review-stars';
    name.textContent = review.name || 'Anonymous';
    stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    comment.textContent = review.comment || '';
    header.append(name, stars);
    article.append(header, comment);
    return article;
  }));
};

const startLiveReviewSync = () => {
  if (!isSupabaseConfigured()) return;

  window.clearInterval(window.__icemax_reviews_interval__);
  window.__icemax_reviews_interval__ = window.setInterval(() => {
    renderReviews();
  }, LIVE_REVIEW_REFRESH_MS);
};

reviewForm?.addEventListener('submit', async (event) => {
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

  await savePublicReview(newReview);
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
startLiveReviewSync();

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
