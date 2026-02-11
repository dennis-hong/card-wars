// ============================================================
// Sound Effects - ElevenLabs generated MP3s
// ============================================================

const cache = new Map<string, HTMLAudioElement>();

function play(path: string, volume = 0.7) {
  try {
    let audio = cache.get(path);
    if (!audio) {
      audio = new Audio(path);
      cache.set(path, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // silent fail
  }
}

export const SFX = {
  cardFlip() {
    play('/sfx/card-flip.mp3', 0.6);
  },

  packOpen() {
    play('/sfx/pack-open.mp3', 0.8);
  },

  gradeReveal(grade: number) {
    if (grade === 4) {
      play('/sfx/reveal-legendary.mp3', 0.9);
    } else if (grade === 3) {
      play('/sfx/reveal-hero.mp3', 0.8);
    } else if (grade === 2) {
      play('/sfx/reveal-rare.mp3', 0.7);
    } else {
      play('/sfx/reveal-common.mp3', 0.5);
    }
  },

  attack() {
    play('/sfx/attack.mp3', 0.7);
  },

  skillActivate() {
    play('/sfx/skill.mp3', 0.7);
  },

  victory() {
    play('/sfx/victory.mp3', 0.8);
  },

  defeat() {
    play('/sfx/defeat.mp3', 0.7);
  },

  buttonClick() {
    play('/sfx/button-click.mp3', 0.4);
  },

  enhance() {
    play('/sfx/reveal-rare.mp3', 0.6);
  },
};
