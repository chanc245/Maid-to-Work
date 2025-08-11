// scripts/audio.js
// Requires p5.sound (you already include it). Provides a tiny global SFX helper.

window.SFX = (function () {
  const bank = {}; // name -> p5.SoundFile
  let bg; // background music
  let started = false;

  function _safe(name) {
    return bank[name] || null;
  }

  return {
    preload() {
      // Load bg + sfx
      bg = loadSound("assets/audio/bg_music.mp3");

      // CHORE 1
      bank.food_bad = loadSound("assets/audio/food_bad.mp3");
      bank.food_blood = loadSound("assets/audio/food_blood.mp3");
      bank.food_good = loadSound("assets/audio/food_good.mp3");

      // CHORE 2
      bank.wash_scrub = loadSound("assets/audio/wash_scrub.mp3");
      bank.wash_clean = loadSound("assets/audio/wash_clean.mp3");

      // CHORE 3
      bank.paper_chew = loadSound("assets/audio/paper_chew.wav");
      bank.paper_sort = loadSound("assets/audio/paper_sort.wav");

      // NEW: UI / dialogue sounds
      bank.text_advance = loadSound("assets/audio/text_advence.wav");
      bank.ui_nextDay = loadSound("assets/audio/ui_nextDay.mp3");
      bank.ui_sleep = loadSound("assets/audio/ui_sleep.mp3");
      bank.ui_countDown = loadSound("assets/audio/ui_countDown.mp3");

      // Optional: default volumes
      if (bg) bg.setVolume(0.35);

      // CHORE 1
      if (bank.food_bad) bank.food_bad.setVolume(0.7);
      if (bank.food_blood) bank.food_blood.setVolume(0.7);
      if (bank.food_good) bank.food_good.setVolume(0.7);

      // CHORE 2
      if (bank.wash_scrub) bank.wash_scrub.setVolume(0.5);
      if (bank.wash_clean) bank.wash_clean.setVolume(0.8);

      // CHORE 3
      if (bank.paper_chew) bank.paper_chew.setVolume(0.9);
      if (bank.paper_sort) bank.paper_sort.setVolume(0.6);

      // UI
      if (bank.text_advance) bank.text_advance.setVolume(0.5);
      if (bank.ui_nextDay) bank.ui_nextDay.setVolume(0.6);
      if (bank.ui_sleep) bank.ui_sleep.setVolume(0.7);
      if (bank.ui_countDown) bank.ui_countDown.setVolume(0.8);
    },

    // Call on first user interaction (autoplay policy)
    startBG() {
      if (started) return;
      started = true;
      if (bg && !bg.isPlaying()) {
        bg.setLoop(true);
        bg.play();
      }
    },
    stopBG() {
      if (bg && bg.isPlaying()) bg.stop();
      started = false;
    },

    // One-shot
    playOnce(name) {
      const s = _safe(name);
      if (!s) return;
      s.setLoop(false);
      s.play();
    },

    // Loop control
    loop(name) {
      const s = _safe(name);
      if (!s) return;
      if (!s.isPlaying()) {
        s.setLoop(true);
        s.play();
      }
    },
    stop(name) {
      const s = _safe(name);
      if (!s) return;
      if (s.isPlaying()) s.stop();
    },
    isPlaying(name) {
      const s = _safe(name);
      return !!(s && s.isPlaying());
    },
  };
})();
