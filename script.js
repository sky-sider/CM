"use strict";

const TuringEngine = (() => {
  function generateAllCodes() {
    const codes = [];
    for (let a = 1; a <= 5; a++) {
      for (let b = 1; b <= 5; b++) {
        for (let c = 1; c <= 5; c++) codes.push([a, b, c]);
      }
    }
    return codes;
  }

  function isValidCode(code) {
    return Array.isArray(code) && code.length === 3 &&
      code.every(n => Number.isInteger(n) && n >= 1 && n <= 5);
  }

  function evaluate(code, criterion) {
    if (!isValidCode(code)) throw new Error("暗号は1～5の数字を3つ指定してください。");
    if (!criterion || typeof criterion.test !== "function") {
      throw new Error("条件の定義が正しくありません。");
    }
    return Boolean(criterion.test(code));
  }

  function createVerifier(id, card, activeCriterion) {
    const options = card.options;
    const activeIndex = options.indexOf(activeCriterion);
    if (activeIndex < 0) throw new Error("選択した条件が検証カードにありません。");
    return { id, cardId: card.id, cardName: card.name, options, activeIndex };
  }

  function askVerifier(code, verifier) {
    return evaluate(code, verifier.options[verifier.activeIndex]);
  }

  function filterCriteria(options, observationsForVerifier) {
    return options.filter(criterion => observationsForVerifier.every(observation =>
      evaluate(observation.code, criterion) === observation.passed
    ));
  }

  function filterCandidates(codes, observations, verifierOptions) {
    return codes.filter(code => verifierOptions.every(verifier => {
      const related = observations.filter(observation => observation.verifierId === verifier.id);
      if (related.length === 0) return true;
      const possibleCriteria = filterCriteria(verifier.options, related);
      return possibleCriteria.some(criterion => evaluate(code, criterion));
    }));
  }

  return { generateAllCodes, isValidCode, evaluate, createVerifier, askVerifier, filterCriteria, filterCandidates };
})();

// 公式版の条件カード48種類。
// 各カードに書かれている「条件候補」をひとまとまりにし、
// その中から1つだけを検証機の実際の条件として選びます。
const SHAPE = ["▲", "■", "●"];
const CRITERIA_CARDS = [];

