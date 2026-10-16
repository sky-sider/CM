"use strict";

/* =========================================
   Turing Machine風ゲーム：判定エンジン
   数字は1～5、暗号は3桁
========================================= */

const TuringEngine = (() => {
  // すべての暗号125通りを作る
  function generateAllCodes() {
    const codes = [];

    for (let a = 1; a <= 5; a++) {
      for (let b = 1; b <= 5; b++) {
        for (let c = 1; c <= 5; c++) {
          codes.push([a, b, c]);
        }
      }
    }

    return codes;
  }

  // 暗号が正しい形式か確認する
  function isValidCode(code) {
    return (
      Array.isArray(code) &&
      code.length === 3 &&
      code.every(
        n => Number.isInteger(n) && n >= 1 && n <= 5
      )
    );
  }

  // 数字の位置を取得する
  // 0 = 三角、1 = 四角、2 = 丸
  function getDigit(code, position) {
    if (!isValidCode(code)) {
      throw new Error("暗号は1～5の数字を3つ指定してください。");
    }

    if (![0, 1, 2].includes(position)) {
      throw new Error("数字の位置は0、1、2で指定してください。");
    }

    return code[position];
  }

  // 条件を判定する
  function evaluate(code, criterion) {
  if (!isValidCode(code)) {
    throw new Error("暗号の形式が正しくありません。");
  }

  switch (criterion.operator) {
    case "equalTo":
      return getDigit(code, criterion.position) === criterion.value;

    case "greaterThan":
      return getDigit(code, criterion.position) > criterion.value;

    case "lessThan":
      return getDigit(code, criterion.position) < criterion.value;

    case "even":
      return getDigit(code, criterion.position) % 2 === 0;

    case "odd":
      return getDigit(code, criterion.position) % 2 === 1;

    case "sumGreaterThan":
      return code.reduce((sum, n) => sum + n, 0) > criterion.value;

    case "sumLessThan":
      return code.reduce((sum, n) => sum + n, 0) < criterion.value;

    case "allDifferent":
      return new Set(code).size === 3;

    case "hasDuplicates":
      return new Set(code).size < 3;

    default:
      throw new Error("未対応の条件です：" + criterion.operator);
  }
}

  // 1つの検証機が持つ条件候補を作る
  function createVerifier(id, options) {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error("検証機には複数の条件候補が必要です。");
    }

    return {
      id,
      options,
      activeIndex: Math.floor(Math.random() * options.length)
    };
  }

  // 検証機に暗号を提示して合否を取得する
  function askVerifier(code, verifier) {
    const criterion = verifier.options[verifier.activeIndex];

    return evaluate(code, criterion);
  }

  // 観察結果と矛盾する条件候補を除外する
  // observations の各要素：
  // { code: [1, 2, 3], passed: true }
  function filterCriteria(options, observations) {
    return options.filter(criterion =>
      observations.every(observation =>
        evaluate(observation.code, criterion) === observation.passed
      )
    );
  }

  // 観察結果に合わない暗号を候補から除外する
  // observations の各要素：
  // { verifierId: "A", code: [1, 2, 3], passed: true }
  //
  // verifierOptions の各要素：
  // { id: "A", options: [...] } 
function filterCandidates(codes, observations, verifierOptions) {
  return codes.filter(code =>
    verifierOptions.every(verifier => {
      const related = observations.filter(
        observation => observation.verifierId === verifier.id
      );

if (related.length === 0) {
  return true;
}

      // 検証履歴と矛盾しない条件候補だけを残す
      const possibleCriteria = verifier.options.filter(criterion =>
        related.every(observation =>
          evaluate(observation.code, criterion) === observation.passed
        )
      );

      // 残った条件候補のうち、少なくとも1つを
      // この暗号が満たしていれば候補として残す
      return possibleCriteria.some(criterion =>
        evaluate(code, criterion)
      );
    })
  );
}

  return {
    generateAllCodes,
    isValidCode,
    getDigit,
    evaluate,
    createVerifier,
    askVerifier,
    filterCriteria,
    filterCandidates
  };
})();


/* =========================================
   条件データ
========================================= */

