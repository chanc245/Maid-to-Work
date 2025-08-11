// classes/Chore3.js
(function () {
  // Scrub the clothes — round timer starts only after the dress finishes entering.
  // DIFFICULTY cfg expects:
  //   - stainCount            (int)
  //   - stainFadePerFrame     (number)
  //   - roundTimeLimitSec     (int, seconds)
  //   - bloodSmugPercent      (0..100)
  window.Chore3 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
      this.usesCustomCursor = true; // show sponge cursor
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;
      const self = this;

      // ---- knobs ----
      const STAIN_COUNT = Math.max(0, cfg.stainCount | 0);
      const STAIN_FADE_PER_FRAME = cfg.stainFadePerFrame ?? 3;
      const ROUND_TIME_LIMIT_SEC = Math.max(
        1,
        Math.floor(cfg.roundTimeLimitSec ?? 30)
      );
      const BLOOD_SMUG_PERCENT = Math.max(
        0,
        Math.min(100, cfg.bloodSmugPercent ?? 0)
      ); // 0..100

      // layout
      const dx = 10,
        dw = 45,
        dh = 45;
      const targetDy = 16;
      let dressY = 80;
      const dressSpeed = 1.5;
      let dressState = "entering"; // -> "waiting"

      // round state (timer arms only after dress hits "waiting")
      let gameEnded = false;
      let gameStartTime = 0;
      let timerStarted = false;
      let score = 0;

      // SFX: once scrubbing starts on the current dress, keep looping until it's clean or round ends
      let scrubLoopActive = false;

      // assets/layers
      let currentDressImg = random(clothesImgs);
      let dressLayer = createGraphics(W, H);
      let darkLayer = createGraphics(W, H);
      dressLayer.noSmooth();
      darkLayer.noSmooth();

      // stains; persist smug type per spot so it doesn't flicker
      const clothesBound = 20;
      let spotOffsets = [];
      function resetStains() {
        spotOffsets = [];
        for (let i = 0; i < STAIN_COUNT; i++) {
          const offsetX = random(-clothesBound / 2, clothesBound / 2);
          const offsetY = random(-clothesBound / 2, clothesBound / 2);

          // Decide the smug image ONCE for this spot
          const useBlood =
            random(0, 100) < BLOOD_SMUG_PERCENT &&
            typeof item_bloodSmug !== "undefined";
          const smugImg = useBlood ? item_bloodSmug : item_smug;

          spotOffsets.push({
            x: offsetX + dw / 2,
            y: offsetY + dh / 2,
            opacity: 100,
            smugImg,
            isBlood: useBlood,
          });
        }
      }
      resetStains();

      // success feedback ring
      let showSuccess = false;
      let successFeedbackTimer = 0;

      function resetDress() {
        dressY = 80;
        dressState = "entering";
        scrubLoopActive = false; // safety
        if (window.SFX) SFX.stop("wash_scrub"); // safety
        currentDressImg = random(clothesImgs);
        resetStains(); // new stains with their own fixed smug types
        // Timer keeps running across dresses; do NOT reset it here.
      }

      // ------------- frame step -------------
      const step = () => {
        // background
        pix.image(bg_chore3_river, 0, 0, 64, 64);

        // Arm timer only once the dress is ready to scrub
        if (!timerStarted && dressState === "waiting") {
          gameStartTime = millis();
          timerStarted = true;
        }

        // timer
        let timeLeft = ROUND_TIME_LIMIT_SEC;
        if (!gameEnded && timerStarted) {
          const elapsed = (millis() - gameStartTime) / 1000;
          timeLeft = max(0, ROUND_TIME_LIMIT_SEC - floor(elapsed));
          if (timeLeft <= 0) {
            gameEnded = true;
            if (window.SFX) SFX.stop("wash_scrub");
            scrubLoopActive = false;
          }
        }

        // dress entrance animation
        if (!gameEnded && dressState === "entering") {
          if (dressY > targetDy) {
            dressY -= dressSpeed;
            if (dressY <= targetDy) {
              dressY = targetDy;
              dressState = "waiting"; // timer arms next frame
            }
          }
        }

        if (!gameEnded && dressState !== "hidden") {
          // build stain mask
          dressLayer.clear();
          darkLayer.clear();

          dressLayer.image(currentDressImg, dx, dressY, dw, dh);

          const hoverDist = 5;
          const smugSize = 15;
          let allFaded = true;

          // Did we scrub at least one spot this frame?
          let scrubbedThisFrame = false;

          for (let spot of spotOffsets) {
            const spotX = dx + spot.x;
            const spotY = dressY + spot.y;

            const mx = (mouseX / width) * W;
            const my = (mouseY / height) * H;
            const d = dist(mx, my, spotX, spotY);

            if (d < hoverDist && dressState === "waiting" && !showSuccess) {
              const before = spot.opacity;
              spot.opacity = max(0, spot.opacity - STAIN_FADE_PER_FRAME);
              if (spot.opacity < before) scrubbedThisFrame = true;
            }
            if (spot.opacity > 0) allFaded = false;

            // draw each spot (tinted)
            darkLayer.push();
            if (spot.isBlood) {
              darkLayer.tint(120, 0, 0, spot.opacity); // dark red with alpha
            } else {
              darkLayer.tint(0, 0, 0, spot.opacity); // pure black with alpha
            }
            darkLayer.image(
              spot.smugImg,
              spotX - smugSize / 2,
              spotY - smugSize / 2,
              smugSize,
              smugSize
            );
            darkLayer.noTint();
            darkLayer.pop();
          }

          // Start loop the FIRST time scrubbing happens for this dress
          if (scrubbedThisFrame && !scrubLoopActive) {
            if (window.SFX && !SFX.isPlaying("wash_scrub")) {
              SFX.loop("wash_scrub");
            }
            scrubLoopActive = true;
          }

          // mask stains inside the dress shape
          const ctx = darkLayer.drawingContext;
          ctx.save();
          ctx.globalCompositeOperation = "destination-in";
          darkLayer.image(currentDressImg, dx, dressY, dw, dh);
          ctx.restore();

          dressLayer.image(darkLayer, 0, 0);
          pix.image(dressLayer, 0, 0);

          // success check
          if (allFaded && dressState === "waiting" && !showSuccess) {
            score++;
            showSuccess = true;
            successFeedbackTimer = millis();

            // stop scrub loop instantly on success
            if (window.SFX) {
              SFX.stop("wash_scrub");
              SFX.playOnce("wash_clean");
            }

            scrubLoopActive = false;
          }

          // success ring & advance to next dress
          if (showSuccess) {
            pix.push();
            const centerX = dx + dw / 2,
              centerY = dressY + dh / 2;
            pix.noFill();
            pix.strokeWeight(5);
            pix.stroke(0, 230, 0);
            pix.ellipse(centerX, centerY, 40, 40);
            pix.pop();

            if (millis() - successFeedbackTimer >= 500) {
              showSuccess = false;
              resetDress();
            }
          }
        }

        // HUD
        if (!gameEnded) {
          pix.push();
          pix.fill(255);
          pix.textAlign(LEFT, TOP);
          pix.textSize(8);
          pix.text(`clean:${score}`, 17, 2);
          pix.text(`time:${timeLeft}s`, 17, 10);
          pix.pop();
        }

        // sponge cursor (always on top here)
        pix.image(
          item_sponge,
          (mouseX / width) * W - 8,
          (mouseY / height) * H - 8,
          16,
          16
        );

        self._score = score;
        self._isOver = !!gameEnded;
      };

      this._step = step;
    }

    update(_) {}
    draw(_) {
      if (this._step) this._step();
    }

    isOver() {
      return this._isOver;
    }
    getScoreDelta() {
      return this._score;
    }

    handleMousePressed() {}
    handleMouseDragged() {}
    handleMouseReleased() {}
    handleKeyPressed(_) {}
  };
})();