function makeCriterion(name, test) {
  return { name, test };
}
function addCard(id, name, options) {
  CRITERIA_CARDS.push({ id, name, options });
}
function digitCriterion(pos, description, test) {
  return makeCriterion(SHAPE[pos] + "の数字は" + description, code => test(code[pos]));
}
function compareToValue(pos, value) {
  return [
    digitCriterion(pos, value + "より小さい", n => n < value),
    digitCriterion(pos, value + "と等しい", n => n === value),
    digitCriterion(pos, value + "より大きい", n => n > value)
  ];
}
function comparePositions(posA, posB) {
  return [
    makeCriterion(SHAPE[posA] + "は" + SHAPE[posB] + "より小さい", code => code[posA] < code[posB]),
    makeCriterion(SHAPE[posA] + "と" + SHAPE[posB] + "は等しい", code => code[posA] === code[posB]),
    makeCriterion(SHAPE[posA] + "は" + SHAPE[posB] + "より大きい", code => code[posA] > code[posB])
  ];
}
function countOptions(value, valueName = String(value)) {
  return [0, 1, 2, 3].map(count =>
    makeCriterion("コード内の「" + valueName + "」はちょうど" + count + "個", code =>
      code.filter(n => n === value).length === count)
  );
}
function parityOptions(pos) {
  return [
    digitCriterion(pos, "偶数", n => n % 2 === 0),
    digitCriterion(pos, "奇数", n => n % 2 === 1)
  ];
}
function countEven(code) { return code.filter(n => n % 2 === 0).length; }
function countOdd(code) { return code.filter(n => n % 2 === 1).length; }
function sum(code) { return code.reduce((total, n) => total + n, 0); }
function pairSumOptions(target) {
  return [[0, 1], [1, 2], [0, 2]].map(([a, b]) =>
    makeCriterion(SHAPE[a] + "と" + SHAPE[b] + "の合計は" + target, code => code[a] + code[b] === target)
  );
}
function compareDigitWithValue(pos, value, relation) {
  const label = relation === "lt" ? "より小さい" : relation === "eq" ? "と等しい" : "より大きい";
  return digitCriterion(pos, value + label, n =>
    relation === "lt" ? n < value : relation === "eq" ? n === value : n > value);
}
function countRelationOptions(value) {
  const options = [];
  for (let pos = 0; pos < 3; pos++) {
    options.push(compareDigitWithValue(pos, value, "lt"));
    options.push(compareDigitWithValue(pos, value, "eq"));
    options.push(compareDigitWithValue(pos, value, "gt"));
  }
  return options;
}
function allDifferentCriterion() {
  return makeCriterion("3つの数字はすべて異なる", code => new Set(code).size === 3);
}
function onePairCriterion() {
  return makeCriterion("同じ数字がちょうど2つある", code => new Set(code).size === 2);
}
function noPairCriterion() {
  return makeCriterion("同じ数字のペアがない（3つ同じ場合も含む）", code => new Set(code).size !== 2);
}
function orderOptions() {
  return [
    makeCriterion("3つの数字は小さい順に並ぶ", code => code[0] < code[1] && code[1] < code[2]),
    makeCriterion("3つの数字は大きい順に並ぶ", code => code[0] > code[1] && code[1] > code[2]),
    makeCriterion("小さい順でも大きい順でもない", code =>
      !(code[0] < code[1] && code[1] < code[2]) &&
      !(code[0] > code[1] && code[1] > code[2]))
  ];
}
function smallestOptions(strict = true) {
  return [0, 1, 2].map(pos => makeCriterion(
    SHAPE[pos] + "の数字が最小" + (strict ? "（他の2つより小さい）" : "（他の2つ以下）"),
    code => strict
      ? code[pos] < code[(pos + 1) % 3] && code[pos] < code[(pos + 2) % 3]
      : code[pos] <= code[(pos + 1) % 3] && code[pos] <= code[(pos + 2) % 3]
  ));
}
function largestOptions(strict = true) {
  return [0, 1, 2].map(pos => makeCriterion(
    SHAPE[pos] + "の数字が最大" + (strict ? "（他の2つより大きい）" : "（他の2つ以上）"),
    code => strict
      ? code[pos] > code[(pos + 1) % 3] && code[pos] > code[(pos + 2) % 3]
      : code[pos] >= code[(pos + 1) % 3] && code[pos] >= code[(pos + 2) % 3]
  ));
}
function consecutiveAscendingOptions() {
  return [
    makeCriterion("連続する数字がない（昇順）", code =>
      !((code[1] === code[0] + 1) || (code[2] === code[1] + 1))),
    makeCriterion("隣り合う2つが連続する（昇順）", code =>
      Number(code[1] === code[0] + 1) + Number(code[2] === code[1] + 1) === 1),
    makeCriterion("3つすべてが連続する（昇順）", code =>
      code[1] === code[0] + 1 && code[2] === code[1] + 1)
  ];
}
function consecutiveEitherDirectionOptions() {
  return [
    makeCriterion("連続する数字がない（昇順・降順）", code =>
      Math.abs(code[1] - code[0]) !== 1 && Math.abs(code[2] - code[1]) !== 1),
    makeCriterion("隣り合う2つだけが連続する（昇順・降順）", code =>
      (Number(Math.abs(code[1] - code[0]) === 1) + Number(Math.abs(code[2] - code[1]) === 1) >= 1) && !((code[1] === code[0] + 1 && code[2] === code[1] + 1) || (code[1] === code[0] - 1 && code[2] === code[1] - 1))),
    makeCriterion("3つすべてが連続する（昇順・降順）", code =>
      ((code[1] === code[0] + 1 && code[2] === code[1] + 1) || (code[1] === code[0] - 1 && code[2] === code[1] - 1)))
  ];
}

// 1～7：1桁の数字を比較する条件、偶数・奇数
addCard(1, "数字を1と比較", [
  digitCriterion(0, "1", n => n === 1),
  digitCriterion(0, "1より大きい", n => n > 1)
]);
addCard(2, "▲の数字を3と比較", compareToValue(0, 3));
addCard(3, "■の数字を3と比較", compareToValue(1, 3));
addCard(4, "■の数字を4と比較", compareToValue(1, 4));
addCard(5, "▲の偶数・奇数", parityOptions(0));
addCard(6, "■の偶数・奇数", parityOptions(1));
addCard(7, "●の偶数・奇数", parityOptions(2));

// 8～10：数字1・3・4がコードに何個含まれるか
addCard(8, "数字1の個数", countOptions(1));
addCard(9, "数字3の個数", countOptions(3));
addCard(10, "数字4の個数", countOptions(4));

// 11～13：2つの位置の数字を比較
addCard(11, "▲と■を比較", comparePositions(0, 1));
addCard(12, "▲と●を比較", comparePositions(0, 2));
addCard(13, "■と●を比較", comparePositions(1, 2));

