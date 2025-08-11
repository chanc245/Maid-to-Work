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
let bg_chore3_river, item_smug, item_sponge;
let clothesImgs = []; // clothes_01_blouse.png, clothes_02_dress.png, clothes_03_shirt.png
// ---------------------------------------------

let cg_title; // title CG
let bg_frame; // frame bg for day-anim (optional)
let ui_chore1_ex, ui_chore2_ex, ui_chore3_ex; // tutorial cards

let ui_mouse, ui_mouse_click;
let mouseDown = false;

function preload() {
  SFX.preload();

  pixelFont = loadFont("assets/fonts/Pixel Millennium.ttf");

  // Systems that have their own preloads (Dialog box + True Ending assets)
  GameManager.preload();

  // NEW: title + frame + tutorial cards
  cg_title = loadImage("assets/dialog/cg_title.png");
  bg_frame = loadImage("assets/ui/bg_frame.png");

  ui_mouse = loadImage("assets/ui/ui_mouse.png");
  ui_mouse_click = loadImage("assets/ui/ui_mouse_click.png");

  ui_chore1_ex = loadImage("assets/ui/ui_chore1_ex.png");
  ui_chore2_ex = loadImage("assets/ui/ui_chore2_ex.png");
  ui_chore3_ex = loadImage("assets/ui/ui_chore3_ex.png");

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
  if (cnv) cnv.style.imageRendering = "pixelated";

  manager = new GameManager({ pix, W, H, SCALE, font: pixelFont });
  manager.start();
}

function draw() {
  pix.background(12);
  manager.update();
  manager.draw();

  // Draw custom mouse if current scene doesn't override it
  if (ui_mouse && !manager.sceneHasCustomCursor?.()) {
    const mx = (mouseX / width) * W;
    const my = (mouseY / height) * H;
    const mw = ui_mouse.width || 7;
    const mh = ui_mouse.height || 8;
    let imgToDraw = mouseDown ? ui_mouse_click : ui_mouse;
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

// Input handling
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
