// --- CORE STATE ---
let currentView = 'home';
let mediaData = null;
let mediaType = null;
let posts = JSON.parse(localStorage.getItem('muktadir_posts')) || [];
let filteredPosts = [...posts];
let searchQuery = '';

// --- UI ELEMENTS ---
const cursor = document.getElementById('custom-cursor');
const spotlight = document.querySelector('.spotlight');
const homeView = document.getElementById('home-view');
const postsView = document.getElementById('posts-view');
const modal = document.getElementById('modal-overlay');
const postForm = document.getElementById('post-form');
const postsContainer = document.getElementById('posts-container');
const errorToast = document.getElementById('error-toast');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const uploadPrompt = document.getElementById('upload-prompt');
const mediaPreview = document.getElementById('media-preview');

// --- CURSOR & SPOTLIGHT ---
document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    spotlight.style.setProperty('--x', `${e.clientX}px`);
    spotlight.style.setProperty('--y', `${e.clientY}px`);
});

const updateHoverListeners = () => {
    document.querySelectorAll('.btn-hover').forEach(el => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
    });
};

const handleEnter = () => document.body.classList.add('hovering');
const handleLeave = () => document.body.classList.remove('hovering');

updateHoverListeners();

// --- KEYBOARD NAVIGATION ---
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        toggleModal(false);
    }
    
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (currentView === 'posts') {
            document.getElementById('search-input')?.focus();
        }
    }
    
    // Arrow keys for navigation (when not in input)
    if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'ArrowLeft' && currentView === 'posts') {
            switchView('home');
        } else if (e.key === 'ArrowRight' && currentView === 'home') {
            switchView('posts');
        }
    }
});

// --- MODAL FUNCTIONS ---
function toggleReferencesModal() {
    const referencesModal = document.getElementById('references-modal');
    if (!referencesModal) return;
    if (referencesModal.style.display === 'flex') {
        referencesModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        referencesModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function toggleProjectsModal() {
    const projectsModal = document.getElementById('projects-modal');
    if (!projectsModal) return;
    if (projectsModal.style.display === 'flex') {
        projectsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        projectsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- NAVIGATION ---
function switchView(view) {
    currentView = view;
    if (view === 'home') {
        postsView.style.display = 'none';
        homeView.style.display = 'block';
        setTimeout(() => {
            postsView.classList.add('hidden-view');
            homeView.classList.remove('hidden-view');
        }, 10);
    } else {
        homeView.style.display = 'none';
        postsView.style.display = 'block';
        renderPosts();
        setTimeout(() => {
            homeView.classList.add('hidden-view');
            postsView.classList.remove('hidden-view');
        }, 10);
    }
    window.scrollTo(0, 0);
}

// --- CONTACT MODAL ---
function toggleContactModal() {
    const contactModal = document.getElementById('contact-modal');
    if (contactModal.style.display === 'flex') {
        contactModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        contactModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// --- COPY TO CLIPBOARD ---
function copyToClipboard(text, type, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '✓';
        buttonElement.classList.add('text-green-500');
        
        setTimeout(() => {
            buttonElement.innerHTML = originalHTML;
            buttonElement.classList.remove('text-green-500');
        }, 2000);
        
        // Optional: Show toast notification
        showCopyNotification(`${type} copied to clipboard!`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showError('Failed to copy to clipboard');
    });
}

function showCopyNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-8 left-1/2 -translate-x-1/2 z-[1100] bg-green-600 text-white px-6 py-2 rounded-full text-xs font-code shadow-2xl transition-all';
    notification.textContent = message;
    notification.style.opacity = '0';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// --- SEARCH FUNCTIONALITY ---
function initializeSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input 
            type="text" 
            id="search-input" 
            class="search-input" 
            placeholder="Search engineering logs... (Ctrl+K)"
            autocomplete="off"
        >
        <div id="search-results" class="search-results" style="display: none;"></div>
    `;
    
    // Insert search after the navigation in posts view
    const nav = postsView.querySelector('nav');
    nav.insertAdjacentElement('afterend', searchContainer);
    
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchQuery = e.target.value.toLowerCase();
        
        searchTimeout = setTimeout(() => {
            if (searchQuery.trim() === '') {
                filteredPosts = [...posts];
                searchResults.style.display = 'none';
            } else {
                performSearch(searchQuery);
            }
            renderPosts();
        }, 300);
    });
    
    searchInput.addEventListener('focus', () => {
        if (searchQuery.trim() !== '') {
            performSearch(searchQuery);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function performSearch(query) {
    const searchResults = document.getElementById('search-results');
    filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
    );
    
    // Show search results dropdown
    if (query.trim() !== '') {
        const resultsHtml = filteredPosts.slice(0, 5).map(post => `
            <div class="search-result-item" onclick="scrollToPost(${post.id})">
                <div class="font-code text-xs text-zinc-600">${post.date}</div>
                <div class="text-sm">${post.title}</div>
            </div>
        `).join('');
        
        searchResults.innerHTML = resultsHtml || '<div class="search-result-item text-zinc-600">No results found</div>';
        searchResults.style.display = 'block';
    }
}

function scrollToPost(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('search-results').style.display = 'none';
        document.getElementById('search-input').value = '';
        searchQuery = '';
        filteredPosts = [...posts];
        renderPosts();
    }
}

// --- LAZY LOADING ---
function setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                
                if (src) {
                    img.src = src;
                    img.onload = () => {
                        img.classList.remove('lazy-placeholder');
                        observer.unobserve(img);
                    };
                }
            }
        });
    });
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// --- MODAL & FORM ---
function toggleModal(show) {
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
        document.body.style.overflow = 'hidden';
        // Focus on first input
        setTimeout(() => {
            document.getElementById('admin-pass')?.focus();
        }, 100);
    } else {
        document.body.style.overflow = 'auto';
    }
}

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        mediaData = event.target.result;
        mediaType = file.type.startsWith('video') ? 'video' : 'image';
        
        uploadPrompt.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        
        if (mediaType === 'image') {
            mediaPreview.innerHTML = `<img src="${mediaData}" class="w-full h-full object-cover">`;
        } else {
            mediaPreview.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[8px] font-code">VIDEO</div>`;
        }
    };
    reader.readAsDataURL(file);
});

function removeMedia(e) {
    e.stopPropagation();
    mediaData = null;
    mediaType = null;
    fileInput.value = '';
    uploadPrompt.classList.remove('hidden');
    previewContainer.classList.add('hidden');
}

// --- INPUT VALIDATION & SECURITY ---
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function validatePostData(title, content) {
    if (!title || title.trim().length === 0) {
        showError('Title is required');
        return false;
    }
    
    if (!content || content.trim().length === 0) {
        showError('Content is required');
        return false;
    }
    
    if (title.length > 200) {
        showError('Title must be less than 200 characters');
        return false;
    }
    
    if (content.length > 10000) {
        showError('Content must be less than 10,000 characters');
        return false;
    }
    
    return true;
}

postForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    
    if (pass !== "Admin@123#") {
        showError("Access Denied");
        return;
    }

    const title = sanitizeInput(document.getElementById('post-title').value);
    const content = sanitizeInput(document.getElementById('post-content').value);
    
    if (!validatePostData(title, content)) {
        return;
    }

    const newPost = {
        id: Date.now(),
        title,
        content,
        mediaData,
        mediaType,
        date: new Date().toDateString(),
        tags: extractTags(content) // Extract hashtags from content
    };

    posts.unshift(newPost);
    filteredPosts = [...posts];
    localStorage.setItem('muktadir_posts', JSON.stringify(posts));
    
    postForm.reset();
    removeMedia({stopPropagation: () => {}});
    toggleModal(false);
    renderPosts();
});