// 14～25：大小関係、偶奇の個数、合計、重複、並び順、連続数
addCard(14, "最小の数字", smallestOptions(true));
addCard(15, "最大の数字", largestOptions(true));
addCard(16, "偶数と奇数の個数", [
  makeCriterion("偶数の方が奇数より多い", code => countEven(code) > countOdd(code)),
  makeCriterion("奇数の方が偶数より多い", code => countOdd(code) > countEven(code))
]);
addCard(17, "偶数の個数", [0, 1, 2, 3].map(count =>
  makeCriterion("コード内の偶数はちょうど" + count + "個", code => countEven(code) === count)
));
addCard(18, "3つの合計の偶奇", [
  makeCriterion("3つの数字の合計は偶数", code => sum(code) % 2 === 0),
  makeCriterion("3つの数字の合計は奇数", code => sum(code) % 2 === 1)
]);
addCard(19, "▲と■の合計を6と比較", [
  makeCriterion("▲＋■は6より小さい", code => code[0] + code[1] < 6),
  makeCriterion("▲＋■は6", code => code[0] + code[1] === 6),
  makeCriterion("▲＋■は6より大きい", code => code[0] + code[1] > 6)
]);
addCard(20, "同じ数字の重複回数", [
  allDifferentCriterion(),
  onePairCriterion(),
  makeCriterion("3つの数字がすべて同じ", code => new Set(code).size === 1)
]);
addCard(21, "ペアがあるか", [
  noPairCriterion(),
  onePairCriterion()
]);
addCard(22, "数字の並び順", orderOptions());
addCard(23, "3つの合計を6と比較", [
  makeCriterion("3つの合計は6より小さい", code => sum(code) < 6),
  makeCriterion("3つの合計は6", code => sum(code) === 6),
  makeCriterion("3つの合計は6より大きい", code => sum(code) > 6)
]);
addCard(24, "昇順の連続する数字", consecutiveAscendingOptions());
addCard(25, "昇順・降順の連続する数字", consecutiveEitherDirectionOptions());

// 26～35：各位置の数字の範囲、偶奇、最小・最大
addCard(26, "どの位置の数字が3未満か", [0, 1, 2].map(pos =>
  digitCriterion(pos, "3より小さい", n => n < 3)
));
addCard(27, "どの位置の数字が4未満か", [0, 1, 2].map(pos =>
  digitCriterion(pos, "4より小さい", n => n < 4)
));
addCard(28, "どの位置の数字が1か", [0, 1, 2].map(pos =>
  digitCriterion(pos, "1", n => n === 1)
));
addCard(29, "どの位置の数字が3か", [0, 1, 2].map(pos =>
  digitCriterion(pos, "3", n => n === 3)
));
addCard(30, "どの位置の数字が4か", [0, 1, 2].map(pos =>
  digitCriterion(pos, "4", n => n === 4)
));
addCard(31, "どの位置の数字が1より大きいか", [0, 1, 2].map(pos =>
  digitCriterion(pos, "1より大きい", n => n > 1)
));
addCard(32, "どの位置の数字が3より大きいか", [0, 1, 2].map(pos =>
  digitCriterion(pos, "3より大きい", n => n > 3)
));
addCard(33, "どの位置の数字が偶数・奇数か", [0, 1, 2].flatMap(pos => parityOptions(pos)));
addCard(34, "最小（同数を含む）", smallestOptions(false));
addCard(35, "最大（同数を含む）", largestOptions(false));

// 36～48：合計、位置間の比較、数字の個数
addCard(36, "合計が何の倍数か", [3, 4, 5].map(divisor =>
  makeCriterion("3つの合計は" + divisor + "の倍数", code => sum(code) % divisor === 0)
));
addCard(37, "2つの数字の合計が4", pairSumOptions(4));
addCard(38, "2つの数字の合計が6", pairSumOptions(6));
addCard(39, "どの位置の数字が1か1より大きいか", [0, 1, 2].flatMap(pos => [
  digitCriterion(pos, "1", n => n === 1),
  digitCriterion(pos, "1より大きい", n => n > 1)
]));
addCard(40, "どの位置の数字を3と比較", countRelationOptions(3));
addCard(41, "どの位置の数字を4と比較", countRelationOptions(4));
addCard(42, "どの位置の数字が最小または最大か", [
  ...smallestOptions(true),
  ...largestOptions(true)
]);
addCard(43, "▲を■または●と比較", [
  ...comparePositions(0, 1),
  ...comparePositions(0, 2)
]);
addCard(44, "▲と■、または■と●を比較", [
  ...comparePositions(0, 1),
  ...comparePositions(1, 2)
]);
addCard(45, "数字1または3の個数", [
  ...countOptions(1, "1").map(c => makeCriterion(c.name, c.test)),
  ...countOptions(3, "3").map(c => makeCriterion(c.name, c.test))
]);
addCard(46, "数字3または4の個数", [
  ...countOptions(3, "3").map(c => makeCriterion(c.name, c.test)),
  ...countOptions(4, "4").map(c => makeCriterion(c.name, c.test))
]);
addCard(47, "数字1または4の個数", [
  ...countOptions(1, "1").map(c => makeCriterion(c.name, c.test)),
  ...countOptions(4, "4").map(c => makeCriterion(c.name, c.test))
]);
addCard(48, "2つの位置を比較", [
  ...comparePositions(0, 1),
  ...comparePositions(0, 2),
  ...comparePositions(1, 2)
]);

