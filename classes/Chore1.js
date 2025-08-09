(function () {
  // Catch the Good Food (falling items)
  window.Chore1 = class {
    constructor(shared) {
      this.shared = shared; // { pix, W, H }
      this._isOver = false;
      this._score = 0;
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      // ---- config knobs (friendly names already mapped) ----
      let SPEED_RATE = cfg.fallSpeedMultiplier; // exponential factor per SPEED_PERIOD_MS
      const SPEED_PERIOD_MS = 10000; // unchanged
      let BLOOD_PER_20 = cfg.bloodItemFrequency; // expected blood per 20 bad spawns
      let GOOD_FALL_LIMIT = cfg.maxGoodItemsPerRound;

      // ---- state ----
      const STATE_COUNTDOWN = 0,
        STATE_PLAYING = 1,
        STATE_END = 2;
      let state = STATE_COUNTDOWN;
      let score = 0;
      let goodFallsCount = 0;

      // player & items
      let player = { w: 20, h: 20, x: 17, y: H - 20, speed: 2.5 };

      let good = {
        x: 24,
        y: -16,
        w: 16,
        h: 16,
        baseVy: 0.3,
        vy: 0.6,
        img: null,
      };
      let bad = { x: 8, y: -16, w: 16, h: 16, baseVy: 0.4, vy: 0.7, img: null };

      // timers
      const COUNTDOWN_SECS = 4;
      let countdownStartMs = millis();
      let speedMult = 1.0;
      let lastSpeedTickMs = millis();

      // helpers
      const randInt = (min, maxExclusive) => floor(random(min, maxExclusive));
      const aabbHit = (a, b) =>
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;

      function pickNonOverlappingX(w, otherX) {
        let x,
          tries = 0;
        do {
          x = randInt(0, W - w);
          tries++;
          if (tries > 50) {
            x = otherX < (W - w) / 2 ? W - w : 0;
            break;
          }
        } while (abs(x - otherX) < w);
        return x;
      }

      function chooseBadSprite() {
        const pBlood = constrain(BLOOD_PER_20 / 20, 0, 1);
        if (random() < pBlood) return random(c1BloodImgs);
        return random(c1BadImgs);
      }

      function resetGood() {
        good.x = pickNonOverlappingX(good.w, bad.x);
        good.y = -good.h;
        good.img = random(c1GoodImgs);
        good.vy = good.baseVy * speedMult;
      }

      function resetBad() {
        bad.x = pickNonOverlappingX(bad.w, good.x);
        bad.y = -bad.h;
        bad.img = chooseBadSprite();
        bad.vy = bad.baseVy * speedMult;
      }

      function updateSpeed(dtMs) {
        if (SPEED_RATE === 1.0) return;
        const factor = Math.pow(SPEED_RATE, dtMs / SPEED_PERIOD_MS);
        speedMult *= factor;
        good.vy = good.baseVy * speedMult;
        bad.vy = bad.baseVy * speedMult;
      }

      function drawWorld() {
        pix.image(bg_chore1, 0, 0, 64, 64);
        // input (mouse-controlled paddle)
        const mx = constrain((mouseX / (W * 5)) * W * 5, 0, W * 5); // robust if SCALE changes
        player.x = floor(
          constrain((mouseX / width) * W - player.w / 2, 0, W - player.w)
        );
        pix.image(item_pot, player.x, player.y, player.w, player.h);

        // items
        const gx = floor(constrain(good.x, 0, W - good.w));
        const bx = floor(constrain(bad.x, 0, W - bad.w));
        pix.image(good.img, gx, floor(good.y), good.w, good.h);
        pix.image(bad.img, bx, floor(bad.y), bad.w, bad.h);
      }

      function drawHUD() {
        pix.push();
        pix.fill(255);
        pix.textAlign(RIGHT, TOP);
        pix.textSize(8);
        
        pix.text(`${score}`, 0, 2);
        
        pix.pop();
      }

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

      function drawEndScreen() {
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

      // init
      resetGood();
      resetBad();

      // per-frame step (called by manager.draw)
      this._step = () => {
        // background
        pix.image(bg_chore1, 0, 0, 64, 64);

        if (state === STATE_COUNTDOWN) {
          drawWorld();
          drawHUD();
          const remaining = ceil(
            COUNTDOWN_SECS - (millis() - countdownStartMs) / 1000
          );
          if (remaining > 0) {
            drawCountdown(remaining, "catch!");
          } else {
            lastSpeedTickMs = millis();
            state = STATE_PLAYING;
          }
          this._score = score;
          this._isOver = false;
          return;
        }

        if (state === STATE_PLAYING) {
          const now = millis();
          const dtMs = now - lastSpeedTickMs;
          lastSpeedTickMs = now;
          updateSpeed(dtMs);

          // advance
          good.y += good.vy;
          bad.y += bad.vy;

          // bottom
          if (good.y >= H - good.h) {
            good.y = H - good.h;
            score -= 1;
            goodFallsCount++;
            if (goodFallsCount >= GOOD_FALL_LIMIT) state = STATE_END;
            else resetGood();
          }
          if (bad.y >= H - bad.h) {
            bad.y = H - bad.h;
            resetBad();
          }

          // collisions
          if (aabbHit(good, player)) {
            score += 1;
            goodFallsCount++;
            if (goodFallsCount >= GOOD_FALL_LIMIT) state = STATE_END;
            else resetGood();
          }
          if (aabbHit(bad, player)) {
            score -= 1;
            resetBad();
          }

          drawWorld();
          drawHUD();
          this._score = score;
          this._isOver = false;
          return;
        }

        if (state === STATE_END) {
          drawWorld();
          drawEndScreen();
          this._score = score;
          this._isOver = true;
        }
      };

      // clicks to restart inside chore (manager advances anyway, but keep parity)
      this.handleMousePressed = () => {
        if (state === STATE_END) {
          // reset for replay, though manager will switch chore/day
          score = 0;
          goodFallsCount = 0;
          speedMult = 1.0;
          countdownStartMs = millis();
          state = STATE_COUNTDOWN;
          resetGood();
          resetBad();
        }
      };
      this._getScore = () => score;
      this._getState = () => state;
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
