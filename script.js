"use strict";

const TuringEngine = (() => {
  function generateAllCodes() {
    const codes = [];
    for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) for (let c = 1; c <= 5; c++) codes.push([a, b, c]);
    return codes;
  }
  function isValidCode(code) {
    return Array.isArray(code) && code.length === 3 && code.every(n => Number.isInteger(n) && n >= 1 && n <= 5);
  }
  function getDigit(code, position) {
    if (!isValidCode(code)) throw new Error("暗号は1～5の数字を3つ指定してください。");
    if (![0, 1, 2].includes(position)) throw new Error("数字の位置は0、1、2で指定してください。");
    return code[position];
  }
  function evaluate(code, criterion) {
    if (!isValidCode(code)) throw new Error("暗号の形式が正しくありません。");
    switch (criterion.operator) {
      case "equalTo": return getDigit(code, criterion.position) === criterion.value;
      case "greaterThan": return getDigit(code, criterion.position) > criterion.value;
      case "lessThan": return getDigit(code, criterion.position) < criterion.value;
      case "even": return getDigit(code, criterion.position) % 2 === 0;
      case "odd": return getDigit(code, criterion.position) % 2 === 1;
      case "sumGreaterThan": return code.reduce((sum, n) => sum + n, 0) > criterion.value;
      case "sumLessThan": return code.reduce((sum, n) => sum + n, 0) < criterion.value;
      case "allDifferent": return new Set(code).size === 3;
      case "hasDuplicates": return new Set(code).size < 3;
      default: throw new Error("未対応の条件です：" + criterion.operator);
    }
  }
  function createVerifier(id, options) {
    if (!Array.isArray(options) || options.length < 2) throw new Error("検証機には複数の条件候補が必要です。");
    return { id, options, activeIndex: Math.floor(Math.random() * options.length) };
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
      const possibleCriteria = verifier.options.filter(criterion => related.every(observation =>
        evaluate(observation.code, criterion) === observation.passed
      ));
      return possibleCriteria.some(criterion => evaluate(code, criterion));
    }));
  }
  return { generateAllCodes, isValidCode, getDigit, evaluate, createVerifier, askVerifier, filterCriteria, filterCandidates };
})();

const CRITERIA = [
  {name:"三角の数字は1",position:0,operator:"equalTo",value:1},
  {name:"三角の数字は3",position:0,operator:"equalTo",value:3},
  {name:"三角の数字は5",position:0,operator:"equalTo",value:5},
  {name:"三角の数字は3より大きい",position:0,operator:"greaterThan",value:3},
  {name:"三角の数字は3より小さい",position:0,operator:"lessThan",value:3},
  {name:"三角の数字は偶数",position:0,operator:"even"},
  {name:"三角の数字は奇数",position:0,operator:"odd"},
  {name:"四角の数字は2",position:1,operator:"equalTo",value:2},
  {name:"四角の数字は4",position:1,operator:"equalTo",value:4},
  {name:"四角の数字は3より大きい",position:1,operator:"greaterThan",value:3},
  {name:"四角の数字は偶数",position:1,operator:"even"},
  {name:"丸の数字は奇数",position:2,operator:"odd"},
  {name:"3つの数字の合計は9より大きい",operator:"sumGreaterThan",value:9},
  {name:"3つの数字の合計は8より小さい",operator:"sumLessThan",value:8},
  {name:"3つの数字はすべて異なる",operator:"allDifferent"},
  {name:"同じ数字が含まれている",operator:"hasDuplicates"},
  {name:"四角の数字は1",position:1,operator:"equalTo",value:1},
  {name:"四角の数字は3",position:1,operator:"equalTo",value:3},
  {name:"四角の数字は5",position:1,operator:"equalTo",value:5},
  {name:"丸の数字は1",position:2,operator:"equalTo",value:1},
  {name:"丸の数字は2",position:2,operator:"equalTo",value:2},
  {name:"丸の数字は3",position:2,operator:"equalTo",value:3},
  {name:"丸の数字は4",position:2,operator:"equalTo",value:4},
  {name:"丸の数字は5",position:2,operator:"equalTo",value:5}
];

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
function validProposal(code) { return TuringEngine.isValidCode(code); }