let secretCode = [];
let verifiers = [];
let observations = [];
let historyEntries = [];
let currentRound = 1;
let questionsThisRound = 0;
let totalQuestions = 0;
let roundProposal = null;
let askedVerifiersThisRound = new Set();
let roundFinished = false;
let gameFinished = false;
const MAX_QUESTIONS_PER_ROUND = 3;

function getProposal() {
  const a = document.getElementById("digitA");
  const b = document.getElementById("digitB");
  const c = document.getElementById("digitC");
  if (!a || !b || !c) return null;
  return [Number(a.value), Number(b.value), Number(c.value)];
}
function getFinalGuess() {
  const a = document.getElementById("finalDigitA");
  const b = document.getElementById("finalDigitB");
  const c = document.getElementById("finalDigitC");

  if (!a || !b || !c) return null;

  return [Number(a.value), Number(b.value), Number(c.value)];
}
function validProposal(code) { return TuringEngine.isValidCode(code); }

function setMessage(message, kind = "") {
  const element = document.getElementById("message");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (kind) element.classList.add(kind);
}
function setFinalAnswerResult(message, kind = "") {
  const element = document.getElementById("finalAnswerResult");
  if (!element) return;

  element.textContent = message;
  element.classList.remove("success", "error");

  if (kind) {
    element.classList.add(kind);
  }

  element.hidden = false;
}
function resetFinalAnswerResult() {
  const element = document.getElementById("finalAnswerResult");
  if (!element) return;

  element.textContent = "";
  element.classList.remove("success", "error");
  element.hidden = true;
}
function addLog(message) {
  historyEntries.unshift(message);
  renderHistory();
}
function renderHistory() {
  const history = document.getElementById("history");
  if (!history) return;
  history.replaceChildren();
  if (historyEntries.length === 0) {
    history.textContent = "まだ解析記録はありません。";
    return;
  }
  historyEntries.forEach(message => {
    const item = document.createElement("p");
    item.className = "history-entry";
    item.textContent = message;
    history.appendChild(item);
  });
}
function renderRoundStatus() {
  const roundElement = document.getElementById("roundStatus");
  const questionElement = document.getElementById("questionStatus");
  const totalElement = document.getElementById("totalQuestionStatus");
  if (roundElement) roundElement.textContent = gameFinished ? "SESSION COMPLETE" : "ROUND " + currentRound;
  if (questionElement) questionElement.textContent = "このラウンドの質問：" + questionsThisRound + " / " + MAX_QUESTIONS_PER_ROUND;
  if (totalElement) totalElement.textContent = "総質問数：" + totalQuestions;
}
function updateControls() {
  const inputsLocked = roundProposal !== null || gameFinished;
  ["digitA", "digitB", "digitC"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.disabled = inputsLocked;
  });
  document.querySelectorAll("[data-verifier]").forEach(button => {
    const index = Number(button.dataset.verifier);
    const verifier = verifiers[index];
    const alreadyAsked = verifier && askedVerifiersThisRound.has(verifier.id);
    button.disabled = gameFinished || roundFinished ||
      questionsThisRound >= MAX_QUESTIONS_PER_ROUND || Boolean(alreadyAsked);
  });
  const nextRoundButton = document.getElementById("nextRound");
  if (nextRoundButton) {
    nextRoundButton.disabled = gameFinished || questionsThisRound === 0;
    nextRoundButton.textContent = roundFinished ? "次のラウンドへ" : "このラウンドを終了して次へ";
  }
  const submitButton = document.getElementById("submitGuess");
  if (submitButton) submitButton.disabled = gameFinished;
  renderRoundStatus();
}
function renderCandidateCount() {
  const candidates = TuringEngine.filterCandidates(TuringEngine.generateAllCodes(), observations, verifiers);
  let panel = document.getElementById("candidateCount");
  if (!panel) {
    panel = document.createElement("p");
    panel.id = "candidateCount";
    const history = document.getElementById("history");
    if (history && history.parentElement) history.parentElement.appendChild(panel);
  }
  panel.textContent = "現在の暗号候補：" + candidates.length + "通り";
}
function resetVerifierResults() {
  document.querySelectorAll(".result").forEach(result => {
    result.textContent = "未検証";
    result.classList.remove("pass", "fail");
  });
}

