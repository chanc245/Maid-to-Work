(function () {
  // Scrub the clothes (erase stains by hovering near them)
  window.Chore3 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;
      const self = this;

      let STAIN_COUNT = cfg.stainCount; // number of stains
      let STAIN_FADE_PER_FRAME = cfg.stainFadePerFrame; // opacity drop per frame while hovered
      let ROUND_TIME_LIMIT_SEC = cfg.roundTimeLimitSec;

      // layout
      let dx = 10,
        dw = 45,
        dh = 45;
      let targetDy = 10;
      let dressY = 80;
      let dressSpeed = 1.5;
      let dressState = "entering"; // entering → waiting

      // countdown + game
      let countdownStep = 4;
      let countdownTimer = millis();
      let showCountdown = true;

      let gameStarted = false;
      let gameEnded = false;
      let gameStartTime = 0;
      let score = 0;

      // clothes
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

      // feedback ring
      let showSuccess = false;
      let successFeedbackTimer = 0;

      function resetDress() {
        dressY = 80;
        dressState = "entering";
        currentDressImg = random(clothesImgs);
        resetStains();
      }

      this.handleMousePressed = () => {
        if (gameEnded) {
          // click to restart this chore if user lingers
          score = 0;
          gameEnded = false;
          gameStarted = false;
          showSuccess = false;
          countdownStep = 4;
          countdownTimer = millis();
          showCountdown = true;
          resetDress();
        }
      };

      const step = () => {
        pix.image(bg_chore3_river, 0, 0, 64, 64);

        // COUNTDOWN
        if (showCountdown) {
          if (millis() - countdownTimer > 1000) {
            countdownStep--;
            countdownTimer = millis();
          }
          drawCountdown(countdownStep, "scrub!");
          if (countdownStep < 1) {
            showCountdown = false;
            dressState = "entering";
            gameStartTime = millis();
            gameStarted = true;
          }
          return finish(false);
        }

        // Timer
        let timeLeft = 0;
        if (gameStarted && !gameEnded) {
          const elapsed = (millis() - gameStartTime) / 1000;
          timeLeft = max(0, ROUND_TIME_LIMIT_SEC - floor(elapsed));
          if (timeLeft <= 0) {
            gameEnded = true;
            gameStarted = false;
          }
        }

        // Animate dress entering
        if (dressState === "entering") {
          if (dressY > targetDy) {
            dressY -= dressSpeed;
            if (dressY <= targetDy) {
              dressY = targetDy;
              dressState = "waiting";
            }
          }
        }

        if (dressState !== "hidden" && !gameEnded) {
          // Draw dress & stains
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

            darkLayer.tint(0, spot.opacity);
            darkLayer.image(
              item_smug,
              spotX - smugSize / 2,
              spotY - smugSize / 2,
              smugSize,
              smugSize
            );
            darkLayer.noTint();
          }

          const ctx = darkLayer.drawingContext;
          ctx.save();
          ctx.globalCompositeOperation = "destination-in";
          darkLayer.image(currentDressImg, dx, dressY, dw, dh);
          ctx.restore();

          dressLayer.image(darkLayer, 0, 0);
          pix.image(dressLayer, 0, 0);

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

          if (showSuccess) {
            const centerX = dx + dw / 2,
              centerY = dressY + dh / 2;
            pix.push();
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
        if (!gameEnded && !showCountdown) drawHUD(score, timeLeft);

        if (gameEnded) {
          pix.fill(0, 200);
          pix.rect(0, 0, W, H);
          pix.fill(255);
          pix.textAlign(LEFT, CENTER);
          pix.textSize(16);
          pix.text("END", 0, H / 2 - 10);
          pix.textSize(8);
          pix.text(`Score: ${score}`, 0, H / 2 + 4);
          pix.text("Click to play again", 0, H / 2 + 18);
          pix.textAlign(LEFT, TOP);
          pix.textSize(8);
        }

        // Sponge cursor
        pix.image(
          item_sponge,
          (mouseX / width) * W - 8,
          (mouseY / height) * H - 8,
          16,
          16
        );

        return finish(gameEnded);

        function drawCountdown(step, word) {
          pix.fill(0, 180);
          pix.rect(0, 0, W, H);
          pix.fill(255);
          pix.textAlign(CENTER, CENTER);
          if (step === 4) {
            pix.textSize(16);
            pix.text(word, W / 2, H / 2);
          } else {
            pix.textSize(32);
            pix.text(`${step}`, W / 2, H / 2);
          }
          pix.textAlign(LEFT, TOP);
          pix.textSize(8);
        }
        function drawHUD(score, timeLeft) {
          pix.fill(255);
          pix.textAlign(LEFT, TOP);
          pix.textSize(8);
          pix.text(`Score: ${score}`, 2, 2);
          pix.text(`Time: ${timeLeft}s`, 2, 10);
        }
        function finish(over) {
          self._score = score;
          self._isOver = !!over;
        }
      };

      this._step = step;
      this._getScore = () => score;
      this._isOverFlag = () => gameEnded;
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
