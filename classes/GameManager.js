// classes/GameManager.js
(function () {
  const DAYS = 3;

  // Ending thresholds (tweak as you like)
  const END_THRESHOLDS = {
    trueEndingMin: 45, // >= true ending minigame
    goodMin: 30,
    neutralMin: 15,
  };

  // Dialog IDs (must match scripts/dialogScripts.js)
  const DLG = {
    intro: "dia_Intro",
    endNormal: "dia_endNormal",
    endBad: "dia_endBad",
    endTrue: "dia_endTrue", // we run this as a prelude before true-ending minigame
  };

  // Manager states
  const S = {
    IDLE: "IDLE",
    IMAGE: "IMAGE",
    DIALOG: "DIALOG",
    REMINDER: "REMINDER",
    COUNTDOWN: "COUNTDOWN",
    PLAYING: "PLAYING",
    DAY_ANIM: "DAY_ANIM",
    TRUE_ENDING: "TRUE_ENDING",
    GAME_END: "GAME_END",
  };

  window.GameManager = class {
    constructor(shared) {
      this.pix = shared.pix;
      this.W = shared.W;
      this.H = shared.H;
      this.SCALE = shared.SCALE;
      this.pixelFont = shared.font;

      this.globalScore = 0;

      // Systems
      this.dialog = new Dialog({
        pix: this.pix,
        W: this.W,
        H: this.H,
        SCALE: this.SCALE,
        font: this.pixelFont,
      });
      this.endingTrue = new EndingTrue({
        pix: this.pix,
        W: this.W,
        H: this.H,
        SCALE: this.SCALE,
      });

      // Chores for the day sequence order: Chore1 → Chore3 → Chore2
      this.chores = [
        new Chore1({ pix: this.pix, W: this.W, H: this.H }), // index 0
        new Chore3({ pix: this.pix, W: this.W, H: this.H }), // index 1
        new Chore2({ pix: this.pix, W: this.W, H: this.H }), // index 2
      ];
      this.activeChore = null;

      // UI helpers
      this.dayAnim = new DayChangeAnim(this.pix);

      // Step queue
      this.steps = [];
      this.stepIndex = -1;

      // State
      this.state = S.IDLE;

      // Manager countdown (uniform)
      this.countdownMs = 4000;
      this.countdownStart = 0;

      // image / reminder scratch
      this.currentImage = null;
      this.reminder = null;

      // optional callback after dialog
      this._pendingAfterDialog = null;

      // optional bg frame for day anim (if loaded)
      this._dayAnimBg = typeof bg_frame !== "undefined" ? bg_frame : null;
    }

    // Preloads for subsystems
    static preload() {
      Dialog.preload();
      // use your renamed path
      EndingTrue.preload("assets/chore4_endingTrue");
    }

    // Build the entire game flow and start
    start() {
      this.globalScore = 0;
      this.steps = this._buildFlow();
      this.stepIndex = -1;
      this._nextStep();
    }

    sceneHasCustomCursor() {
      // Chores: ask the active chore
      if (this.state === "PLAYING") {
        return !!this.activeChore?.usesCustomCursor;
      }
      // True ending: has its own (duster)
      if (this.state === "TRUE_ENDING") {
        return !!this.endingTrue?.usesCustomCursor;
      }
      // Dialogs / reminders / transitions / normal ending pages: use default
      return false;
    }

    // -------------------------------------------------------------
    // Flow builder: EXACTLY your sequence
    _buildFlow() {
      const steps = [];

      // Helper to push REMINDER + (optional) IMAGE + CHORE trio
      const addRTC = (dayNum, dayTime, choreIndex, tutorialImg = null) => {
        steps.push({ type: "REMINDER", dayNum, dayTime });
        if (tutorialImg) steps.push({ type: "IMAGE", img: tutorialImg });
        steps.push({ type: "CHORE", index: choreIndex, dayNum });
      };

      // -------- DAY 1 --------
      steps.push({
        type: "IMAGE",
        img: typeof cg_title !== "undefined" ? cg_title : null,
      }); // title → click
      steps.push({ type: "DIALOG", id: DLG.intro, mode: "normal" }); // dia_intro → auto end

      addRTC(
        1,
        "morning",
        0,
        typeof ui_chore1_ex !== "undefined" ? ui_chore1_ex : null
      ); // Chore1
      addRTC(
        1,
        "evening",
        1,
        typeof ui_chore3_ex !== "undefined" ? ui_chore3_ex : null
      ); // Chore3
      addRTC(
        1,
        "night",
        2,
        typeof ui_chore2_ex !== "undefined" ? ui_chore2_ex : null
      ); // Chore2

      steps.push({ type: "DAY_ANIM", from: 1, to: 2 }); // day1→2 anim → auto

      // -------- DAY 2 --------
      addRTC(2, "morning", 0); // Chore1
      addRTC(2, "evening", 1); // Chore3
      addRTC(2, "night", 2); // Chore2

      steps.push({ type: "DAY_ANIM", from: 2, to: 3 }); // day2→3 anim

      // -------- DAY 3 --------
      addRTC(3, "morning", 0);
      addRTC(3, "evening", 1);
      addRTC(3, "night", 2);

      // After last chore, branch by score
      steps.push({ type: "ENDING_BRANCH" });

      return steps;
    }

    // -------------------------------------------------------------
    _nextStep() {
      this.stepIndex++;
      if (this.stepIndex >= this.steps.length) {
        this.state = S.GAME_END;
        return;
      }

      const step = this.steps[this.stepIndex];

      switch (step.type) {
        case "IMAGE":
          this._startImage(step.img);
          break;

        case "DIALOG":
          this.dialog.start({ id: step.id, mode: step.mode || "normal" });
          this.state = S.DIALOG;
          break;

        case "REMINDER":
          this._startReminder(step.dayNum, step.dayTime);
          break;

        case "CHORE":
          this._startChore(step.index, step.dayNum);
          break;

        case "DAY_ANIM":
          this.dayAnim.play(step.from, step.to);
          this.state = S.DAY_ANIM;
          break;

        case "ENDING_BRANCH":
          this._startEndingBranch();
          break;
      }
    }

    // ---------- Step starters ----------
    _startImage(img) {
      this.currentImage = img || null;
      this.state = S.IMAGE;
    }

    _startReminder(dayNum, dayTime) {
      this.reminder = { dayNum, dayTime };
      this.state = S.REMINDER;
    }

    _startChore(index, dayNum) {
      // Map our chore index 0/1/2 back to DIFFICULTY keys chore1, chore3, chore2
      const difficultyKey = `chore${[1, 3, 2][index]}`;
      const cfg = DIFFICULTY[dayNum - 1][difficultyKey];

      this.activeChore = this.chores[index];

      // IMPORTANT: skip chore's internal countdown — we show the uniform overlay here.
      this.activeChore.start(cfg, { skipCountdown: true });

      // Start manager countdown
      this.countdownStart = millis();
      this.state = S.COUNTDOWN;
    }

    _startEndingBranch() {
      if (this.globalScore >= END_THRESHOLDS.trueEndingMin) {
        // Prelude dialog for true ending → then minigame → end card handled by EndingTrue
        this.dialog.start({ id: DLG.endTrue, mode: "normal" });
        this.state = S.DIALOG;
        this._pendingAfterDialog = () => {
          this.state = S.TRUE_ENDING;
          this.endingTrue.start({ sceneRepeatTarget: 3 });
        };
      } else if (this.globalScore >= END_THRESHOLDS.goodMin) {
        // Normal ending dialog with ending card (click to title)
        this.dialog.start({ id: DLG.endNormal, mode: "ending" });
        this.state = S.DIALOG;
        this._pendingAfterDialog = () => {
          this.state = S.GAME_END;
        };
      } else {
        // Bad ending dialog with ending card
        this.dialog.start({ id: DLG.endBad, mode: "ending" });
        this.state = S.DIALOG;
        this._pendingAfterDialog = () => {
          this.state = S.GAME_END;
        };
      }
    }

    // -------------------------------------------------------------
    update() {
      const now = millis();

      switch (this.state) {
        case S.COUNTDOWN: {
          if (now - this.countdownStart >= this.countdownMs) {
            this.state = S.PLAYING;
          }
          break;
        }
        case S.PLAYING: {
          this.activeChore.update(0);
          if (this.activeChore.isOver()) {
            this.globalScore += this.activeChore.getScoreDelta();
            this._nextStep();
          }
          break;
        }
        case S.DIALOG: {
          this.dialog.update(0);
          if (this.dialog.isOver()) {
            const cb = this._pendingAfterDialog;
            this._pendingAfterDialog = null;
            if (cb) cb();
            else this._nextStep();
          }
          break;
        }
        case S.DAY_ANIM: {
          this.dayAnim.update();
          if (this.dayAnim.isDone()) this._nextStep();
          break;
        }
        case S.TRUE_ENDING: {
          this.endingTrue.update(0);
          if (this.endingTrue.isOver()) this.state = S.GAME_END;
          break;
        }
      }
    }

    draw() {
      switch (this.state) {
        case S.IMAGE: {
          // click to advance
          if (this.currentImage)
            this.pix.image(this.currentImage, 0, 0, 64, 64);
          break;
        }
        case S.REMINDER: {
          drawDayReminder(
            this.pix,
            this.reminder.dayNum,
            this.reminder.dayTime,
            this.globalScore
          );
          break;
        }
        case S.COUNTDOWN: {
          const left = Math.ceil(
            (this.countdownMs - (millis() - this.countdownStart)) / 1000
          );
          const label = ["catch!", "scrub!", "sort!"][
            this._whichChoreIndexForHUD()
          ];
          drawCountdownShared(this.pix, 64, 64, Math.max(0, left), label);
          break;
        }
        case S.PLAYING: {
          this.activeChore.draw(this.pix);
          break;
        }
        case S.DIALOG: {
          this.dialog.draw();
          break;
        }
        case S.DAY_ANIM: {
          this.dayAnim.draw(this._dayAnimBg);
          break;
        }
        case S.TRUE_ENDING: {
          this.endingTrue.draw();
          break;
        }
        case S.GAME_END: {
          this._drawFinalSummary();
          break;
        }
      }

      // Optional global HUD (you can enable if desired)
      // drawSharedHUD(this.pix, 0, 0, this.globalScore);
    }

    _whichChoreIndexForHUD() {
      // Map active instance back to 0/1/2 for label order ["catch!","scrub!","sort!"]
      if (this.activeChore instanceof Chore1) return 0;
      if (this.activeChore instanceof Chore3) return 1;
      return 2; // Chore2
    }

    _drawFinalSummary() {
      const s = this.globalScore;
      let ending = "Bad Ending";
      if (s >= END_THRESHOLDS.trueEndingMin) ending = "TRUE END Reached";
      else if (s >= END_THRESHOLDS.goodMin) ending = "Good Ending";
      else if (s >= END_THRESHOLDS.neutralMin) ending = "Neutral Ending";

      this.pix.push();
      this.pix.fill(0, 200);
      this.pix.rect(0, 0, 64, 64);
      this.pix.fill(255);
      this.pix.textSize(12);
      this.pix.text(`END: ${ending}`, 4, 24);
      this.pix.textSize(8);
      this.pix.text(`Score: ${s}`, 4, 38);
      this.pix.text(`Press R to restart`, 4, 50);
      this.pix.pop();
    }

    // ---------------- Input routing ----------------
    mousePressed() {
      switch (this.state) {
        case S.IMAGE:
        case S.REMINDER:
          this._nextStep();
          break;
        case S.PLAYING:
          this.activeChore?.handleMousePressed?.();
          break;
        case S.DIALOG:
          this.dialog.mousePressed();
          break;
        case S.TRUE_ENDING:
          this.endingTrue.mousePressed();
          break;
      }
    }
    mouseDragged() {
      if (this.state === S.PLAYING) this.activeChore?.handleMouseDragged?.();
      else if (this.state === S.TRUE_ENDING) this.endingTrue.mouseDragged?.();
    }
    mouseReleased() {
      if (this.state === S.PLAYING) this.activeChore?.handleMouseReleased?.();
      else if (this.state === S.TRUE_ENDING) this.endingTrue.mouseReleased?.();
    }
    keyPressed(k) {
      if (this.state === S.GAME_END && (k === "r" || k === "R")) {
        this.start();
        return;
      }
      if (this.state === S.PLAYING) this.activeChore?.handleKeyPressed?.(k);
      else if (this.state === S.DIALOG) this.dialog.keyPressed(k);
      else if (this.state === S.TRUE_ENDING) this.endingTrue.keyPressed?.(k);
    }
  };
})();