function testVerifier(index) {
  if (gameFinished) {
    setMessage("このゲームは終了しています。「新しい問題を開始」してください。");
    return;
  }
  if (roundFinished || questionsThisRound >= MAX_QUESTIONS_PER_ROUND) {
    setMessage("このラウンドの質問は終了しました。次のラウンドへ進んでください。");
    return;
  }
  const code = getProposal();
  if (!validProposal(code)) {
    setMessage("各数字に1～5を入力してください。", "error");
    return;
  }
  const verifier = verifiers[index];
  if (!verifier) {
    setMessage("検証機が見つかりません。", "error");
    return;
  }
  if (askedVerifiersThisRound.has(verifier.id)) {
    setMessage("このラウンドでは、同じ検証機に2回質問できません。別の検証機を選んでください。");
    return;
  }
  if (roundProposal === null) {
    roundProposal = [...code];
  } else if (code.some((digit, i) => digit !== roundProposal[i])) {
    setMessage("同じラウンド中は提案コードを変更できません。", "error");
    return;
  }

  const passed = TuringEngine.askVerifier(roundProposal, verifier);
  observations.push({ round: currentRound, verifierId: verifier.id, code: [...roundProposal], passed });
  askedVerifiersThisRound.add(verifier.id);
  questionsThisRound += 1;
  totalQuestions += 1;

  const result = document.getElementById("result" + index);
  if (result) {
    result.textContent = passed ? "PASS ✓" : "FAIL ✕";
    result.classList.remove("pass", "fail");
    result.classList.add(passed ? "pass" : "fail");
  }
  addLog("ラウンド " + currentRound + " ／ コード " + roundProposal.join("") +
    " ／ 検証機 " + verifier.id + "（条件カード " + verifier.cardId + "）：" + (passed ? "合格" : "不合格"));

  if (questionsThisRound >= MAX_QUESTIONS_PER_ROUND) {
    roundFinished = true;
    setMessage("このラウンドの質問上限（3回）に達しました。推理するか、次のラウンドへ進んでください。");
  } else {
    setMessage("検証が完了しました。あと " + (MAX_QUESTIONS_PER_ROUND - questionsThisRound) + " 回まで質問できます。");
  }
  renderCandidateCount();
  updateControls();
}

function submitGuess() {
  if (gameFinished) {
    setMessage("このゲームは終了しています。「新しい問題を開始」してください。");
    return;
  }

  if (totalQuestions === 0) {
    setMessage("まず検証機に質問し、手がかりを集めてください。", "error");
    return;
  }

  const guess = getFinalGuess();

  if (!validProposal(guess)) {
    setMessage("最終回答の各数字を1～5で入力してください。", "error");
    return;
  }

  if (guess.every((digit, index) => digit === secretCode[index])) {
    gameFinished = true;

    const resultMessage =
      "正解です！ " + currentRound +
      "ラウンド・総質問数" + totalQuestions + "回で暗号を特定しました。";

    setMessage(resultMessage, "success");
    setFinalAnswerResult(resultMessage, "success");

    addLog(
      "正解：" + guess.join("") +
      " ／ " + currentRound +
      "ラウンド・総質問数" + totalQuestions + "回"
    );

    updateControls();
  } else {
    const resultMessage =
      "不正解です。提案コードと検証履歴はそのままです。手がかりを見直して推理を続けましょう。";

    setMessage(resultMessage, "error");
    setFinalAnswerResult(resultMessage, "error");

    addLog("最終回答 " + guess.join("") + " は不正解でした。");
  }
}

// 選択された数（4〜6基）の条件カードから、正解コードだけが残る組み合わせを探す。
// 各判定機には、選んだカードの候補をすべて表示する。
const DIFFICULTY_SETTINGS = {
  beginner: { label: "入門", maxCardId: 17 },
  standard: { label: "標準", maxCardId: 22 },
  advanced: { label: "上級", maxCardId: 48 }
};
// 登録済みの問題集
const FIXED_PROBLEMS = [
  {
    id: "001",
    title: "はじめての暗号",
    difficulty: "beginner",
    secretCode: [1, 1, 1],
    verifiers: [
      { cardId: 1, optionNumber: 1 },
      { cardId: 3, optionNumber: 1 },
      { cardId: 6, optionNumber: 2 },
      { cardId: 12, optionNumber: 2 }
    ]
  },
  {
    id: "002",
    title: "最大の数字の暗号",
    difficulty: "advanced",
    secretCode: [1, 2, 4],
    verifiers: [
      { cardId: 1, optionNumber: 1 },
      { cardId: 30, optionNumber: 3 },
      { cardId: 15, optionNumber: 3 },
      { cardId: 6, optionNumber: 1 }
    ]
  }
];

function getSelectedDifficulty() {
  const selector = document.getElementById("difficulty");
  const key = selector && DIFFICULTY_SETTINGS[selector.value] ? selector.value : "beginner";
  return { key, ...DIFFICULTY_SETTINGS[key] };
}

function getSelectedVerifierCount() {
  const selector = document.getElementById("verifierCount");
  const count = selector ? Number(selector.value) : 4;
  return [4, 5, 6].includes(count) ? count : 4;
}

