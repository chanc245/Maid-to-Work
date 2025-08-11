// classes/GameManager.js
(function () {
  const DAYS = 3;

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

  // Dialog IDs (must match scripts/dialogScripts.js)
  const DLG = {
    intro: "dia_Intro",
    endNormal: "dia_endNormal",
    endBad: "dia_endBad",
    endTrue1: "dia_endTrue1", // first dialog
    endTrue2: "dia_endTrue2", // final dialog after minigame
  };

  // Local helper: countdown overlay
  function _drawCountdownOverlay(pix, W, H, step, word) {
    pix.push();
    pix.noStroke();
    pix.fill(0, 180);
    pix.rect(0, 0, W, H);

    pix.fill(255, 200);
    pix.textAlign(CENTER, CENTER);
    if (step >= 4) {
      pix.textSize(16);
      pix.text(word, W / 2, H / 2);
    } else {
      pix.textSize(32);
      pix.text(`${Math.max(0, step)}`, W / 2, H / 2);
    }
    pix.pop();
  }

  // Pick ending using global thresholds (defined in scripts/aDifficulty_table.js)
  // Expected shape:
  // const ENDING_SCORE_THRESHOLDS = { trueMin: 100, normalMin: 50 }
  // Read thresholds from global, accept both new (trueEnd/normalEnd)
  // and legacy (trueMin/normalMin) keys.
  function _getThresholds() {
    const raw = (typeof ENDING_SCORE_THRESHOLDS !== "undefined" &&
      ENDING_SCORE_THRESHOLDS) || { trueEnd: 100, normalEnd: 50 };

    if (typeof raw.trueEnd === "number" || typeof raw.normalEnd === "number") {
      return { trueEnd: raw.trueEnd ?? 100, normalEnd: raw.normalEnd ?? 50 };
    }
    // legacy fallback
    return { trueEnd: raw.trueMin ?? 100, normalEnd: raw.normalMin ?? 50 };
  }

  function _pickEndingType(score) {
    const { trueEnd, normalEnd } = _getThresholds();

    // Inclusive boundaries:
    // >= trueEnd => true
    // >= normalEnd and < trueEnd => normal
    // else => bad
    if (score >= trueEnd) return "true";
    if (score >= normalEnd && score < trueEnd) return "normal";
    return "bad";
  }

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
        new Chore1({ pix: this.pix, W: this.W, H: this.H }), // 0
        new Chore3({ pix: this.pix, W: this.W, H: this.H }), // 1
        new Chore2({ pix: this.pix, W: this.W, H: this.H }), // 2
      ];
      this.activeChore = null;

      // UI helpers
      this.dayAnim = new DayChangeAnim(this.pix);

      // Step queue
      this.steps = [];
      this.stepIndex = -1;

      // State
      this.state = S.IDLE;

      // Uniform pre-chore countdown
      this.countdownMs = 4000;
      this.countdownStart = 0;

      // image / reminder scratch
      this.currentImage = null;
      this.reminder = null;

      // post-dialog callback
      this._pendingAfterDialog = null;

      // after true minigame we want dia_endTrue2 and NO summary overlay
      this._pendingTrueDialog2 = false;
      this._suppressFinalSummary = false;

      // optional bg frame for day anim (if loaded)
      this._dayAnimBg = typeof bg_frame !== "undefined" ? bg_frame : null;
    }

    // Preloads for subsystems
    static preload() {
      Dialog.preload();
      // your renamed path for the true ending scene
      EndingTrue.preload("assets/chore4_endingTrue");
    }

    // Build the entire game flow and start
    start() {
      this.globalScore = 0;
      this._suppressFinalSummary = false; // reset per run
      this._pendingTrueDialog2 = false;

      this.steps = this._buildFlow();
      this.stepIndex = -1;
      this._nextStep();
    }

    sceneHasCustomCursor() {
      if (this.state === S.PLAYING) {
        return !!this.activeChore?.usesCustomCursor;
      }
      if (this.state === S.TRUE_ENDING) {
        return !!this.endingTrue?.usesCustomCursor;
      }
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

      steps.push({ type: "DAY_ANIM", from: 1, to: 2 }); // day1→2

      // -------- DAY 2 --------
      addRTC(2, "morning", 0); // Chore1
      addRTC(2, "evening", 1); // Chore3
      addRTC(2, "night", 2); // Chore2

      steps.push({ type: "DAY_ANIM", from: 2, to: 3 }); // day2→3

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
      const finalScore = this.globalScore;
      const endingType = _pickEndingType(finalScore);

      if (endingType === "true") {
        // hide summary after the true path
        this._suppressFinalSummary = true;

        // 1) dia_endTrue1 → mini-game → dia_endTrue2
        this.dialog.start({ id: DLG.endTrue1, mode: "normal" });
        this.state = S.DIALOG;

        this._pendingAfterDialog = () => {
          // after dialog, play the true-ending minigame
          this._pendingTrueDialog2 = true;
          this.state = S.TRUE_ENDING;
          this.endingTrue.start({ sceneRepeatTarget: 3 });
        };
      } else if (endingType === "normal") {
        this.dialog.start({ id: DLG.endNormal, mode: "ending" });
        this.state = S.DIALOG;
        this._pendingAfterDialog = () => {
          this.state = S.GAME_END;
        };
      } else {
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
          if (this.endingTrue.isOver()) {
            if (this._pendingTrueDialog2) {
              // 3) dia_endTrue2 right after the minigame
              this._pendingTrueDialog2 = false;
              this.dialog.start({ id: DLG.endTrue2, mode: "normal" });
              this.state = S.DIALOG;
              this._pendingAfterDialog = () => {
                this.state = S.GAME_END;
              };
            } else {
              // safety fallback
              this.state = S.GAME_END;
            }
          }
          break;
        }
      }
    }

    draw() {
      switch (this.state) {
        case S.IMAGE: {
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
          console.log(
            `Day:${this.reminder.dayNum}; TotalScore:${this.globalScore}`
          );
          break;
        }
        case S.COUNTDOWN: {
          const left = Math.ceil(
            (this.countdownMs - (millis() - this.countdownStart)) / 1000
          );
          const stepCount = Math.max(0, left);
          const label = ["catch!", "scrub!", "sort!"][
            this._whichChoreIndexForHUD()
          ];
          _drawCountdownOverlay(this.pix, this.W, this.H, stepCount, label);
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
          if (!this._suppressFinalSummary) {
            this._drawFinalSummary();
          }
          break;
        }
      }

      // Always draw the UI frame last, on top
      if (typeof bg_frame !== "undefined" && bg_frame) {
        this.pix.image(bg_frame, 0, 0, 64, 64);
      }
    }

    _whichChoreIndexForHUD() {
      if (this.activeChore instanceof Chore1) return 0;
      if (this.activeChore instanceof Chore3) return 1;
      return 2; // Chore2
    }

    _drawFinalSummary() {
      console.log(
        `Day:${this.reminder.dayNum}; TotalScore:${this.globalScore}`
      );
      const s = this.globalScore;
      const { trueEnd, normalEnd } = _getThresholds();

      let endingLabel;
      if (s >= trueEnd) endingLabel = "TRUE END Reached";
      else if (s >= normalEnd) endingLabel = "Good Ending";
      else endingLabel = "Bad Ending";

      this.pix.push();
      this.pix.fill(0, 200);
      this.pix.rect(0, 0, 64, 64);
      this.pix.fill(255);
      this.pix.textSize(12);
      this.pix.text(`END: ${endingLabel}`, 4, 24);
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
