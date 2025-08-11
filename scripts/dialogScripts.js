// scripts/dialogScripts.js

const DIALOGS = {
  dia_Intro: {
    lines: [
      { cg: "cg_intro1_newMaid", text: "I’m the new maid in" },
      { cg: "cg_intro1_newMaid", text: "this mansion!" },
      { cg: "cg_intro2_determine", text: "I will prove I’m the" },
      { cg: "cg_intro2_determine", text: "best maid in three days!" },
    ],
  },

  dia_endNormal: {
    lines: [
      { cg: "cg_endNormal1_happy", text: "I perfectly finished all" },
      { cg: "cg_endNormal1_happy", text: "the chores!" },
      { cg: "cg_endNormal2_doubt", text: "Mmmm… but I feel like" },
      { cg: "cg_endNormal2_doubt", text: "I’m missing something…" },
      { cg: "cg_endNormal3_whatever", text: "Well I guess it’s fine since" },
      { cg: "cg_endNormal3_whatever", text: "I’m the best maid now!" },
    ],
    endingCGKey: "cg_endNormal_ENDCARD",
  },

  dia_endBad: {
    lines: [
      { cg: "cg_endBad1_fail", text: "“How could you fail most" },
      { cg: "cg_endBad1_fail", text: "of the tasks?!”" },
      { cg: "cg_endBad2_kickOut", text: "I got kicked out of the mansion." },
      { cg: "cg_endBad2_kickOut", text: "I’ll never be the best maid..." },
    ],
    endingCGKey: "cg_endBad_ENDCARD",
  },

  dia_endTrue1: {
    lines: [
      { cg: "cg_endTrue1_noticeBasement", text: "Ah! I forgot to clean" },
      { cg: "cg_endTrue1_noticeBasement", text: "the basement!" },
      { cg: "cg_endTrue2_aMess", text: "What a mess! Looks like" },
      { cg: "cg_endTrue2_aMess", text: "this place needs some work!" },
    ],
  },
  dia_endTrue2: {
    lines: [
      { cg: "cg_endTrue3_stairEnd", text: "What awaited me at" },
      { cg: "cg_endTrue3_stairEnd", text: "the end of the basement was…" },
      { cg: "cg_endTrue4_spider", text: "A mysterious spider!" },
      { cg: "cg_endTrue5_ohNo", text: "Oh no! This spider… it’s…" },
      { cg: "cg_endTrue6_worry", text: "It’s starving! I guess" },
      { cg: "cg_endTrue6_worry", text: "the last meal wasn’t enough." },
      { cg: "cg_endTrue7_feed", text: "Thankfully, I brought" },
      { cg: "cg_endTrue7_feed", text: "some snacks!" },
      { cg: "cg_endTrue8_happySpider", text: "Being a perfect maid" },
      { cg: "cg_endTrue8_happySpider", text: "takes a lot of work!" },
    ],
    endingCGKey: "cg_endTrue_ENDCARD",
  },
};