function renderVerifierCards(count) {
  const grid = document.getElementById("verifierGrid");
  if (!grid) return;
  const symbols = ["▲", "■", "●", "◆", "★", "⬟"];
  grid.replaceChildren();

  for (let index = 0; index < count; index++) {
    const id = String.fromCharCode(65 + index);
    const card = document.createElement("article");
    card.className = "verifier";
    card.innerHTML = `
      <div class="verifier-top"><span>UNIT ${id}</span><span>${symbols[index]}</span></div>
      <div class="orb">${id}</div>
      <p>判定機 ${id}</p>
      <div class="criteria-panel">
        <p class="criteria-heading">POSSIBLE CRITERIA / ${id}</p>
        <div id="criteriaOptions${index}" class="criteria-list">
          <div class="criteria-option">条件候補を準備しています…</div>
        </div>
        <p class="criteria-note">実際に使われている条件は、この候補のうち1つです。</p>
      </div>
      <button class="test-button" data-verifier="${index}">テスト実行</button>
      <div class="result" id="result${index}">未検証</div>
    `;
    grid.appendChild(card);
  }
  grid.style.setProperty("--verifier-count", String(count));
  const countLabel = document.getElementById("verifierCountRule");
  if (countLabel) countLabel.textContent = "判定機：" + count + "基";
}

/**
 * 条件をすべて満たす暗号を列挙する
 */
function countMatchingCodes(entries) {
  return TuringEngine.generateAllCodes().filter(code =>
    entries.every(entry =>
      TuringEngine.evaluate(code, entry.criterion)
    )
  );
}

/**
 * 正解が一意で、どの判定機も必要か検証する
 */
function hasUniqueEssentialSolution(secretCode, entries) {
  if (!TuringEngine.isValidCode(secretCode)) return false;
  if (!Array.isArray(entries) || entries.length === 0) return false;

  // 正解コードがすべての条件を満たしているか
  const allPass = entries.every(entry =>
    TuringEngine.evaluate(secretCode, entry.criterion)
  );

  if (!allPass) return false;

  // すべての条件を使ったとき、正解が1通りだけか
  const matchingCodes = countMatchingCodes(entries);

  if (matchingCodes.length !== 1) return false;

  if (
    matchingCodes[0].some(
      (digit, index) => digit !== secretCode[index]
    )
  ) {
    return false;
  }

  // 判定機を1基ずつ取り除き、正解候補が複数に戻るか確認
  for (let i = 0; i < entries.length; i++) {
    const remainingEntries = entries.filter(
      (_, index) => index !== i
    );

    const remainingCodes = countMatchingCodes(remainingEntries);

    if (remainingCodes.length < 2) {
      return false;
    }
  }

  return true;
}
function findUniqueActiveCriteria(code, maxCardId, verifierCount) {
  const allCodes = TuringEngine.generateAllCodes();

  // 正解コードで合格する条件候補だけを集める
  const passingOptionsByCard = CRITERIA_CARDS
    .filter(card => card.id <= maxCardId)
    .map(card => ({
      card,
      passingOptions: card.options.filter(criterion =>
        TuringEngine.evaluate(code, criterion)
      )
    }))
    .filter(entry => entry.passingOptions.length > 0);

  for (let attempt = 0; attempt < 500; attempt++) {
    let possibleCodes = allCodes;
    const selected = [];
    const usedCardIds = new Set();

    while (selected.length < verifierCount) {
      const slotsAfterThis = verifierCount - selected.length - 1;

      const choices = [];

      for (const entry of passingOptionsByCard) {
        if (usedCardIds.has(entry.card.id)) continue;

        for (const criterion of entry.passingOptions) {
          const filtered = possibleCodes.filter(candidate =>
            TuringEngine.evaluate(candidate, criterion)
          );

          if (filtered.length === 0) continue;

          // 最後の判定機より前に正解が1通りになったら、
          // それ以降の判定機が不要になるため採用しない
          if (slotsAfterThis > 0 && filtered.length < 2) {
            continue;
          }

          // 最後の判定機で正解が1通りになる組み合わせだけを探す
          if (slotsAfterThis === 0 && filtered.length !== 1) {
            continue;
          }

          choices.push({
            card: entry.card,
            criterion,
            filtered,
            remaining: filtered.length
          });
        }
      }

      if (choices.length === 0) break;

      // 候補を絞り込める条件を優先しつつ、少しランダム性を持たせる
      choices.sort((a, b) => a.remaining - b.remaining);

      const bestPool = choices.slice(
        0,
        Math.min(12, choices.length)
      );

      const chosen = bestPool[
        Math.floor(Math.random() * bestPool.length)
      ];

      selected.push({
        card: chosen.card,
        criterion: chosen.criterion
      });

      usedCardIds.add(chosen.card.id);
      possibleCodes = chosen.filtered;
    }

    // 判定機の数がそろい、正解が一意で、
    // どの判定機も必要な場合だけ採用する
    if (
      selected.length === verifierCount &&
      possibleCodes.length === 1 &&
      hasUniqueEssentialSolution(code, selected)
    ) {
      return selected;
    }
  }

  return null;
}

