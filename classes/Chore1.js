(function () {
  // Catch the Good Food (falling items) — countdown removed, p5 state isolated
  window.Chore1 = class {
    constructor(shared) {
      this.shared = shared; // { pix, W, H }
      this._isOver = false;
      this._score = 0;
      this.usesCustomCursor = false;
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      // ---- config knobs ----
      let SPEED_RATE = cfg.fallSpeedMultiplier;
      const SPEED_PERIOD_MS = 10000;
      let BLOOD_PER_20 = cfg.bloodItemFrequency;
      let GOOD_FALL_LIMIT = cfg.maxGoodItemsPerRound;

      // ---- state ----
      const STATE_PLAYING = 1,
        STATE_END = 2;
      let state = STATE_PLAYING;
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

        // mouse-controlled paddle
        player.x = floor(
          constrain((mouseX / width) * W - player.w / 2, 0, W - player.w)
        );
        pix.image(item_pot, player.x, player.y, player.w, player.h);

        // items
        pix.image(
          good.img,
          floor(constrain(good.x, 0, W - good.w)),
          floor(good.y),
          good.w,
          good.h
        );
        pix.image(
          bad.img,
          floor(constrain(bad.x, 0, W - bad.w)),
          floor(bad.y),
          bad.w,
          bad.h
        );
      }

      function drawHUD() {
        pix.push();
        pix.fill(255);
        pix.textAlign(LEFT, TOP);
        pix.textSize(8);
        pix.text(`score: ${score}`, 17, 2);
        pix.pop();
      }

      function drawEndScreen() {
        pix.push();
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
        pix.pop();
      }

      // init spawns
      resetGood();
      resetBad();

      // per-frame step
      this._step = () => {
        if (state === STATE_PLAYING) {
          // speed progression
          const now = millis();
          const dtMs = now - lastSpeedTickMs;
          lastSpeedTickMs = now;
          updateSpeed(dtMs);

          // advance
          good.y += good.vy;
          bad.y += bad.vy;

          // bottom edge & scoring
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

          // draw
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

      // optional restart inside chore
      this.handleMousePressed = () => {
        if (state === STATE_END) {
          score = 0;
          goodFallsCount = 0;
          speedMult = 1.0;
          lastSpeedTickMs = millis();
          state = STATE_PLAYING;
          resetGood();
          resetBad();
        }
      };
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