const CRITERIA = [
  {
    name: "三角の数字は1",
    position: 0,
    operator: "equalTo",
    value: 1
  },
  {
    name: "三角の数字は3",
    position: 0,
    operator: "equalTo",
    value: 3
  },
  {
    name: "三角の数字は5",
    position: 0,
    operator: "equalTo",
    value: 5
  },
  {
    name: "三角の数字は3より大きい",
    position: 0,
    operator: "greaterThan",
    value: 3
  },
  {
    name: "三角の数字は3より小さい",
    position: 0,
    operator: "lessThan",
    value: 3
  },
  {
    name: "三角の数字は偶数",
    position: 0,
    operator: "even"
  },
  {
    name: "三角の数字は奇数",
    position: 0,
    operator: "odd"
  },
  {
    name: "四角の数字は2",
    position: 1,
    operator: "equalTo",
    value: 2
  },
  {
    name: "四角の数字は4",
    position: 1,
    operator: "equalTo",
    value: 4
  },
  {
    name: "四角の数字は3より大きい",
    position: 1,
    operator: "greaterThan",
    value: 3
  },
  {
    name: "四角の数字は偶数",
    position: 1,
    operator: "even"
  },
  {
    name: "丸の数字は奇数",
    position: 2,
    operator: "odd"
  },
  {
    name: "3つの数字の合計は9より大きい",
    operator: "sumGreaterThan",
    value: 9
  },
  {
    name: "3つの数字の合計は8より小さい",
    operator: "sumLessThan",
    value: 8
  },
  {
    name: "3つの数字はすべて異なる",
    operator: "allDifferent"
  },
{
  name: "同じ数字が含まれている",
  operator: "hasDuplicates"
},
{
  name: "四角の数字は1",
  position: 1,
  operator: "equalTo",
  value: 1
},
{
  name: "四角の数字は3",
  position: 1,
  operator: "equalTo",
  value: 3
},
{
  name: "四角の数字は5",
  position: 1,
  operator: "equalTo",
  value: 5
},
{
  name: "丸の数字は1",
  position: 2,
  operator: "equalTo",
  value: 1
},
{
  name: "丸の数字は2",
  position: 2,
  operator: "equalTo",
  value: 2
},
{
  name: "丸の数字は3",
  position: 2,
  operator: "equalTo",
  value: 3
},
{
  name: "丸の数字は4",
  position: 2,
  operator: "equalTo",
  value: 4
},
{
  name: "丸の数字は5",
  position: 2,
  operator: "equalTo",
  value: 5
}
];


/* =========================================
   既存画面との接続
========================================= */

let secretCode = [];
let verifiers = [];
let observations = [];
let historyEntries = [];

function getProposal() {
  const a = document.getElementById("digitA");
  const b = document.getElementById("digitB");
  const c = document.getElementById("digitC");

  if (!a || !b || !c) return null;

  return [Number(a.value), Number(b.value), Number(c.value)];
}

function validProposal(code) {
  return TuringEngine.isValidCode(code);
}

function setMessage(message) {
  const element = document.getElementById("message");
  if (element) element.textContent = message;
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
    history.textContent = "まだ検証結果はありません。";
    return;
  }

  historyEntries.forEach(message => {
    const item = document.createElement("p");
    item.textContent = message;
    history.appendChild(item);
  });
}

// 各検証機について、現在残っている条件候補を調べる
function getRemainingCriteria(verifier) {
  const related = observations.filter(
    observation => observation.verifierId === verifier.id
  );

  return TuringEngine.filterCriteria(verifier.options, related);
}

// 現在の暗号候補数を表示する
function renderCandidateCount() {
  const candidates = TuringEngine.filterCandidates(
    TuringEngine.generateAllCodes(),
    observations,
    verifiers
  );

  let panel = document.getElementById("candidateCount");

  if (!panel) {
    panel = document.createElement("p");
    panel.id = "candidateCount";

    const history = document.getElementById("history");
    if (history && history.parentElement) {
      history.parentElement.appendChild(panel);
    }
  }

  panel.textContent =
    "現在の暗号候補：" + candidates.length + "通り";
}

function testVerifier(index) {
  const code = getProposal();

  if (!validProposal(code)) {
    setMessage("各数字に1～5を入力してください。");
    return;
  }

  const verifier = verifiers[index];

  if (!verifier) {
    setMessage("検証機が見つかりません。");
    return;
  }

  const passed = TuringEngine.askVerifier(code, verifier);

  observations.push({
    verifierId: verifier.id,
    code: [...code],
    passed
  });

  const result = document.getElementById("result" + index);

  if (result) {
    result.textContent = passed ? "PASS ✓" : "FAIL ✕";
    result.classList.remove("pass", "fail");
    result.classList.add(passed ? "pass" : "fail");
  }

  const label = String.fromCharCode(65 + index);
  const codeText = code.join("");

  addLog(
    "コード " + codeText +
    " ／ 検証機 " + label +
    "：" + (passed ? "合格" : "不合格")
  );

  renderCandidateCount();

  setMessage(
    "検証が完了しました。結果を手がかりに暗号を推理しましょう。"
  );
}

