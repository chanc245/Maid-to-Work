// classes/GameManager.js
(function () {
  const DAYS = 3;

  // ---------- States ----------
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

  // ---------- Dialog IDs ----------
  const DLG = {
    intro: "dia_Intro",
    endNormal: "dia_endNormal",
    endBad: "dia_endBad",
    endTrue1: "dia_endTrue1",
    endTrue2: "dia_endTrue2",
  };

  // ---------- Helpers ----------
  function _drawCountdownOverlay(pix, W, H, step, word) {
    pix.push();
    pix.noStroke();
    pix.fill(0, 0, 0, 100);
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

  // thresholds from aDifficulty_table.js
  function _getThresholds() {
    const raw = (typeof ENDING_SCORE_THRESHOLDS !== "undefined" &&
      ENDING_SCORE_THRESHOLDS) || { trueEnd: 100, normalEnd: 50 };

    if (typeof raw.trueEnd === "number" || typeof raw.normalEnd === "number") {
      return { trueEnd: raw.trueEnd ?? 100, normalEnd: raw.normalEnd ?? 50 };
    }
    return { trueEnd: raw.trueMin ?? 100, normalEnd: raw.normalMin ?? 50 };
  }
  function _pickEndingType(score) {
    const { trueEnd, normalEnd } = _getThresholds();
    if (score >= trueEnd) return "true";
    if (score >= normalEnd && score < trueEnd) return "normal";
    return "bad";
  }

  // Arrow blink timing
  function _arrowBlinkShow(anchorMs) {
    const blinkMs =
      (typeof DIALOG_ARROW_POS !== "undefined" &&
        (DIALOG_ARROW_POS.blinkMs || DIALOG_ARROW_POS.arrowBlinkMs)) ||
      550;
    const t = millis() - anchorMs;
    return Math.floor(t / blinkMs) % 2 === 0;
  }
  function _drawAdvanceArrow(pix) {
    const P = (typeof DIALOG_ARROW_POS !== "undefined" && DIALOG_ARROW_POS) || {
      textX: 4,
      textY: 45,
      textW: 58,
      textH: 16,
      char: ">",
      color: [255, 255, 255],
    };
    pix.push();
    const c = P.color || [255, 255, 255];
    pix.fill(c[0] ?? 255, c[1] ?? 255, c[2] ?? 255);
    pix.textAlign(RIGHT, BOTTOM);
    pix.text(P.char || ">", P.textX + P.textW - 2, P.textY + P.textH - 1);
    pix.textAlign(LEFT, TOP);
    pix.pop();
  }

  function _displayDayFromInternalDay(n) {
    // Internal day: 1,2,3 -> display: 3,2,1
    return Math.max(1, DAYS - n + 1);
  }

  window.GameManager = class {
    constructor(shared) {
      this.pix = shared.pix;
      this.W = shared.W;
      this.H = shared.H;
      this.SCALE = shared.SCALE;
      this.pixelFont = shared.font;

      this.globalScore = 0;

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

      this.chores = [
        new Chore1({ pix: this.pix, W: this.W, H: this.H }),
        new Chore3({ pix: this.pix, W: this.W, H: this.H }),
        new Chore2({ pix: this.pix, W: this.W, H: this.H }),
      ];
      this.activeChore = null;

      // inline day animation
      this._dayAnim = {
        active: false,
        phase: "idle", // "ready" -> "slide" -> "wait"
        holdTimer: 0,
        cfg: {
          y: 1,
          xTarget: 15,
          size: 24,
          vx: 1.5,
          offLeft: -40,
          offRight: 84,
        },
        prev: { x: 15, text: "D-3" },
        next: { x: -40, text: "D-2" },
        arrowBlinkAnchor: millis(),
        fromDay: 1,
        toDay: 2,
      };

      this.dayAnim = null; // legacy no-op

      this.steps = [];
      this.stepIndex = -1;

      this.state = S.IDLE;

      this.countdownMs = 4000;
      this.countdownStart = 0;

      this.currentImage = null;
      this.reminder = null;

      this._pendingAfterDialog = null;

      this._pendingTrueDialog2 = false;
      this._suppressFinalSummary = false;

      this._arrowBlinkAnchor = millis();
      this._reminderArrowBlinkAnchor = millis();

      // TRUE_ENDING intro card gating (ui_basement_ex)
      this.basementIntroShown = true; // start hidden by default
      this._basementIntroBlinkAnchor = 0; // own blink timer

      this._dayAnimBg = typeof bg_frame !== "undefined" ? bg_frame : null;
    }

    static preload() {
      Dialog.preload();
      EndingTrue.preload("assets/chore4_endingTrue");
    }

    start() {
      this.globalScore = 0;
      this._suppressFinalSummary = false;
      this._pendingTrueDialog2 = false;

      this.steps = this._buildFlow();
      this.stepIndex = -1;
      this._nextStep();
    }

    sceneHasCustomCursor() {
      if (this.state === S.PLAYING) return !!this.activeChore?.usesCustomCursor;
      if (this.state === S.TRUE_ENDING)
        return !!this.endingTrue?.usesCustomCursor;
      return false;
    }

    // -------- Flow --------
    _buildFlow() {
      const steps = [];
      const addRTC = (dayNum, orderInDay, choreIndex, tutorialImg = null) => {
        steps.push({ type: "REMINDER", dayNum, orderInDay });
        if (tutorialImg) steps.push({ type: "IMAGE", img: tutorialImg });
        steps.push({ type: "CHORE", index: choreIndex, dayNum });
      };

      // Day 1
      steps.push({
        type: "IMAGE",
        img: typeof cg_title !== "undefined" ? cg_title : null,
      });
      steps.push({ type: "DIALOG", id: DLG.intro, mode: "normal" });

      addRTC(
        1,
        1,
        0,
        typeof ui_chore1_ex !== "undefined" ? ui_chore1_ex : null
      );
      addRTC(
        1,
        2,
        1,
        typeof ui_chore3_ex !== "undefined" ? ui_chore3_ex : null
      );
      addRTC(
        1,
        3,
        2,
        typeof ui_chore2_ex !== "undefined" ? ui_chore2_ex : null
      );

      steps.push({ type: "DAY_ANIM", from: 1, to: 2 });

      // Day 2
      addRTC(2, 1, 0);
      addRTC(2, 2, 1);
      addRTC(2, 3, 2);

      steps.push({ type: "DAY_ANIM", from: 2, to: 3 });

      // Day 3
      addRTC(3, 1, 0);
      addRTC(3, 2, 1);
      addRTC(3, 3, 2);

      steps.push({ type: "ENDING_BRANCH" });
      return steps;
    }

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
          this._startReminder(step.dayNum, step.orderInDay);
          break;
        case "CHORE":
          this._startChore(step.index, step.dayNum);
          break;
        case "DAY_ANIM":
          this._startDayAnim(step.from, step.to);
          break;
        case "ENDING_BRANCH":
          this._startEndingBranch();
          break;
      }
    }

    // -------- Starters --------
    _startImage(img) {
      this.currentImage = img || null;
      this._arrowBlinkAnchor = millis();
      this.state = S.IMAGE;
    }

    _startReminder(dayNum, orderInDay) {
      this.reminder = { dayNum, orderInDay };
      this._reminderArrowBlinkAnchor = millis();
      this.state = S.REMINDER;
      if (window.SFX) SFX.playOnce("ui_nextDay");
    }

    _startChore(index, dayNum) {
      const difficultyKey = `chore${[1, 3, 2][index]}`;
      const cfg = DIFFICULTY[dayNum - 1][difficultyKey];

      this.activeChore = this.chores[index];
      this.activeChore.start(cfg, { skipCountdown: true });

      this.countdownStart = millis();
      this._lastCountdownInt = null;
      this.state = S.COUNTDOWN;
    }

    _startDayAnim(fromDay, toDay) {
      const prevLabel = `D-${_displayDayFromInternalDay(fromDay)}`;
      const nextLabel = `D-${_displayDayFromInternalDay(toDay)}`;

      const A = this._dayAnim;
      A.fromDay = fromDay;
      A.toDay = toDay;

      A.prev.text = prevLabel;
      A.prev.x = A.cfg.xTarget;

      A.next.text = nextLabel;
      A.next.x = A.cfg.offLeft;

      A.active = true;
      A.phase = "ready"; // wait for click to start slide
      A.holdTimer = 0;
      A.arrowBlinkAnchor = millis();

      this.state = S.DAY_ANIM;

      if (window.SFX) SFX.playOnce("ui_sleep");
    }

    _startEndingBranch() {
      const finalScore = this.globalScore;
      const endingType = _pickEndingType(finalScore);

      if (endingType === "true") {
        // show summary after true path (so don't suppress)
        this._suppressFinalSummary = false;

        // 1) dia_endTrue1, then show basement intro card, then mini-game, then dia_endTrue2
        this.dialog.start({ id: DLG.endTrue1, mode: "normal" });
        this.state = S.DIALOG;

        this._pendingAfterDialog = () => {
          this._pendingTrueDialog2 = true;

          // show intro card first — wait for user click in TRUE_ENDING state
          this.basementIntroShown = false;
          this._basementIntroBlinkAnchor = millis();

          this.state = S.TRUE_ENDING;
          // DO NOT start endingTrue yet; start when intro is dismissed
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

    // -------- Update --------
    update() {
      const now = millis();

      switch (this.state) {
        case S.COUNTDOWN: {
          // Play tick when displayed number changes (3,2,1)
          const leftInt = Math.ceil(
            (this.countdownMs - (now - this.countdownStart)) / 1000
          );
          if (leftInt !== this._lastCountdownInt) {
            if (leftInt > 0 && leftInt <= 3 && window.SFX) {
              SFX.playOnce("ui_countDown");
            }
            this._lastCountdownInt = leftInt;
          }
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
          this._updateDayAnim();
          break;
        }
        case S.TRUE_ENDING: {
          // Wait on basement intro card; no mini-game updates yet.
          if (!this.basementIntroShown) break;

          // Mini-game running
          this.endingTrue.update(0);
          if (this.endingTrue.isOver()) {
            if (this._pendingTrueDialog2) {
              this._pendingTrueDialog2 = false;
              this.dialog.start({ id: DLG.endTrue2, mode: "ending" });
              this.state = S.DIALOG;
              this._pendingAfterDialog = () => {
                // show final summary after the true flow finishes
                this._suppressFinalSummary = false;
                this.state = S.GAME_END;
              };
            } else {
              this.state = S.GAME_END;
            }
          }
          break;
        }
      }
    }

    _updateDayAnim() {
      const A = this._dayAnim;
      if (!A.active) return;

      if (A.phase === "slide") {
        A.prev.x += A.cfg.vx;
        A.next.x += A.cfg.vx;
        if (A.next.x >= A.cfg.xTarget) A.next.x = A.cfg.xTarget;

        const prevGone = A.prev.x >= A.cfg.offRight;
        const nextAtTarget = A.next.x === A.cfg.xTarget;
        if (prevGone && nextAtTarget) {
          A.phase = "wait";
          A.holdTimer = 0;
          A.arrowBlinkAnchor = millis();
        }
      }
      // "ready" and "wait" are handled by click in mousePressed()
    }

    // -------- Draw --------
    draw() {
      switch (this.state) {
        case S.IMAGE: {
          if (this.currentImage)
            this.pix.image(this.currentImage, 0, 0, 64, 64);
          if (_arrowBlinkShow(this._arrowBlinkAnchor))
            _drawAdvanceArrow(this.pix);
          break;
        }
        case S.REMINDER: {
          const order = this.reminder.orderInDay; // 1..3
          const displayDay = Math.max(1, DAYS - this.reminder.dayNum + 1);
          let dayImg = null,
            timeLabel = "morning",
            choreNum = 1;
          if (order === 1) {
            dayImg =
              typeof ui_dayReminder_day !== "undefined"
                ? ui_dayReminder_day
                : null;
            timeLabel = "morning";
            choreNum = 1;
          } else if (order === 2) {
            dayImg =
              typeof ui_dayReminder_evening !== "undefined"
                ? ui_dayReminder_evening
                : null;
            timeLabel = "evening";
            choreNum = 2;
          } else {
            dayImg =
              typeof ui_dayReminder_night !== "undefined"
                ? ui_dayReminder_night
                : null;
            timeLabel = "night";
            choreNum = 3;
          }
          drawDayReminder(
            this.pix,
            dayImg,
            displayDay,
            timeLabel,
            choreNum,
            this.globalScore
          );
          if (_arrowBlinkShow(this._reminderArrowBlinkAnchor))
            _drawAdvanceArrow(this.pix);
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
          this._drawDayAnim();
          break;
        }
        case S.TRUE_ENDING: {
          if (!this.basementIntroShown) {
            // Draw the intro image
            if (typeof ui_basement_ex !== "undefined" && ui_basement_ex) {
              this.pix.image(ui_basement_ex, 0, 0, this.W, this.H);
            }
            // Blink the same advance arrow
            if (_arrowBlinkShow(this._basementIntroBlinkAnchor)) {
              _drawAdvanceArrow(this.pix);
            }
            break; // don’t draw mini-game yet
          }

          // Mini-game visuals
          this.endingTrue.draw();
          break;
        }
        case S.GAME_END: {
          if (!this._suppressFinalSummary) this._drawFinalSummary();
          break;
        }
      }

      if (typeof bg_frame !== "undefined" && bg_frame) {
        this.pix.image(bg_frame, 0, 0, 64, 64);
      }
    }

    _drawDayAnim() {
      const A = this._dayAnim;
      const p = this.pix;

      p.push();
      p.fill(0);
      p.rect(0, 0, 64, 64);
      if (typeof ui_daySwap !== "undefined" && ui_daySwap) {
        p.image(ui_daySwap, 0, 0, 64, 64);
      }

      p.fill(200);
      p.textSize(A.cfg.size);
      p.textAlign(LEFT, TOP);

      if (A.phase === "ready") {
        p.text(A.prev.text, Math.round(A.prev.x), A.cfg.y);
      } else {
        p.text(A.prev.text, Math.round(A.prev.x), A.cfg.y);
        p.text(A.next.text, Math.round(A.next.x), A.cfg.y);
      }

      // bottom score
      p.textSize(8);
      p.textAlign(LEFT, TOP);
      p.text(`TOTAL SCORE:${this.globalScore}`, 3, 54);

      // blink arrow in ready & wait
      if (
        (A.phase === "ready" || A.phase === "wait") &&
        _arrowBlinkShow(A.arrowBlinkAnchor)
      ) {
        _drawAdvanceArrow(p);
      }
      p.pop();
    }

    _whichChoreIndexForHUD() {
      if (this.activeChore instanceof Chore1) return 0;
      if (this.activeChore instanceof Chore3) return 1;
      return 2;
    }

    _drawFinalSummary() {
      const s = this.globalScore;
      const { trueEnd, normalEnd } = _getThresholds();

      let endingLabel;
      if (s >= trueEnd) endingLabel = "True";
      else if (s >= normalEnd) endingLabel = "Normal";
      else endingLabel = "Bad";

      this.pix.push();
      this.pix.fill(0);
      this.pix.rect(0, 0, 64, 64);
      this.pix.fill(255);
      this.pix.textSize(16);
      this.pix.text(`${endingLabel}`, 4, 13);
      this.pix.text(`Ending`, 4, 25);
      this.pix.textSize(8);
      this.pix.textAlign(LEFT, TOP);
      this.pix.text(`TOTAL SCORE: ${s}`, 4, 45);
      this.pix.text(`[R] RESTART`, 4, 53);
      this.pix.pop();
    }

    // --- DEBUG: force full true-ending flow (dia_endTrue1 → EndingTrue → dia_endTrue2)
    _startTrueEndingSequenceDebug() {
      // keep summary visible at the end of true path
      this._suppressFinalSummary = false;

      // clear any pending transitions
      this._pendingAfterDialog = null;
      this._pendingTrueDialog2 = false;

      // 1) first true-ending dialog
      this.dialog.start({ id: "dia_endTrue1", mode: "normal" });
      this.state = S.DIALOG;

      // after dialog, run intro card then minigame, then dia_endTrue2
      this._pendingAfterDialog = () => {
        this._pendingTrueDialog2 = true;
        this.basementIntroShown = false;
        this._basementIntroBlinkAnchor = millis();
        this.state = S.TRUE_ENDING;
      };
    }

    // -------- Inputs --------
    mousePressed() {
      if (window.SFX) SFX.startBG();
      switch (this.state) {
        case S.IMAGE:
        case S.REMINDER:
          if (window.SFX) SFX.playOnce("text_advance");
          this._nextStep();
          break;
        case S.PLAYING:
          this.activeChore?.handleMousePressed?.();
          break;
        case S.DIALOG:
          if (window.SFX) SFX.playOnce("text_advance");
          this.dialog.mousePressed();
          break;
        case S.DAY_ANIM: {
          const A = this._dayAnim;
          if (A.phase === "ready") {
            A.phase = "slide";
          } else if (A.phase === "wait") {
            if (window.SFX) SFX.playOnce("text_advance");
            A.active = false;
            A.phase = "idle";
            this._nextStep();
          }
          break;
        }
        case S.TRUE_ENDING: {
          if (!this.basementIntroShown) {
            this.basementIntroShown = true;
            if (window.SFX) SFX.playOnce("text_advance");
            // now start the mini-game
            this.endingTrue.start({ sceneRepeatTarget: 3 });
          } else {
            this.endingTrue.mousePressed();
          }
          break;
        }
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
      else if (this.state === S.DAY_ANIM && this._dayAnim.phase === "wait") {
        if (k === " " || k === "Enter") this.mousePressed();
      }

      // DEBUG: jump to endcards
      if (k === "1") {
        console.log("[DEBUG] Jumping to Bad Ending");
        this.startDialog("dia_endBad", "ending", true);
        return;
      }
      if (k === "2") {
        console.log("[DEBUG] Jumping to Normal Ending");
        this.startDialog("dia_endNormal", "ending", true);
        return;
      }
      if (k === "3") {
        console.log(
          "[DEBUG] Running full True Ending flow (dia_endTrue1 -> intro -> mini-game -> dia_endTrue2)"
        );
        this._startTrueEndingSequenceDebug();
        return;
      }
    }

    // helper for debug & general use
    startDialog(dialogId, mode = "normal", endAfterIfEnding = false) {
      this.dialog.start({ id: dialogId, mode });
      this.state = S.DIALOG;
      if (mode === "ending" && endAfterIfEnding) {
        this._pendingAfterDialog = () => {
          this._suppressFinalSummary = false;
          this.state = S.GAME_END;
        };
      }
    }
  };
})();
