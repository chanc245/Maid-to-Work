// sketch.js

const W = 64,
  H = 64,
  SCALE = 10;

let pix, pixelFont, manager;

// --------- GLOBALS the chores expect ---------
// CHORE 1
let bg_chore1, item_pot;
let c1GoodImgs = [],
  c1BadImgs = [],
  c1BloodImgs = [];

// CHORE 2
let bg_chore2_table, bg_chore_paper, goat_static, goat_open;
let c2GoodImgs = [],
  c2BadImgs = [],
  c2BadBloodImgs = [];

// CHORE 3
let bg_chore3_river, item_smug, item_bloodSmug, item_sponge;
let clothesImgs = []; // clothes_01_blouse.png, clothes_02_dress.png, clothes_03_shirt.png
// ---------------------------------------------

let cg_title; // title CG
let bg_frame; // frame bg for day-anim (optional)
let ui_chore1_ex, ui_chore2_ex, ui_chore3_ex; // tutorial cards

let ui_mouse, ui_mouse_click;
let mouseDown = false;

function preload() {
  // Audio bank
  SFX.preload();

  pixelFont = loadFont("assets/fonts/Pixel Millennium.ttf");

  // Systems that have their own preloads (Dialog box + True Ending assets)
  GameManager.preload();

  // Title + frame + tutorial cards
  cg_title = loadImage("assets/dialog/cg_title.png");
  cg_triggerWarning = loadImage("assets/dialog/cg_triggerWarning.png");
  bg_frame = loadImage("assets/ui/bg_frame.png");

  ui_mouse = loadImage("assets/ui/ui_mouse.png");
  ui_mouse_click = loadImage("assets/ui/ui_mouse_click.png");

  ui_chore1_ex = loadImage("assets/ui/ui_chore1_ex.png");
  ui_chore2_ex = loadImage("assets/ui/ui_chore2_ex.png");
  ui_chore3_ex = loadImage("assets/ui/ui_chore3_ex.png");
  ui_basement_ex = loadImage("assets/ui/ui_basement_ex.png");

  ui_dayReminder_day = loadImage("assets/ui/ui_dayReminder_day.png");
  ui_dayReminder_evening = loadImage("assets/ui/ui_dayReminder_evening.png");
  ui_dayReminder_night = loadImage("assets/ui/ui_dayReminder_night.png");
  ui_daySwap = loadImage("assets/ui/ui_daySwap.gif");

  cg_endBad_ENDCARD = loadImage("assets/dialog/cg_endBad_ENDCARD.png");
  cg_endNormal_ENDCARD = loadImage("assets/dialog/cg_endNormal_ENDCARD.png");
  cg_endTrue_ENDCARD = loadImage("assets/dialog/cg_endTrue_ENDCARD.png");

  // ========= CHORE 1 assets =========
  bg_chore1 = loadImage("assets/chore1/bg_chore1_kitchen.png");
  item_pot = loadImage("assets/chore1/item_pot.png");

  c1GoodImgs.push(loadImage("assets/chore1/food_good_carrot.png"));
  c1GoodImgs.push(loadImage("assets/chore1/food_good_mushroom.png"));
  c1GoodImgs.push(loadImage("assets/chore1/food_good_potato.png"));

  c1BadImgs.push(loadImage("assets/chore1/food_bad_bananaPeel.png"));
  c1BadImgs.push(loadImage("assets/chore1/food_bad_halfApple.png"));
  c1BadImgs.push(loadImage("assets/chore1/food_bad_fishBone.png"));

  c1BloodImgs.push(loadImage("assets/chore1/food_blood_finger.png"));
  c1BloodImgs.push(loadImage("assets/chore1/food_blood_ear.png"));
  c1BloodImgs.push(loadImage("assets/chore1/food_blood_eyeBall.png"));

  // ========= CHORE 2 assets =========
  bg_chore2_table = loadImage("assets/chore2/bg_chore2_table.png");
  bg_chore_paper = loadImage("assets/chore2/bg_chore_paper.png");

  goat_static = loadImage("assets/chore2/goat_static.png");
  goat_open = loadImage("assets/chore2/goat_open.png");

  c2GoodImgs.push(loadImage("assets/chore2/paper_good_1.png"));
  c2GoodImgs.push(loadImage("assets/chore2/paper_good_2.png"));
  c2GoodImgs.push(loadImage("assets/chore2/paper_good_3.png"));

  c2BadImgs.push(loadImage("assets/chore2/paper_bad_1.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_bad_2.png"));
  c2BadImgs.push(loadImage("assets/chore2/paper_bad_3.png"));

  c2BadBloodImgs.push(loadImage("assets/chore2/paper_blood_1.png"));
  c2BadBloodImgs.push(loadImage("assets/chore2/paper_blood_2.png"));
  c2BadBloodImgs.push(loadImage("assets/chore2/paper_blood_3.png"));

  // ========= CHORE 3 assets =========
  bg_chore3_river = loadImage("assets/chore3/bg_chore3_river.png");

  clothesImgs.push(loadImage("assets/chore3/clothes_01_blouse.png"));
  clothesImgs.push(loadImage("assets/chore3/clothes_02_dress.png"));
  clothesImgs.push(loadImage("assets/chore3/clothes_03_shirt.png"));

  item_smug = loadImage("assets/chore3/item_smug.png");
  item_bloodSmug = loadImage("assets/chore3/item_bloodSmug.png");
  item_sponge = loadImage("assets/chore3/item_sponge.png");
}

