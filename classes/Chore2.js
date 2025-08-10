// classes/Chore2.js
(function () {
  // Paper sorting — uniform countdown handled by GameManager
  // Goat behavior:
  // - While holding (dragging) a BAD paper => mouth OPEN (even if not moving)
  // - On correct BAD drop (top-left zone) => play GIF (ANIM) for GOAT_ANIM_MS, then back to static
  // Drop zones:
  //   BAD  zone: x in [0,26],  y in [0,26]
  //   GOOD zone: x in [49,64], y in [0,64]
  window.Chore2 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;

      this.usesCustomCursor = false; // we want the global ui_mouse

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

      // --- ensure DOM GIF exists (overlay aligned with canvas) ---
      this._ensureGoatGifEl();

      function spawnItem() {
        const total = max(1, GOOD_RATE + BAD_RATE);
        const roll = random(0, total);
        const kind = roll < GOOD_RATE ? "good" : "bad";
        const img = kind === "good" ? random(c2GoodImgs) : random(c2BadImgs);
        item = {
          x: 18, // starting position per your request
          y: 26, // starting position per your request
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
        // Constrain so it always stays within the 64x64 frame while dragging
        item.x = constrain(sx - item.offsetX, 0, W - item.w);
        item.y = constrain(sy - item.offsetY, 0, H - item.h);
        // Goat mouth logic handled per-frame so it stays open even if mouse pauses.
      };

      this.handleMouseReleased = () => {
        if (state !== "playing" || !item || !item.dragging) return;
        item.dragging = false;

        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;

        const inBadZone = cx >= 0 && cx <= 26 && cy >= 0 && cy <= 26;
        const inGoodZone = cx >= 49 && cx <= 64 && cy >= 0 && cy <= 64;

        if (item.kind === "good" && inGoodZone) {
          score += 1;
          spawnItem();
        } else if (item.kind === "bad" && inBadZone) {
          score += 1;
          goatState = "anim";
          goatAnimStart = millis();
          this._showGoatGif(true);
          spawnItem();
        } else {
          // wrong drop: no score change, leave paper where it is
          if (goatState !== "anim") goatState = "static";
        }
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
          // Keep mouth OPEN while holding a BAD paper (even if not moving)
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

        // Item (always stays within frame even after wrong drop because drag constrained it)
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
          this._showGoatGif(false);
          // Removed overlay — nothing drawn here
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
      // Be sure your canvas has z-index:1 in setup if you want the frame above this
      this._goatGifEl.hide();
    }

    _showGoatGif(show) {
      if (!this._goatGifEl) return;
      if (show) this._goatGifEl.show();
      else this._goatGifEl.hide();
    }
  };
})();