function submitGuess() {
  const guess = getProposal();

  if (!validProposal(guess)) {
    setMessage("各数字に1～5を入力してください。");
    return;
  }

  if (guess.every((digit, index) => digit === secretCode[index])) {
    setMessage("正解です！暗号を特定しました！");
    addLog("暗号を正しく特定しました。");
  } else {
    setMessage("不正解です。検証結果をもう一度確認しましょう。");
    addLog("提出したコード " + guess.join("") + " は不正解でした。");
  }
}


/* =========================================
   一意に解ける問題を生成するための処理
========================================= */

// 指定したコードを正解とする、3つの条件を探す
function findUniqueActiveCriteria(code) {
  const allCodes = TuringEngine.generateAllCodes();

  // 正解コードが満たしている条件だけを集める
  const matchingCriteria = CRITERIA.filter(criterion =>
    TuringEngine.evaluate(code, criterion)
  );

  // 条件を3つずつ組み合わせて調べる
  for (let i = 0; i < matchingCriteria.length - 2; i++) {
    for (let j = i + 1; j < matchingCriteria.length - 1; j++) {
      for (let k = j + 1; k < matchingCriteria.length; k++) {
        const selected = [
          matchingCriteria[i],
          matchingCriteria[j],
          matchingCriteria[k]
        ];

        // 3つの条件をすべて満たすコードを探す
        const solutions = allCodes.filter(candidate =>
          selected.every(criterion =>
            TuringEngine.evaluate(candidate, criterion)
          )
        );

        // 解が1通りで、それが指定したコードなら採用
        if (
          solutions.length === 1 &&
          solutions[0].every(
            (digit, index) => digit === code[index]
          )
        ) {
          return selected;
        }
      }
    }
  }

  return null;
}

// 条件候補の中に、実際に使う条件を混ぜる
function createVerifierWithActiveCriterion(id, activeCriterion) {
  const otherCriteria = CRITERIA.filter(
    criterion => criterion !== activeCriterion
  );

  // 本当の条件以外から2つ選ぶ
  const distractors = [...otherCriteria]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  // 3候補の順番をランダムにする
  const options = [activeCriterion, ...distractors]
    .sort(() => Math.random() - 0.5);

  const verifier = TuringEngine.createVerifier(id, options);

  // 実際に使う条件の位置を正しく設定する
  verifier.activeIndex = options.indexOf(activeCriterion);

  return verifier;
}

function renderVerifierOptions() {
  verifiers.forEach((verifier, index) => {
    const container = document.getElementById(
      "criteriaOptions" + index
    );

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
  // 一意に解ける正解コードと条件を探す
  let puzzle = null;

  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = [
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1,
      Math.floor(Math.random() * 5) + 1
    ];

    const activeCriteria = findUniqueActiveCriteria(code);

    if (activeCriteria) {
      puzzle = { code, activeCriteria };
      break;
    }
  }

  // 通常はここに到達する前に問題が見つかる
  if (!puzzle) {
    setMessage("問題を生成できませんでした。もう一度お試しください。");
    return;
  }

  secretCode = [...puzzle.code];

  // 各検証機に、本当の条件を1つずつ割り当てる
  verifiers = puzzle.activeCriteria.map((criterion, index) =>
    createVerifierWithActiveCriterion(
      String.fromCharCode(65 + index),
      criterion
    )
  );

  // 画面に3つずつの条件候補を表示する
  renderVerifierOptions();

  // 検証履歴をリセット
  observations = [];
  historyEntries = [];

  ["digitA", "digitB", "digitC"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "1";
  });

  [0, 1, 2].forEach(index => {
    const result = document.getElementById("result" + index);

    if (result) {
      result.textContent = "未検証";
      result.classList.remove("pass", "fail");
    }
  });

  setMessage(
    "新しい問題を生成しました。条件候補と検証結果から暗号を推理してください。"
  );

  renderHistory();
  renderCandidateCount();
}

// 画面上のボタンに処理を登録する
document.querySelectorAll("[data-verifier]").forEach(button => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.verifier);
    testVerifier(index);
  });
});

const submitButton = document.getElementById("submitGuess");
if (submitButton) {
  submitButton.addEventListener("click", submitGuess);
}

const newGameButton = document.getElementById("newGame");
if (newGameButton) {
  newGameButton.addEventListener("click", newGame);
}

// ゲーム開始
newGame();