// classes/Chore2.js
(function () {
  window.Chore2 = class {
    constructor(shared) {
      this.shared = shared;
      this._isOver = false;
      this._score = 0;
      this.usesCustomCursor = false; // we want the global ui_mouse
      this._goatGifEl = null;
      this._goatGifPath = "assets/chore2/goat_gif.gif";
    }

    start(cfg) {
      const W = this.shared.W,
        H = this.shared.H,
        pix = this.shared.pix;

      const GOOD_RATE = cfg.goodSpawnPercent; // %
      const BAD_RATE = cfg.badSpawnPercent; // %
      const BLOOD_RATE = cfg.badBloodPercent || 0; // % chance within BAD to be blood
      const GOAT_ANIM_MS = cfg.goatAnimationDurationMs;

      let score = 0;
      let state = "playing";
      let timerArmed = false;
      let gameStartMs = 0;

      let goatState = "static";
      let goatAnimStart = 0;

      let item = null;
      let lastImg = null;

      this._ensureGoatGifEl();

      function spawnItem() {
        const total = Math.max(1, GOOD_RATE + BAD_RATE);
        const roll = random(0, total);
        let kind;
        let imgArray;

        if (roll < GOOD_RATE) {
          kind = "good";
          imgArray = c2GoodImgs;
        } else {
          kind = "bad";
          // roll for blood paper within bad
          if (random(0, 100) < BLOOD_RATE) {
            imgArray = c2BadBloodImgs; // <-- make sure you define this array with paper_blood images
          } else {
            imgArray = c2BadImgs;
          }
        }

        // avoid repeating the exact same image as last time
        let img;
        if (imgArray.length > 1) {
          do {
            img = random(imgArray);
          } while (img === lastImg);
        } else {
          img = imgArray[0];
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
          if (goatState !== "anim") goatState = "static";
        }
      };

      const step = () => {
        if (!timerArmed) {
          timerArmed = true;
          gameStartMs = millis();
        }

        pix.image(bg_chore2_table, 0, 0, 64, 64);
        pix.image(bg_chore_paper, 51, 7, 13, 64);

        if (goatState === "anim") {
          if (millis() - goatAnimStart > GOAT_ANIM_MS) {
            goatState = "static";
            this._showGoatGif(false);
          }
        } else {
          if (item && item.dragging && item.kind === "bad") {
            goatState = "open";
          } else if (goatState !== "anim") {
            goatState = "static";
          }

          if (goatState === "open" && typeof goat_open !== "undefined") {
            pix.image(goat_open, 0, 0, 64, 64);
          } else if (typeof goat_static !== "undefined") {
            pix.image(goat_static, 0, 0, 64, 64);
          }
          this._showGoatGif(false);
        }

        const timeLeft = Math.max(
          0,
          30 - Math.floor((millis() - gameStartMs) / 1000)
        );
        if (timeLeft <= 0) state = "end";

        if (item) pix.image(item.img, item.x, item.y, item.w, item.h);

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

    _ensureGoatGifEl() {
      if (this._goatGifEl) return;
      this._goatGifEl = createImg(this._goatGifPath, "");
      this._goatGifEl.size(width, height);
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
