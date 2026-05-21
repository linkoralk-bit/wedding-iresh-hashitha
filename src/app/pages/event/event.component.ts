import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectorRef, ChangeDetectionStrategy, NgZone
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MemoryService } from '../../services/memory.service';

interface Heart {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  colorIdx: number;
  opacity: number;
}

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent implements OnInit, OnDestroy, AfterViewInit {

  event: any = null;
  mapUrl!: SafeResourceUrl;
  isPlaying = false;
  rsvpSubmitted = false;
  private isOpening = false;

  // Hero typewriter
  displayGroom = '';
  displayBride = '';
  private typeIntervals: any[] = [];
  private typeTimeouts: any[] = [];

  // Countdown
  countdown     = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  prevCountdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private timerInterval: any;

  // Background slideshow
  bgSlides: string[] = [];
  activeBgIndex = 0;
  private bgInterval: any;

  // Floating particles
  hearts: Heart[] = [];
  private heartIdCounter = 0;
  private heartSpawnInterval: any;

  // Gallery
  galleryIndex = 0;
  private galleryAutoInterval: any;

  // Lightbox
  showLightbox  = false;
  currentIndex  = 0;
  currentImage  = '';

  readonly filmHoles = Array(8).fill(0);
  readonly HEART_PATH = '';

  // Champagne / pearl particle palette
  readonly HEART_COLORS = [
    '#d9b87a', // champagne
    '#c79b56', // gold
    '#f0e2c2', // pearl
    '#b8884a', // antique
    '#e8cf95', // light gold
    '#a87a3c', // bronze
  ];

  memories: any[] = [];

  // Premium Private Collection
  readonly premiumArtworks: { src: string; title: string; chapter: string; caption: string; }[] = [
  { src: 'assets/images/hi1.jpeg', title: 'Golden Hour',      chapter: 'Chapter I',   caption: 'Where eyes first met beneath a sunlit promise.' },
  { src: 'assets/images/hi2.jpeg', title: 'Foreheads Touch',  chapter: 'Chapter II',  caption: 'A vow whispered without a single word.' },
  { src: 'assets/images/hi3.jpeg', title: 'The Garden Walk',  chapter: 'Chapter III', caption: 'Side by side, into a softer light.' },
  { src: 'assets/images/hi4.jpeg', title: 'Held',             chapter: 'Chapter IV',  caption: 'In the quiet, an entire world.' },
  { src: 'assets/images/hi5.jpeg', title: 'Lakeside, Dusk',   chapter: 'Chapter V',   caption: 'Two silhouettes, one horizon.' },
  { src: 'assets/images/hi6.jpeg', title: 'Beneath the Tree', chapter: 'Chapter VI',  caption: 'A pause, a smile, a forever.' },
  { src: 'assets/images/hi7.jpeg', title: 'Moonlit Promise',  chapter: 'Chapter VII', caption: 'Under silver skies, hearts spoke softly.' },
];

  featuredArtIndex = 0;
  private featuredArtInterval: any;

  selectFeaturedArt(i: number) {
    this.featuredArtIndex = (i + this.premiumArtworks.length) % this.premiumArtworks.length;
    this.cdr.detectChanges();
    this.resetFeaturedArtAuto();
  }
  prevFeaturedArt() { this.selectFeaturedArt(this.featuredArtIndex - 1); }
  nextFeaturedArt() { this.selectFeaturedArt(this.featuredArtIndex + 1); }

  startFeaturedArtAuto() {
    this.ngZone.runOutsideAngular(() => {
      this.featuredArtInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.featuredArtIndex = (this.featuredArtIndex + 1) % this.premiumArtworks.length;
          this.cdr.detectChanges();
        });
      }, 5200);
    });
  }
  resetFeaturedArtAuto() {
    clearInterval(this.featuredArtInterval);
    this.startFeaturedArtAuto();
  }

  // Memory wall
  guestName = '';
  memoryMessage = '';
  selectedMemoryFile: any;
  memoryUploading = false;
  memoryFileName = '';

  constructor(
    private route:     ActivatedRoute,
    private api:       ApiService,
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
    private ngZone:    NgZone,
    private memoryService: MemoryService,
  ) {}

  ngOnInit() {
    this.spawnInitialHearts();
    this.startHeartSpawner();

    const slug = this.route.snapshot.paramMap.get('slug');
    this.api.getEvent(slug!).subscribe(res => {
      this.event = res;
      this.loadMemories();
      this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://maps.google.com/maps?q=${encodeURIComponent(res.location)}&output=embed`
      );

      this.bgSlides = [
        '/assets/images/hi1.jpeg',
        '/assets/images/hi2.jpeg',
        '/assets/images/hi3.jpeg',
        '/assets/images/hi4.jpeg',
        '/assets/images/hi5.jpeg',
        '/assets/images/hi6.jpeg',
        '/assets/images/hi7.jpeg',
      ];

      this.startBgSlideshow();
      this.startGalleryAuto();
      this.startFeaturedArtAuto();
      this.startCountdown();
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.initScrollObserver(), 800);
  }

 openEnvelope(audio: HTMLAudioElement) {

  // prevent double tap / reopen
  if (this.isOpening) return;

  this.isOpening = true;

  // autoplay music
  if (!this.isPlaying) {
    audio.play().then(() => {
      this.isPlaying = true;
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  const wrap     = document.getElementById('envelopeWrap');
  const hint     = document.getElementById('wsHint');
  const letterEl = document.getElementById('letterReveal');
  const sceneEl  = document.getElementById('envelopeScene');
  const burnEl   = document.getElementById('filmBurn');

  if (!wrap || !letterEl || !sceneEl) {
    this.isOpening = false;
    return;
  }

  // prevent additional clicks
  wrap.style.pointerEvents = 'none';

  // open animation
  wrap.classList.add('scroll-opened');
  wrap.classList.add('scroll-unrolling');

  // hide tap hint
  if (hint) {
    hint.style.opacity = '0';
    hint.style.pointerEvents = 'none';
  }

  // burn transition
  setTimeout(() => {
    if (burnEl) {
      burnEl.classList.add('burning');
    }
  }, 500);

  // reveal invitation
  setTimeout(() => {

    // completely disable old scene
    sceneEl.classList.add('hidden-scene');

    // show invitation
    letterEl.style.display = 'block';

    // force reflow
    letterEl.getBoundingClientRect();

    // activate reveal
    letterEl.classList.add('revealed');

    // restore mobile scrolling
    document.body.style.overflowY = 'auto';
    document.body.style.touchAction = 'pan-y';

    // scroll to top
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'instant' as ScrollBehavior
      });
    });

    // animations
    setTimeout(() => {
      this.animateNames();
      this.initScrollObserver();
      this.cdr.detectChanges();
    }, 300);

  }, 950);

  // cleanup
  setTimeout(() => {

    if (burnEl) {
      burnEl.classList.remove('burning');
    }

    // fully remove old scene from DOM flow
    sceneEl.style.display = 'none';

  }, 1800);

  this.cdr.detectChanges();
}

  // ── BACKGROUND SLIDESHOW ────────────────────────────────
  startBgSlideshow() {
    this.bgInterval = setInterval(() => {
      this.activeBgIndex = (this.activeBgIndex + 1) % this.bgSlides.length;
      this.cdr.detectChanges();
    }, 6000);
  }
  isBgActive(i: number): boolean { return i === this.activeBgIndex; }

  // ── GALLERY ─────────────────────────────────────────────
  get galleryImages(): string[] { return this.event?.gallery || []; }
  get galleryDots():   number[] { return this.galleryImages.map((_, i) => i); }

  goToSlide(n: number) {
    this.galleryIndex = (n + this.galleryImages.length) % this.galleryImages.length;
    this.cdr.detectChanges();
    this.resetGalleryAuto();
  }
  prevSlide() { this.goToSlide(this.galleryIndex - 1); }
  nextSlide() { this.goToSlide(this.galleryIndex + 1); }

  get galleryTranslate(): string { return `translateX(-${this.galleryIndex * 100}%)`; }

  startGalleryAuto() {
    this.galleryAutoInterval = setInterval(() => {
      this.galleryIndex = (this.galleryIndex + 1) % Math.max(this.galleryImages.length, 1);
      this.cdr.detectChanges();
    }, 4800);
  }
  resetGalleryAuto() {
    clearInterval(this.galleryAutoInterval);
    this.startGalleryAuto();
  }

  // ── PARTICLES ───────────────────────────────────────────
  spawnInitialHearts() {
    for (let i = 0; i < 18; i++) setTimeout(() => this.spawnHeart(), i * 400);
  }
  startHeartSpawner() {
    this.ngZone.runOutsideAngular(() => {
      this.heartSpawnInterval = setInterval(() => {
        this.ngZone.run(() => { this.spawnHeart(); this.cdr.detectChanges(); });
      }, 1100);
    });
  }
  spawnHeart() {
    const id = this.heartIdCounter++;
    const heart: Heart = {
      id,
      x:        Math.random() * 100,
      size:     Math.random() * 10 + 8,
      delay:    Math.random() * 8,
      duration: Math.random() * 14 + 14,
      colorIdx: Math.floor(Math.random() * this.HEART_COLORS.length),
      opacity:  0.18 + Math.random() * 0.32,
    };
    this.hearts.push(heart);
    setTimeout(() => {
      this.hearts = this.hearts.filter(h => h.id !== id);
      this.cdr.detectChanges();
    }, (heart.duration + heart.delay + 2) * 1000);
  }
  heartColor(idx: number): string { return this.HEART_COLORS[idx % this.HEART_COLORS.length]; }
  trackHeart(_: number, h: Heart): number { return h.id; }

  // ── TYPEWRITER ──────────────────────────────────────────
  animateNames() {
    this.typeIntervals.forEach(clearInterval);
    this.typeTimeouts.forEach(clearTimeout);
    this.typeIntervals = [];
    this.typeTimeouts = [];
    this.displayGroom = '';
    this.displayBride = '';

    const groom = this.event?.groom || '';
    const bride = this.event?.bride || '';
    let i = 0;

    const gi = setInterval(() => {
      if (i < groom.length) {
        this.displayGroom += groom[i]; i++;
        this.cdr.detectChanges();
      } else {
        clearInterval(gi);
        const t = setTimeout(() => {
          let j = 0;
          const bi = setInterval(() => {
            if (j < bride.length) {
              this.displayBride += bride[j]; j++;
              this.cdr.detectChanges();
            } else { clearInterval(bi); }
          }, 95);
          this.typeIntervals.push(bi);
        }, 420);
        this.typeTimeouts.push(t);
      }
    }, 95);
    this.typeIntervals.push(gi);
  }

  // ── COUNTDOWN ───────────────────────────────────────────
  startCountdown() {
    const target = new Date(this.event.date + 'T09:00:00');
    const run = () => {
      const diff = target.getTime() - Date.now();
      if (diff > 0) {
        const next = {
          days:    Math.floor(diff / 86_400_000),
          hours:   Math.floor((diff % 86_400_000) / 3_600_000),
          minutes: Math.floor((diff % 3_600_000)  / 60_000),
          seconds: Math.floor((diff % 60_000)     / 1_000),
        };
        this.prevCountdown = { ...this.countdown };
        this.countdown = next;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.timerInterval);
      }
    };
    run();
    this.timerInterval = setInterval(run, 1000);
  }

  get fDays():    string { return String(this.countdown.days).padStart(3, '0'); }
  get fHours():   string { return String(this.countdown.hours).padStart(2, '0'); }
  get fMinutes(): string { return String(this.countdown.minutes).padStart(2, '0'); }
  get fSeconds(): string { return String(this.countdown.seconds).padStart(2, '0'); }

  tickDays():    boolean { return this.countdown.days    !== this.prevCountdown.days; }
  tickHours():   boolean { return this.countdown.hours   !== this.prevCountdown.hours; }
  tickMinutes(): boolean { return this.countdown.minutes !== this.prevCountdown.minutes; }
  tickSeconds(): boolean { return this.countdown.seconds !== this.prevCountdown.seconds; }

  // ── SCROLL OBSERVER ─────────────────────────────────────
  initScrollObserver() {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.07 }
    );
    document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
  }

  // ── LIGHTBOX ────────────────────────────────────────────
  openLightbox(index: number) {
    this.currentIndex = index;
    this.currentImage = this.event.gallery[index];
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }
  closeLightbox(event?: MouseEvent) {
    if (!event || (event.target as HTMLElement).classList.contains('lb-overlay')) {
      this.showLightbox = false;
      document.body.style.overflow = '';
      this.cdr.detectChanges();
    }
  }
  prevLightbox() {
    this.currentIndex = (this.currentIndex - 1 + this.event.gallery.length) % this.event.gallery.length;
    this.currentImage = this.event.gallery[this.currentIndex];
    this.cdr.detectChanges();
  }
  nextLightbox() {
    this.currentIndex = (this.currentIndex + 1) % this.event.gallery.length;
    this.currentImage = this.event.gallery[this.currentIndex];
    this.cdr.detectChanges();
  }

  // ── MUSIC ────────────────────────────────────────────────
  async toggleMusic(audio: HTMLAudioElement) {
    try {
      if (this.isPlaying) audio.pause();
      else await audio.play();
      this.isPlaying = !this.isPlaying;
      this.cdr.detectChanges();
    } catch (e) { console.warn(e); }
  }

  // ── RSVP ─────────────────────────────────────────────────
  submitRsvp(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = {
      name:       (form.querySelector('[name="name"]')       as HTMLInputElement).value,
      phone:      (form.querySelector('[name="phone"]')      as HTMLInputElement).value,
      guestCount: Number((form.querySelector('[name="guestCount"]') as HTMLInputElement)?.value || 1),
      attending:  (form.querySelector('[name="attending"]')  as HTMLSelectElement).value === 'true',
      eventId:    this.event._id,
    };
    this.api.submitRSVP(data).subscribe(() => {
      this.rsvpSubmitted = true;
      this.cdr.detectChanges();
    });
  }

  loadMemories() {
    if (!this.event?._id) return;
    this.memoryService.getMemories(this.event._id).subscribe((res: any) => {
      this.memories = res;
      this.cdr.detectChanges();
    });
  }

  onMemoryFileChange(event: any) {
    this.selectedMemoryFile = event.target.files[0];
    this.memoryFileName = this.selectedMemoryFile?.name || '';
  }

  uploadMemory() {
    if (!this.selectedMemoryFile) { alert('Please select an image'); return; }
    if (!this.guestName) { alert('Please enter your name'); return; }

    this.memoryUploading = true;
    const formData = new FormData();
    formData.append('eventId', this.event._id);
    formData.append('guestName', this.guestName);
    formData.append('message', this.memoryMessage);
    formData.append('image', this.selectedMemoryFile);

    this.memoryService.uploadMemory(formData).subscribe({
      next: () => {
        this.memoryUploading = false;
        this.guestName = '';
        this.memoryMessage = '';
        this.selectedMemoryFile = null;
        this.memoryFileName = '';
        alert('Memory shared successfully ❤');
        this.loadMemories();
      },
      error: () => {
        this.memoryUploading = false;
        alert('Upload failed');
      }
    });
  }

  // ── CLEANUP ──────────────────────────────────────────────
  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.bgInterval);
    clearInterval(this.heartSpawnInterval);
    clearInterval(this.galleryAutoInterval);
    clearInterval(this.featuredArtInterval);
    this.typeIntervals.forEach(clearInterval);
    this.typeTimeouts.forEach(clearTimeout);
  }

  // ── DATE HELPERS ─────────────────────────────────────────
  getDaySuffix(): string {
    if (!this.event?.date) return '';
    const day = new Date(this.event.date).getDate();
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1:  return 'st';
      case 2:  return 'nd';
      case 3:  return 'rd';
      default: return 'th';
    }
  }

  getCalendarCells(): (number | null)[] {
    if (!this.event?.date) return Array(35).fill(null);
    const date = new Date(this.event.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let day = 1; day <= lastDate; day++) cells.push(day);
    while (cells.length < 35) cells.push(null);
    return cells;
  }
}
