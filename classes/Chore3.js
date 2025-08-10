// classes/Chore3.js
(function () {
  // Scrub the clothes — no internal countdown; the round timer starts
  // only after the dress finishes entering and is ready to scrub.
  //
  // Config (from DIFFICULTY):
  //   stainCount, stainFadePerFrame, roundTimeLimitSec, bloodSmugPercent

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
      );

      // layout
      const dx = 10,
        dw = 45,
        dh = 45;
      const targetDy = 16;
      let dressY = 80;
      const dressSpeed = 1.5;
      let dressState = "entering"; // "entering" -> "waiting"

      // round state (timer arms only after dress hits "waiting")
      let gameEnded = false;
      let gameStartTime = 0;
      let timerStarted = false;
      let score = 0;

      // assets/layers
      let currentDressImg = random(clothesImgs);
      let dressLayer = createGraphics(W, H);
      let darkLayer = createGraphics(W, H);
      dressLayer.noSmooth();
      darkLayer.noSmooth();

      // stains
      const clothesBound = 20;
      let spotOffsets = [];
      function resetStains() {
        spotOffsets = [];
        for (let i = 0; i < STAIN_COUNT; i++) {
          const offsetX = random(-clothesBound / 2, clothesBound / 2);
          const offsetY = random(-clothesBound / 2, clothesBound / 2);
          spotOffsets.push({
            x: offsetX + dw / 2,
            y: offsetY + dh / 2,
            opacity: 100,
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
        currentDressImg = random(clothesImgs);
        resetStains();
        // Timer keeps running across dresses; we do NOT reset it here.
      }

      // optional replay if you ever use it
      this.handleMousePressed = () => {
        // (no end overlay right now, so nothing here)
      };

      // ------------- frame step -------------
      const step = () => {
        // background
        pix.push();
        pix.image(bg_chore3_river, 0, 0, 64, 64);
        pix.pop();

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

          for (let spot of spotOffsets) {
            const spotX = dx + spot.x;
            const spotY = dressY + spot.y;

            const mx = (mouseX / width) * W;
            const my = (mouseY / height) * H;
            const d = dist(mx, my, spotX, spotY);

            if (d < hoverDist && dressState === "waiting" && !showSuccess) {
              spot.opacity = max(0, spot.opacity - STAIN_FADE_PER_FRAME);
            }
            if (spot.opacity > 0) allFaded = false;

            // choose smug image by percent (blood vs normal)
            const useBlood = random(0, 100) < BLOOD_SMUG_PERCENT;
            const smugImg =
              useBlood && typeof item_bloodSmug !== "undefined"
                ? item_bloodSmug
                : item_smug;

            darkLayer.push();
            darkLayer.tint(0, spot.opacity);
            darkLayer.image(
              smugImg,
              spotX - smugSize / 2,
              spotY - smugSize / 2,
              smugSize,
              smugSize
            );
            darkLayer.noTint();
            darkLayer.pop();
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
