// classes/Chore2.js
(function () {
  // Paper sorting — uniform countdown handled by GameManager
  // Goat behavior:
  // - While holding (dragging) a BAD paper => mouth OPEN (even if not moving)
  // - On correct BAD drop (left zone) => play GIF (ANIM) for GOAT_ANIM_MS, then back to static
  // NOTE: Animated GIF is shown via a DOM <img> (createImg), not loadImage.
  window.Chore2 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;

      // DOM gif element (created lazily on start)
      this._goatGifEl = null;
      this._goatGifPath = "assets/chore2/goat_gif.gif";
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      let GOOD_RATE = cfg.goodSpawnPercent; // %
      let BAD_RATE = cfg.badSpawnPercent; // %
      let GOAT_ANIM_MS = cfg.goatAnimationDurationMs;

      let score = 0;
      let state = "playing"; // start directly
      const GAME_DURATION_MS = 30 * 1000;
      let gameStartMs = millis();

      // goat: 'static' | 'open' | 'anim'
      let goatState = "static";
      let goatAnimStart = 0;

      // draggable item
      let item = null; // {x,y,w,h, kind:'good'|'bad', img, dragging, offsetX, offsetY}

      // --- ensure DOM GIF exists (overlayed above canvas) ---
      this._ensureGoatGifEl();

      function spawnItem() {
        const total = max(1, GOOD_RATE + BAD_RATE);
        const roll = random(0, total);
        const kind = roll < GOOD_RATE ? "good" : "bad";
        const img = kind === "good" ? random(c2GoodImgs) : random(c2BadImgs);
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
        item.x = constrain(sx - item.offsetX, 0, W - item.w);
        item.y = constrain(sy - item.offsetY, 0, H - item.h);
        // Goat mouth logic handled per-frame so it stays open even if mouse pauses.
      };

      this.handleMouseReleased = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        item.dragging = false;

        const centerX = item.x + item.w / 2;

        // Correct GOOD (right zone)
        if (item.kind === "good" && centerX >= 37) {
          score += 1;
          // goat stays static/open handled per-frame
        }
        // Correct BAD (left zone)
        else if (item.kind === "bad" && centerX <= 27) {
          score += 1;
          goatState = "anim";
          goatAnimStart = millis(); // start GIF after drop
          this._showGoatGif(true);
        }
        // Wrong drop
        else {
          score -= 1;
          if (goatState !== "anim") goatState = "static";
        }

        spawnItem();
      };

      // ---------------- Frame step ----------------
      const step = () => {
        // background & paper strip
        pix.image(bg_chore2_table, 0, 0, 64, 64);
        pix.image(bg_chore_paper, 51, 7, 13, 64);

        // Goat render & state control
        if (goatState === "anim") {
          // DOM GIF is visible; time it out
          if (millis() - goatAnimStart > GOAT_ANIM_MS) {
            goatState = "static";
            this._showGoatGif(false);
          }
        } else {
          // Keep mouth OPEN while holding a BAD paper
          if (item && item.dragging && item.kind === "bad") {
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
          // Ensure GIF is hidden when not animating
          this._showGoatGif(false);
        }

        // Timer
        const timeLeft = max(0, 30 - floor((millis() - gameStartMs) / 1000));
        if (timeLeft <= 0) state = "end";

        // Item
        if (item) pix.image(item.img, item.x, item.y, item.w, item.h);

        // HUD
        pix.push();
        pix.fill(255);
        pix.textAlign(RIGHT, TOP);
        pix.textSize(8);

        pix.text(`${score}:score`, 48, 2);
        pix.text(`${timeLeft}s:time`, 52, 10);
        pix.pop();

        if (state === "end") {
          // hide GIF if showing
          this._showGoatGif(false);

          pix.push();
          pix.fill(0, 200);
          pix.rect(0, 0, 64, 64);
          pix.fill(255);
          pix.textAlign(LEFT, CENTER);
          pix.textSize(16);
          pix.text("END", 0, 22);
          pix.textSize(8);
          pix.text(`Score: ${score}`, 17, 36);
          pix.text("Click to play again", 17, 50);
          pix.textAlign(LEFT, TOP);
          pix.pop();

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
      // Create an <img> overlay aligned with the main canvas
      this._goatGifEl = createImg(this._goatGifPath, "");
      this._goatGifEl.size(width, height); // full canvas
      this._goatGifEl.position(0, 0);
      this._goatGifEl.style("pointer-events", "none");
      this._goatGifEl.style("image-rendering", "pixelated");
      this._goatGifEl.hide();
    }

    _showGoatGif(show) {
      if (!this._goatGifEl) return;
      if (show) this._goatGifEl.show();
      else this._goatGifEl.hide();
    }
  };
})();