function createVerifierWithActiveCriterion(id, card, activeCriterion) {
  return TuringEngine.createVerifier(id, card, activeCriterion);
}
function renderVerifierOptions() {
  verifiers.forEach((verifier, index) => {
    const container = document.getElementById("criteriaOptions" + index);
    if (!container) return;
    const heading = container.parentElement.querySelector(".criteria-heading");
    if (heading) heading.textContent = "CRITERIA CARD #" + verifier.cardId + " / " + verifier.id;
    container.replaceChildren();
    verifier.options.forEach((criterion, optionIndex) => {
      const item = document.createElement("div");
      item.className = "criteria-option";
      const number = document.createElement("span");
      number.className = "criteria-number";
      number.textContent = (optionIndex + 1) + ".";
      const name = document.createElement("span");
      name.textContent = criterion.name;
      item.append(number, name);
      container.appendChild(item);
    });
  });
}

function startRandomGame() {
  let puzzle = null;
  const difficulty = getSelectedDifficulty();
  const verifierCount = getSelectedVerifierCount();
  for (let attempt = 0; attempt < 120; attempt++) {
    const code = [
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1
    ];
    const activeCriteria = findUniqueActiveCriteria(code, difficulty.maxCardId, verifierCount);
    if (activeCriteria && activeCriteria.length === verifierCount) {
      puzzle = { code, activeCriteria };
      break;
    }
  }
  if (!puzzle) {
    setMessage("この難易度と判定機の数では問題を生成できませんでした。難易度または判定機の数を変更して、もう一度お試しください。", "error");
    return;
  }

  secretCode = [...puzzle.code];
  verifiers = puzzle.activeCriteria.map((entry, index) =>
    createVerifierWithActiveCriterion(String.fromCharCode(65 + index), entry.card, entry.criterion)
  );

  observations = [];
  historyEntries = [];
  currentRound = 1;
  questionsThisRound = 0;
  totalQuestions = 0;
  roundProposal = null;
  askedVerifiersThisRound = new Set();
  roundFinished = false;
  gameFinished = false;

  renderVerifierCards(verifierCount);
  renderVerifierOptions();
["digitA", "digitB", "digitC",
 "finalDigitA", "finalDigitB", "finalDigitC"].forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.value = "1";
    input.disabled = false;
  }
});
  resetVerifierResults();
  resetFinalAnswerResult();
  setMessage("「" + difficulty.label + "」モード・判定機" + verifierCount + "基で新しい問題を生成しました（使用カード：1～" + difficulty.maxCardId + "）。提案コードを決め、判定機に質問してください。");
  renderHistory();
  renderCandidateCount();
  updateControls();
}

// 登録済みの固定問題を開始する
function startFixedProblem() {
  const selector = document.getElementById("problemNumber");
  const problemId = selector.value;

  const problem = FIXED_PROBLEMS.find(
    item => item.id === problemId
  );

  if (!problem) {
    setMessage("この問題番号は登録されていません。", "error");
    return;
  }

  const difficulty = DIFFICULTY_SETTINGS[problem.difficulty];

  if (!difficulty) {
    setMessage("問題の難易度設定が正しくありません。", "error");
    return;
  }

  if (
    !TuringEngine.isValidCode(problem.secretCode) ||
    !Array.isArray(problem.verifiers) ||
    ![4, 5, 6].includes(problem.verifiers.length)
  ) {
    setMessage("問題の登録データに誤りがあります。", "error");
    return;
  }

  let selectedEntries;

  try {
    selectedEntries = problem.verifiers.map(entry => {
      const card = CRITERIA_CARDS.find(
        item => item.id === entry.cardId
      );

      if (!card || card.id > difficulty.maxCardId) {
        throw new Error("条件カード番号が正しくありません。");
      }

      const criterion = card.options[entry.optionNumber - 1];

      if (!criterion) {
        throw new Error("条件番号が正しくありません。");
      }

      return { card, criterion };
    });

    // 正解コードがすべての条件を満たすか確認
    const allPass = selectedEntries.every(entry =>
      TuringEngine.evaluate(problem.secretCode, entry.criterion)
    );

    if (!allPass) {
      throw new Error("正解コードが登録条件を満たしていません。");
    }


    // 正解が一意で、どの判定機も必要か確認
    if (!hasUniqueEssentialSolution(problem.secretCode, selectedEntries)) {
      throw new Error(
        "正解が一意でないか、不要な判定機が含まれています。"
      );
    }

  } catch (error) {
    setMessage("問題の読み込みに失敗しました：" + error.message, "error");
    return;
  }

  // 登録データをゲームに反映
  secretCode = [...problem.secretCode];

  verifiers = selectedEntries.map((entry, index) =>
    createVerifierWithActiveCriterion(
      String.fromCharCode(65 + index),
      entry.card,
      entry.criterion
    )
  );

  document.getElementById("difficulty").value = problem.difficulty;
  document.getElementById("verifierCount").value =
    String(problem.verifiers.length);

  // ゲームの進行状況を初期化
  observations = [];
  historyEntries = [];
  currentRound = 1;
  questionsThisRound = 0;
  totalQuestions = 0;
  roundProposal = null;
  askedVerifiersThisRound = new Set();
  roundFinished = false;
  gameFinished = false;

  // 画面を更新
  renderVerifierCards(verifiers.length);
  renderVerifierOptions();

  [
    "digitA",
    "digitB",
    "digitC",
    "finalDigitA",
    "finalDigitB",
    "finalDigitC"
  ].forEach(id => {
    const input = document.getElementById(id);

    if (input) {
      input.value = "1";
      input.disabled = false;
    }
  });

  resetVerifierResults();
  resetFinalAnswerResult();

  setMessage(
  "問題 " + problem.id + "「" + problem.title +
  "」を開始しました。判定機に質問して正解を推理しましょう。"
);

  renderHistory();
  renderCandidateCount();
  updateControls();
}
// 選択したモードに応じてゲームを開始する
function newGame() {
  const mode = document.getElementById("gameMode").value;

  if (mode === "fixed") {
    startFixedProblem();
  } else {
    startRandomGame();
  }
}