function extractTags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
}

// --- DELETE FUNCTION ---
function deletePost(postId) {
    const pass = prompt("Enter Administrative Credentials to purge this log:");
    if (pass === "Admin@123#") {
        posts = posts.filter(p => p.id !== postId);
        filteredPosts = filteredPosts.filter(p => p.id !== postId);
        localStorage.setItem('muktadir_posts', JSON.stringify(posts));
        renderPosts();
    } else if (pass !== null) {
        showError("Unauthorized Access Attempt");
    }
}

// --- LOADING STATES ---
function showLoadingState() {
    postsContainer.innerHTML = `
        <div class="space-y-32">
            ${Array(3).fill(0).map(() => `
                <div class="border-t border-zinc-800 pt-16">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 80%"></div>
                    <div class="skeleton skeleton-text" style="width: 60%"></div>
                </div>
            `).join('')}
        </div>
    `;
}

// --- RENDERING ---
function renderPosts() {
    if (filteredPosts.length === 0) {
        postsContainer.innerHTML = `
            <div class="py-20 border-t border-zinc-800 font-code text-zinc-700">
                ${searchQuery ? 'No logs found matching your search.' : 'No logs found in local buffer.'}
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = filteredPosts.map(post => `
        <article class="border-t border-zinc-800 pt-16 reveal active" data-post-id="${post.id}">
            <div class="flex justify-between items-center text-[10px] font-code text-zinc-600 mb-8 uppercase tracking-widest">
                <div class="flex gap-6">
                    <span>${post.date}</span>
                    <span>REF: ${post.id.toString().slice(-6)}</span>
                </div>
                <button onclick="deletePost(${post.id})" class="text-zinc-800 hover:text-red-500 transition-colors btn-hover uppercase tracking-tighter">
                    [ Purge Log ]
                </button>
            </div>
            <h3 class="text-4xl font-main font-medium mb-8">${post.title}</h3>
            
            ${post.tags && post.tags.length > 0 ? `
                <div class="tag-container">
                    ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            ${post.mediaData ? `
                <div class="mb-10 rounded overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center">
                    ${post.mediaType === 'image' 
                        ? `<img data-src="${post.mediaData}" class="w-full h-full object-cover lazy-placeholder" alt="${post.title}">` 
                        : `<video src="${post.mediaData}" class="w-full h-full object-cover" controls></video>`}
                </div>
            ` : ''}
            
            <p class="text-lg text-zinc-400 font-light leading-relaxed whitespace-pre-wrap">${post.content}</p>
        </article>
    `).join('');
    
    updateHoverListeners();
    setupLazyLoading();
}

function showError(msg) {
    errorToast.innerText = msg;
    errorToast.style.opacity = '1';
    setTimeout(() => errorToast.style.opacity = '0', 3000);
}

// --- READING PROGRESS ---
function updateReadingProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    
    let progressBar = document.getElementById('reading-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'reading-progress';
        progressBar.className = 'reading-progress';
        document.body.appendChild(progressBar);
    }
    
    progressBar.style.width = `${Math.min(progress, 100)}%`;
}

// --- REVEAL ON SCROLL ---
function reveal() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - 100) {
            el.classList.add('active');
        }
    });
}

// --- INITIALIZATION ---
window.addEventListener('scroll', () => {
    reveal();
    updateReadingProgress();
});

window.onload = () => {
    reveal();
    renderPosts();
    initializeSearch();
    updateReadingProgress();
};

// Add search functionality to global scope for onclick handlers
window.scrollToPost = scrollToPost;