function setMessage(message, kind = "") {
  const element = document.getElementById("message");
  if (!element) return;
  element.textContent = message;
  element.classList.remove("error", "success");
  if (kind) element.classList.add(kind);
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
  [0, 1, 2, 3].forEach(index => {
    const result = document.getElementById("result" + index);
    if (result) {
      result.textContent = "未検証";
      result.classList.remove("pass", "fail");
    }
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
    " ／ 検証機 " + verifier.id + "：" + (passed ? "合格" : "不合格"));

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
  const guess = getProposal();
  if (!validProposal(guess)) {
    setMessage("各数字に1～5を入力してください。", "error");
    return;
  }
  if (guess.every((digit, index) => digit === secretCode[index])) {
    gameFinished = true;
    setMessage("正解です！ " + currentRound + "ラウンド・総質問数" + totalQuestions + "回で暗号を特定しました。", "success");
    addLog("正解：" + guess.join("") + " ／ " + currentRound + "ラウンド・総質問数" + totalQuestions + "回");
    updateControls();
  } else {
    setMessage("不正解です。検証履歴を見直して、次のラウンドで推理を続けましょう。", "error");
    addLog("最終回答 " + guess.join("") + " は不正解でした。");
  }
}

// 4つの条件を同時に満たすコードが、正解1通りになる組み合わせを探す。
function findUniqueActiveCriteria(code) {
  const allCodes = TuringEngine.generateAllCodes();
  const matchingCriteria = CRITERIA.filter(criterion => TuringEngine.evaluate(code, criterion));

  function search(startIndex, selected, possibleCodes) {
    if (selected.length === 4) return possibleCodes.length === 1 ? selected : null;
    const needed = 4 - selected.length;
    for (let i = startIndex; i <= matchingCriteria.length - needed; i++) {
      const criterion = matchingCriteria[i];
      const filteredCodes = possibleCodes.filter(candidate => TuringEngine.evaluate(candidate, criterion));
      const secretStillPossible = filteredCodes.some(candidate =>
        candidate.every((digit, index) => digit === code[index])
      );
      if (!secretStillPossible) continue;
      const result = search(i + 1, [...selected, criterion], filteredCodes);
      if (result) return result;
    }
    return null;
  }
  return search(0, [], allCodes);
}

function createVerifierWithActiveCriterion(id, activeCriterion) {
  const otherCriteria = CRITERIA.filter(criterion => criterion !== activeCriterion);
  const distractors = [...otherCriteria].sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [activeCriterion, ...distractors].sort(() => Math.random() - 0.5);
  const verifier = TuringEngine.createVerifier(id, options);
  verifier.activeIndex = options.indexOf(activeCriterion);
  return verifier;
}
function renderVerifierOptions() {
  verifiers.forEach((verifier, index) => {
    const container = document.getElementById("criteriaOptions" + index);
    if (!container) return;
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

function newGame() {
  let puzzle = null;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = [
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1
    ];
    const activeCriteria = findUniqueActiveCriteria(code);
    if (activeCriteria && activeCriteria.length === 4) {
      puzzle = { code, activeCriteria };
      break;
    }
  }
  if (!puzzle) {
    setMessage("問題を生成できませんでした。もう一度お試しください。", "error");
    return;
  }

  secretCode = [...puzzle.code];
  verifiers = puzzle.activeCriteria.map((criterion, index) =>
    createVerifierWithActiveCriterion(String.fromCharCode(65 + index), criterion)
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

  renderVerifierOptions();
  ["digitA", "digitB", "digitC"].forEach(id => {
    const input = document.getElementById(id);
    if (input) { input.value = "1"; input.disabled = false; }
  });
  resetVerifierResults();
  setMessage("新しい問題を生成しました。提案コードを決め、検証機に質問してください。");
  renderHistory();
  renderCandidateCount();
  updateControls();
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

document.querySelectorAll("[data-verifier]").forEach(button => {
  button.addEventListener("click", () => testVerifier(Number(button.dataset.verifier)));
});
const submitButton = document.getElementById("submitGuess");
if (submitButton) submitButton.addEventListener("click", submitGuess);
const newGameButton = document.getElementById("newGame");
if (newGameButton) newGameButton.addEventListener("click", newGame);
const nextRoundButton = document.getElementById("nextRound");
if (nextRoundButton) nextRoundButton.addEventListener("click", endRoundAndNext);

newGame();
