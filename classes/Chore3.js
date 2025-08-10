// classes/Chore3.js
(function () {
  // Scrub the clothes — no internal countdown; timer starts after dress enters
  window.Chore3 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
      this.usesCustomCursor = true;
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;
      const self = this;

      // knobs
      let STAIN_COUNT = cfg.stainCount;
      let STAIN_FADE_PER_FRAME = cfg.stainFadePerFrame;
      let ROUND_TIME_LIMIT_SEC = cfg.roundTimeLimitSec;

      // layout
      let dx = 10,
        dw = 45,
        dh = 45;
      let targetDy = 16;
      let dressY = 80;
      let dressSpeed = 1.5;
      let dressState = "entering"; // "entering" -> "waiting"

      // round state (timer arms only after dress is ready)
      let gameStarted = true;
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
      let clothesBound = 20;
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
        // timer keeps running during the round; we do NOT reset it here
      }

      // allow replay if user clicks on end screen
      this.handleMousePressed = () => {
        if (gameEnded) {
          score = 0;
          gameEnded = false;
          gameStarted = true;
          gameStartTime = 0;
          timerStarted = false; // will arm again when dress hits "waiting"
          showSuccess = false;
          resetDress();
        }
      };

      // ------------- frame step -------------
      const step = () => {
        // background
        pix.image(bg_chore3_river, 0, 0, 64, 64);

        // arm timer only once the dress is ready to scrub
        if (!timerStarted && dressState === "waiting") {
          gameStartTime = millis();
          timerStarted = true;
        }

        // timer
        let timeLeft = ROUND_TIME_LIMIT_SEC;
        if (gameStarted && !gameEnded) {
          if (timerStarted) {
            const elapsed = (millis() - gameStartTime) / 1000;
            timeLeft = max(0, ROUND_TIME_LIMIT_SEC - floor(elapsed));
            if (timeLeft <= 0) {
              gameEnded = true;
              gameStarted = false;
            }
          }
        }

        // dress entrance animation
        if (dressState === "entering") {
          if (dressY > targetDy) {
            dressY -= dressSpeed;
            if (dressY <= targetDy) {
              dressY = targetDy;
              dressState = "waiting";
              // timer will arm next frame
            }
          }
        }

        if (dressState !== "hidden" && !gameEnded) {
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

            if (
              d < hoverDist &&
              gameStarted &&
              dressState === "waiting" &&
              !showSuccess
            ) {
              spot.opacity = max(0, spot.opacity - STAIN_FADE_PER_FRAME);
            }
            if (spot.opacity > 0) allFaded = false;

            darkLayer.push();
            darkLayer.tint(0, spot.opacity);
            darkLayer.image(
              item_smug,
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
          if (
            allFaded &&
            dressState === "waiting" &&
            !gameEnded &&
            !showSuccess
          ) {
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

        if (gameEnded) {
        }

        // sponge cursor (on top)
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