function setup() {
  pixelDensity(1);
  createCanvas(W * SCALE, H * SCALE);
  noSmooth();
  noCursor();

  pix = createGraphics(W, H);
  pix.noSmooth();
  pix.imageMode(CORNER);
  pix.textFont(pixelFont);
  pix.textSize(8);
  pix.textAlign(LEFT, TOP);

  const cnv = document.querySelector("canvas");
  if (cnv) {
    cnv.style.imageRendering = "pixelated";
    cnv.style.touchAction = "none"; // prevent browser gestures on touch
    cnv.setAttribute("draggable", "false");
    cnv.addEventListener("dragstart", (e) => e.preventDefault());
  }

  manager = new GameManager({ pix, W, H, SCALE, font: pixelFont });
  manager.start();
}

function draw() {
  pix.background(12);
  manager.update();
  manager.draw();

  // Draw custom mouse/touch cursor if the scene doesn't override it
  if (ui_mouse && !manager.sceneHasCustomCursor?.()) {
    const { x: px, y: py } = pointerPos(); // supports touch or mouse
    const mx = (px / width) * W;
    const my = (py / height) * H;

    const pressed = pointerIsDown(); // true for mouse or touch presses
    const imgToDraw = pressed && ui_mouse_click ? ui_mouse_click : ui_mouse;

    const mw = imgToDraw.width || 7; // your cursor files are 7x8
    const mh = imgToDraw.height || 8;
    pix.image(imgToDraw, mx - mw * 0.5, my - mh * 0.5, mw, mh);
  }

  // Frame on top of everything
  if (bg_frame) {
    pix.push();
    pix.noTint();
    pix.image(bg_frame, 0, 0, W, H);
    pix.pop();
  }

  image(pix, 0, 0, width, height);

  if (window.__debugDraw) {
    push();
    noSmooth();
    __debugDraw(this, manager);
    pop();
  }
}

// ---------- Pointer helpers (mouse + touch) ----------
function pointerIsDown() {
  return mouseIsPressed || (touches && touches.length > 0);
}
function pointerPos() {
  if (touches && touches.length > 0) {
    return { x: touches[0].x, y: touches[0].y };
  }
  return { x: mouseX, y: mouseY };
}

// ---------- Input handling ----------
function mousePressed() {
  mouseDown = true;
  if (manager?.mousePressed) manager.mousePressed();
}
function mouseDragged() {
  if (manager?.mouseDragged) manager.mouseDragged();
}
function mouseReleased() {
  mouseDown = false;
  if (manager?.mouseReleased) manager.mouseReleased();
}
function keyPressed() {
  if (manager?.keyPressed) manager.keyPressed(key);
}

// Touch mirrors mouse to support mobile
function touchStarted() {
  mouseDown = true;
  if (manager?.mousePressed) manager.mousePressed();
  return false;
}
function touchMoved() {
  if (manager?.mouseDragged) manager.mouseDragged();
  return false;
}
function touchEnded() {
  mouseDown = false;
  if (manager?.mouseReleased) manager.mouseReleased();
  return false;
}
