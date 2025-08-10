// classes/Chore2.js
(function () {
  // Paper sorting — countdown comes from GameManager
  // Zones:
  //   BAD  drop:  center in [0..26] x [0..26]
  //   GOOD drop:  center in [49..64] x [0..64]
  //
  // Config (from DIFFICULTY):
  //   goodSpawnPercent, badSpawnPercent, badBloodPercent,
  //   goatAnimationDurationMs, roundTimeLimitSec

  window.Chore2 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;

      // we want global ui_mouse (no custom cursor here)
      this.usesCustomCursor = false;

      // DOM GIF for goat chew animation
      this._goatGifEl = null;
      this._goatGifPath = "assets/chore2/goat_gif.gif";
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      // ---- knobs (unified naming) ----
      const GOOD_RATE = Math.max(0, cfg.goodSpawnPercent | 0); // %
      const BAD_RATE = Math.max(0, cfg.badSpawnPercent | 0); // %
      const BLOOD_RATE = Math.max(0, Math.min(100, cfg.badBloodPercent ?? 0)); // % of BAD that are blood
      const GOAT_ANIM_MS = cfg.goatAnimationDurationMs | 0;
      const ROUND_TIME_LIMIT_SEC = Math.max(
        1,
        Math.floor(cfg.roundTimeLimitSec ?? 30)
      );

      // ---- state ----
      let score = 0;
      let state = "playing";

      // Timer (arm on first frame so global countdown doesn't eat the time)
      let timerArmed = false;
      let gameStartMs = 0;

      // Goat state: 'static' | 'open' | 'anim'
      let goatState = "static";
      let goatAnimStart = 0;

      // draggable item
      let item = null; // {x,y,w,h, kind:'good'|'bad'|'blood', img, dragging, offsetX, offsetY}

      // Make sure the DOM GIF exists (overlay aligned with canvas)
      this._ensureGoatGifEl();

      // prevent consecutive duplicate exact image (only for paper sprites)
      let lastImg = null;

      function spawnItem() {
        const total = Math.max(1, GOOD_RATE + BAD_RATE);
        const roll = random(0, total);

        // decide type bucket first
        let kind;
        if (roll < GOOD_RATE) {
          kind = "good";
        } else {
          // bad bucket: split into 'blood' vs 'bad' by BLOOD_RATE%
          kind = random(0, 100) < BLOOD_RATE ? "blood" : "bad";
        }

        // pick image set by kind
        let imgArray =
          kind === "good"
            ? c2GoodImgs
            : kind === "blood"
            ? c2BadBloodImgs
            : c2BadImgs;

        // pick a different exact image than lastImg
        let img;
        if (imgArray && imgArray.length > 0) {
          if (imgArray.length > 1) {
            do {
              img = random(imgArray);
            } while (img === lastImg);
          } else {
            img = imgArray[0];
          }
        } else {
          img = null;
        }

        item = {
          x: 18,
          y: 26,
          w: 30,
          h: 36,
          kind,
          img,
          dragging: false,
          offsetX: 0,
          offsetY: 0,
        };
        lastImg = img;
      }
      spawnItem();

      const inside = (mx, my, r) =>
        mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

      // ---------------- Input (via manager) ----------------
      this.handleMousePressed = () => {
        if (state !== "playing" || !item) return;
        const sx = (mouseX / width) * W,
          sy = (mouseY / height) * H;
        if (inside(sx, sy, item)) {
          item.dragging = true;
          item.offsetX = sx - item.x;
          item.offsetY = sy - item.y;
        }
      };

      this.handleMouseDragged = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        const sx = (mouseX / width) * W,
          sy = (mouseY / height) * H;
        // Constrain so it always stays within the 64x64 frame while dragging
        item.x = constrain(sx - item.offsetX, 0, W - item.w);
        item.y = constrain(sy - item.offsetY, 0, H - item.h);
      };

      this.handleMouseReleased = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        item.dragging = false;

        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;

        const inBadZone = cx >= 0 && cx <= 26 && cy >= 0 && cy <= 26;
        const inGoodZone = cx >= 49 && cx <= 64 && cy >= 0 && cy <= 64;

        // Score only if dropped into the correct zone
        if (item.kind === "good" && inGoodZone) {
          score += 1;
          spawnItem();
        } else if (
          (item.kind === "bad" || item.kind === "blood") &&
          inBadZone
        ) {
          score += 1;
          goatState = "anim";
          goatAnimStart = millis();
          this._showGoatGif(true);
          spawnItem();
        } else {
          // wrong drop: no score change, leave it where it is
          if (goatState !== "anim") goatState = "static";
        }
      };

      // ---------------- Frame step ----------------
      const step = () => {
        // Arm timer after manager countdown
        if (!timerArmed) {
          timerArmed = true;
          gameStartMs = millis();
        }

        // Background & paper strip
        pix.push();
        pix.image(bg_chore2_table, 0, 0, 64, 64);
        pix.image(bg_chore_paper, 51, 7, 13, 64);
        pix.pop();

        // Goat render & state control
        if (goatState === "anim") {
          // DOM GIF is visible; time it out
          if (millis() - goatAnimStart > GOAT_ANIM_MS) {
            goatState = "static";
            this._showGoatGif(false);
          }
        } else {
          // Keep mouth OPEN while holding ANY bad-type paper
          if (
            item &&
            item.dragging &&
            (item.kind === "bad" || item.kind === "blood")
          ) {
            goatState = "open";
          } else if (goatState !== "anim") {
            goatState = "static";
          }

          // Draw static/open goat on pix
          if (goatState === "open" && typeof goat_open !== "undefined") {
            pix.image(goat_open, 0, 0, 64, 64);
          } else if (typeof goat_static !== "undefined") {
            pix.image(goat_static, 0, 0, 64, 64);
          }
          // Ensure DOM GIF hidden when not animating
          this._showGoatGif(false);
        }

        // Timer
        const timeLeft = max(
          0,
          ROUND_TIME_LIMIT_SEC - floor((millis() - gameStartMs) / 1000)
        );
        if (timeLeft <= 0) state = "end";

        // Paper (stays constrained to frame while dragging)
        if (item && item.img) {
          pix.image(item.img, item.x, item.y, item.w, item.h);
        }

        // HUD
        pix.push();
        pix.fill(255);
        pix.textAlign(RIGHT, TOP);
        pix.textSize(8);
        pix.text(`${score}:sort`, 48, 2);
        pix.text(`${timeLeft}s:time`, 53, 10);
        pix.pop();

        if (state === "end") {
          this._showGoatGif(false);
          this._score = score;
          this._isOver = true;
          return;
        }

        this._score = score;
        this._isOver = false;
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

    // ---------- internal helpers ----------
    _ensureGoatGifEl() {
      if (this._goatGifEl) return;
      this._goatGifEl = createImg(this._goatGifPath, "");
      this._goatGifEl.size(width, height);
      this._goatGifEl.position(0, 0);
      this._goatGifEl.style("pointer-events", "none");
      this._goatGifEl.style("image-rendering", "pixelated");
      // keep it behind your bg_frame if bg_frame uses higher z-index
      this._goatGifEl.hide();
    }
    _showGoatGif(show) {
      if (!this._goatGifEl) return;
      if (show) this._goatGifEl.show();
      else this._goatGifEl.hide();
    }
  };
})();