// モードに合わせて設定欄を切り替える
function updateModeControls() {
  const mode = document.getElementById("gameMode").value;
  const isFixedMode = mode === "fixed";

  document.getElementById("problemNumber").disabled = !isFixedMode;
  document.getElementById("difficulty").disabled = isFixedMode;
  document.getElementById("verifierCount").disabled = isFixedMode;
}
function endRoundAndNext() {
  if (gameFinished) return;
  if (questionsThisRound === 0) {
    setMessage("次のラウンドへ進む前に、少なくとも1回は検証してください。", "error");
    return;
  }

  addLog("ラウンド " + currentRound + " 終了 ／ このラウンドの質問数：" + questionsThisRound);
  currentRound += 1;
  questionsThisRound = 0;
  roundProposal = null;
  askedVerifiersThisRound = new Set();
  roundFinished = false;

  ["digitA", "digitB", "digitC"].forEach(id => {
    const input = document.getElementById(id);
    if (input) { input.value = "1"; input.disabled = false; }
  });
  resetVerifierResults();
  setMessage("ラウンド " + currentRound + " です。新しい提案コードを選んでください。過去の検証履歴は残っています。");
  renderCandidateCount();
  updateControls();
}

const verifierGrid = document.getElementById("verifierGrid");
if (verifierGrid) {
  verifierGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-verifier]");
    if (button) testVerifier(Number(button.dataset.verifier));
  });
}
const submitButton = document.getElementById("submitGuess");
if (submitButton) submitButton.addEventListener("click", submitGuess);
const newGameButton = document.getElementById("newGame");
if (newGameButton) newGameButton.addEventListener("click", newGame);
const difficultySelector = document.getElementById("difficulty");
if (difficultySelector) difficultySelector.addEventListener("change", () => {
  const difficulty = getSelectedDifficulty();
  setMessage("難易度を「" + difficulty.label + "」に変更しました。変更を反映するには「新しい問題を開始」を押してください。");
});
const verifierCountSelector = document.getElementById("verifierCount");
if (verifierCountSelector) verifierCountSelector.addEventListener("change", () => {
  setMessage("判定機の数を「" + getSelectedVerifierCount() + "基」に変更しました。変更を反映するには「新しい問題を開始」を押してください。");
});
const nextRoundButton = document.getElementById("nextRound");
if (nextRoundButton) nextRoundButton.addEventListener("click", endRoundAndNext);

// モードを変更したら設定欄を切り替える
document.getElementById("gameMode").addEventListener(
  "change",
  updateModeControls
);

/* ゲームモードカードと既存の選択欄を連動させる */
document.querySelectorAll('input[name="gameModeChoice"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;

    const gameMode = document.getElementById("gameMode");
    gameMode.value = radio.value;

    // 既存のゲームモード変更処理を実行する
    gameMode.dispatchEvent(new Event("change"));

    // 選択中のカードの見た目を更新する
    document.querySelectorAll(".mode-card").forEach((card) => {
      card.classList.toggle(
        "selected",
        card.querySelector('input[name="gameModeChoice"]').checked
      );
    });
  });
});

// 問題集で問題番号を変更したら、その問題を開始する
document.getElementById("problemNumber").addEventListener(
  "change",
  () => {
    if (document.getElementById("gameMode").value === "fixed") {
      newGame();
    }
  }
);

updateModeControls();
newGame();

/* 推理メモのクリアボタン */
const clearMemoButton = document.getElementById("clearMemo");

if (clearMemoButton) {
  clearMemoButton.addEventListener("click", () => {
    const memo = document.getElementById("deductionMemo");

    if (!memo) return;

    memo.value = "";
    memo.focus();
  });
}

