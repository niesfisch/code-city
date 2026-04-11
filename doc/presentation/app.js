const slides = [

    {
        kicker: 'Why?',
        title: 'Visualizing Code as 3D-City',
        subtitle: 'Code is complex and we need better ways to understand it',
        bullets: [
            'Feel for architecture and complexity',
            'Better than just pure numbers',
            'Enables (visual) communication between Dev, Po, Architects',
            'Helps to find hotspots and refactoring targets',
            'Dive into (legacy) codebases without reading every line',
            'It\'s Fun',
            'Try out vibe coding'
        ],
        image: './assets/images/city_overview.png',
    },
    {
        kicker: 'Idea',
        title: 'Standing on the Shoulders of Giants',
        subtitle: 'Not invented here.',
        bullets: [
            'I used the original CodeCity over 14 years ago',
            'Inspired by Wettel et al. and the Software City metaphor',
            'That original tool looks unmaintained and hard to run today',
            'Original stack: VisualWorks Smalltalk + Moose + OpenGL',
            'Academic Papers: ICPC 2007, VISSOFT 2007, Softvis 2008, WASDett 2008, WCRE 2008, FAMOOSr 2008',
            'Always wanted to have something like this (again) in my toolbox for real-world projects',
            'AI to the rescue 👾',
            'Disclaimer: private project, developed in my freetime'
        ],
        image: './assets/images/codecity_inspiration.png',
    },
    {
        kicker: 'Demo Time',
        title: '📽️',
        subtitle: 'Different Code, Different Cities',
        bullets: [
            'Load Project, Browser',
            'Navigation',
            'Explore City',
            'Plateaus, Buildings, Colors, Legends, Fun Mode',
            'Search, Filter',
            'Metrics',
            'Open File',
            'Archs',
            'Fly through',
        ],
        image: './assets/images/demo_time.png',
    },
    {
        kicker: 'How?',
        title: 'Vibe Coding my way into visualization heaven',
        subtitle: 'Fasten your seatbelts, we\'re going on a vibe coding journey.',
        bullets: [
            'Create new (empty) project',
            'Enter prompt from screenshot',
        ],
        image: './assets/images/copilot_start.png',
    },
    {
        kicker: 'How?',
        title: 'Vibe Coding my way into visualization heaven',
        subtitle: 'The human+agent loop',
        bullets: [
            '1. Look at result(s)',
            '2. Try out (new, fixed) features',
            '3. Create/Get new ideas',
            '4. Tell AI what to do next',
            '5. Let AI figure out what\'s wrong and fix',
            '5. Continue with 1.',
            '🔎 https://github.com/niesfisch/code-city/',
            '🔎 PROMPT_HISTORY.md'
        ],
        image: './assets/images/vibecoding_book.png',
    },

    {
        kicker: 'Feelings',
        title: 'What it feels like to be a vibe coder.',
        subtitle: 'The good, the bad and the ugly - THE GOOD',
        bullets: [
            'Ideas drive your flow',
            'Speed, Speed, Speed',
            'I got what I wanted',
            'New Ideas come to mind when looking at the results',
            'Feels like "God Mode enabled"',
            'AI fixes (Build) Errors',
            'Open Source Ready project (readme, ascii art diagrams, setup instructions, license, ci/cd)',
            'AI gives Ideas, Options',
            'Agent Mode creates files, runs commands',
            'Side Cleanups by AI',
            'Can Work ("Understand") with Screenshots',
            'Easy for greenfield stuff',
            'Made Sensible Tech Choices',
            'Code is really good, I am not better :-/'
        ],
        image: './assets/images/the_good_the_bad_good.png',
    },
    {
        kicker: 'Feelings',
        title: 'What it feels like to be a vibe coder.',
        subtitle: 'The good, the bad and the ugly - THE BAD',
        bullets: [
            'Potential for Hidden Bugs',
            'Wrong Metrics, Colors',
            'Re-Creating already deleted stuff',
            'Old Dependecies',
            'Deprectated Build Features',
            'Wait-Time for AI to finish -> Parallel Agents/Work',
            'Full Context Window(s)',
            'I stopped looking what AI doing after a while',
            'Doing Reviews feels backward / tedious',
            'Tokens as Currency',
            'Tedious to type, I want to talk/discuss',
            'UI/UX is a bit of guesswork, non-deterministic',
            'AI get\'s stuck for no reason (api errors, context window limits, not available ... always typed "continue")',
       ],
        image: './assets/images/the_good_the_bad_bad.png',
    },
    {
        kicker: 'Feelings',
        title: 'What it feels like to be a vibe coder.',
        subtitle: 'The good, the bad and the ugly - THE UGLY',
        bullets: [
            'AI Slop',
            'AI Fatigue',
            'Not (so) Proud anymore',
            'Security? - aehm never heard of it',
            'Hidden Bugs, Security Issues',
            'Yolo mode, not tried',
            'Fast pace is overwhelming',
        ],
        image: './assets/images/the_good_the_bad_ugly.png',
    },
    {
        kicker: 'Ideas',
        title: 'What could be done?',
        subtitle: '',
        bullets: [
            '3D Shooter',
            'Historical trend playback (Git history)',
            'PR-level delta city view',
            '...',
        ],
        image: './assets/images/ideas.png',
    },
    {
        kicker: 'Future',
        title: 'Where we are going we don\'t need to code',
        subtitle: 'A glimpse into the (not so) distant future?',
        bullets: [
            'we don\'t write software anymore',
            'we don\'t need to understand code anymore',
            'we don\'t use tools to understand code',
            'we deploy software as blackbox in gated environments',
            'agents working with each other, we orchestrate/delegate',
            'humans can\'t keep up with manual work (review, security etc.)',
            'new job types will emerge, existing ones will be merged/split/obsolete',
            'security incidents, data breaches will rise expoentially'
        ],
        image: './assets/images/backtothefuture.gif',
    },
    {
        kicker: 'One More Thing',
        title: 'Yes, This Was AI Vibe Coded End To End',
        subtitle: 'Not just the app. The whole delivery package.',
        bullets: [
            'Presentation app and interaction flow.',
            'Slides and messaging structure.',
            'PDF export automation script.',
            'Title and description for the invite.'
        ],
        image: './assets/images/one_more_thing.png',
    },
    {
        kicker: 'Q and A',
        title: 'Questions, Critique, Ideas?',
        subtitle: '',
        bullets: [
            'your turn :-)'
        ],
        image: './assets/images/qa.png',
    }
];
let current = 0;
let notesVisible = false;
const els = {
    kicker: document.getElementById('slideKicker'),
    title: document.getElementById('slideTitle'),
    subtitle: document.getElementById('slideSubtitle'),
    bullets: document.getElementById('slideBullets'),
    image: document.getElementById('slideImage'),
    notes: document.getElementById('slideNotes'),
    counter: document.getElementById('slideCounter'),
    progress: document.getElementById('progressFill'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    notesBtn: document.getElementById('notesBtn'),
    slideWrap: document.getElementById('slideWrap')
};

function renderSlide(index) {
    const slide = slides[index];
    if (!slide) {
        return;
    }
    els.kicker.textContent = slide.kicker || '';
    els.title.textContent = slide.title || '';
    els.subtitle.textContent = slide.subtitle || '';
    els.image.src = slide.image || '';
    els.bullets.innerHTML = '';
    (slide.bullets || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        els.bullets.appendChild(li);
    });
    els.notes.textContent = `Speaker note: ${slide.notes || 'None'}`;
    els.notes.classList.toggle('hidden', !notesVisible);
    const total = slides.length;
    els.counter.textContent = `${index + 1} / ${total}`;
    els.progress.style.width = `${((index + 1) / total) * 100}%`;
    document.title = `${slide.title} - Code City Talk`;
}

function nextSlide() {
    current = Math.min(slides.length - 1, current + 1);
    renderSlide(current);
}

function prevSlide() {
    current = Math.max(0, current - 1);
    renderSlide(current);
}

function toggleNotes() {
    notesVisible = !notesVisible;
    renderSlide(current);
}

function jumpTo(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    renderSlide(current);
}

els.nextBtn.addEventListener('click', nextSlide);
els.prevBtn.addEventListener('click', prevSlide);
els.notesBtn.addEventListener('click', toggleNotes);
els.slideWrap.addEventListener('click', event => {
    const rect = els.slideWrap.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    if (clickX > rect.width * 0.55) {
        nextSlide();
    } else if (clickX < rect.width * 0.45) {
        prevSlide();
    }
});
document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
            event.preventDefault();
            nextSlide();
            break;
        case 'ArrowLeft':
        case 'PageUp':
            event.preventDefault();
            prevSlide();
            break;
        case 'Home':
            event.preventDefault();
            jumpTo(0);
            break;
        case 'End':
            event.preventDefault();
            jumpTo(slides.length - 1);
            break;
        case 'n':
        case 'N':
            toggleNotes();
            break;
        default:
            break;
    }
});
renderSlide(current);
