// =====================================================
// p5.js 響應式選擇題測驗
// 可直接貼到 p5.js Editor 執行
//
// 內文：Noto Sans TC
// 題目：Noto Serif TC 明體粗體
// =====================================================


// -----------------------------------------------------
// 字型設定
// -----------------------------------------------------
const FONT_BODY = "Noto Sans TC";
const FONT_QUESTION = "Noto Serif TC";


// -----------------------------------------------------
// 題目資料
// answer 使用 0、1、2、3 分別代表 A、B、C、D
// -----------------------------------------------------
let questions = [
  {
    question: "1. HTML 中，通常使用哪個標籤載入 p5.js？",
    options: [
      '<script src="p5.js"></script>',
      '<link href="p5.js">',
      '<img src="p5.js">',
      '<canvas src="p5.js">'
    ],
    answer: 0
  },
  {
    question: "2. p5.js 用來建立畫布的函式是哪一個？",
    options: [
      "createCanvas()",
      "makeCanvas()",
      "newCanvas()",
      "setupCanvas()"
    ],
    answer: 0
  },
  {
    question: "3. p5.js 的 setup() 函式通常會執行幾次？",
    options: [
      "每秒 60 次",
      "只執行一次",
      "每秒 30 次",
      "不會自動執行"
    ],
    answer: 1
  },
  {
    question: "4. p5.js 中，哪個函式可以偵測滑鼠按下？",
    options: [
      "mouseClick()",
      "mouseDown()",
      "mousePressed()",
      "clickMouse()"
    ],
    answer: 2
  },
  {
    question: "5. p5.js 中，哪個函式可以設定背景顏色？",
    options: [
      "fill()",
      "color()",
      "background()",
      "setBackground()"
    ],
    answer: 2
  }
];


// -----------------------------------------------------
// 測驗狀態
// -----------------------------------------------------
let currentQuestion = 0;  // 目前題目編號
let score = 0;            // 目前分數
let answered = false;     // 是否已作答
let selectedOption = -1; // 使用者選擇的選項
let quizFinished = false; // 是否完成測驗


// -----------------------------------------------------
// 虛擬捲動相關變數
// -----------------------------------------------------
let scrollOffset = 0;
let contentHeight = 0;
let maxScroll = 0;

// 判斷使用者是點擊還是拖曳
let pointerStartX = 0;
let pointerStartY = 0;
let pointerLastY = 0;
let pointerMoved = false;


// -----------------------------------------------------
// 按鈕位置資料
// 畫按鈕與判斷點擊共用這些資料
// -----------------------------------------------------
let optionButtons = [];

let actionButton = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  label: "下一題"
};

let retryButton = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  label: "再挑戰一次"
};


// -----------------------------------------------------
// 響應式版面變數
// -----------------------------------------------------
let contentWidth;
let sideMargin;

let titleSize;
let questionSize;
let optionTextSize;
let buttonTextSize;


// -----------------------------------------------------
// 顏色設定
// -----------------------------------------------------
const BLUE = "#1976D2";
const LIGHT_BACKGROUND = "#F5F5F5";
const RESULT_BACKGROUND = "#EBF5FF";


// -----------------------------------------------------
// 初始化
// -----------------------------------------------------
function setup() {
  // 畫布等於視窗大小
  createCanvas(windowWidth, windowHeight);

  // 預設使用內文字型
  textFont(FONT_BODY);
  textStyle(NORMAL);

  // 允許文字自動換行
  textWrap(WORD);

  // 建立初始版面
  updateLayout();
}


// -----------------------------------------------------
// 視窗大小改變時執行
// 包含桌機縮放與手機轉向
// -----------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // 重新計算版面
  updateLayout();

  // 限制捲動位置
  scrollOffset = constrain(
    scrollOffset,
    -maxScroll,
    0
  );
}


// -----------------------------------------------------
// 主繪圖函式
// -----------------------------------------------------
function draw() {
  if (quizFinished) {
    background(RESULT_BACKGROUND);
  } else {
    background(LIGHT_BACKGROUND);
  }

  // 重新計算響應式版面
  updateLayout();

  // 移動虛擬內容
  push();
  translate(0, scrollOffset);

  if (quizFinished) {
    drawResultPage();
  } else {
    drawQuestionPage();
  }

  pop();
}


// -----------------------------------------------------
// 計算響應式版面
// -----------------------------------------------------
function updateLayout() {
  // 左右留白
  sideMargin = constrain(
    width * 0.07,
    16,
    80
  );

  // 限制內容最大寬度
  contentWidth = min(
    width - sideMargin * 2,
    800
  );

  // 文字大小
  titleSize = constrain(
    width * 0.055,
    21,
    36
  );

  questionSize = constrain(
    width * 0.043,
    16,
    25
  );

  optionTextSize = constrain(
    width * 0.036,
    14,
    21
  );

  buttonTextSize = constrain(
    width * 0.038,
    15,
    22
  );

  if (quizFinished) {
    updateResultLayout();
  } else {
    updateQuestionLayout();
  }
}


// -----------------------------------------------------
// 計算題目頁面版面
// -----------------------------------------------------
function updateQuestionLayout() {
  optionButtons = [];

  let optionX =
    (width - contentWidth) / 2;

  // 選項按鈕高度與間距
  let optionHeight = constrain(
    height * 0.075,
    48,
    66
  );

  let optionGap = constrain(
    height * 0.022,
    10,
    22
  );

  // 頁面上方留白
  let topMargin = constrain(
    height * 0.06,
    35,
    65
  );

  // 題目區域高度
  let questionAreaHeight = constrain(
    height * 0.16,
    90,
    145
  );

  // 第一個選項的位置
  let optionStartY =
    topMargin +
    titleSize * 2.2 +
    questionAreaHeight;

  // 建立四個選項按鈕
  for (let i = 0; i < 4; i++) {
    optionButtons.push({
      x: optionX,
      y: optionStartY + i * (optionHeight + optionGap),
      w: contentWidth,
      h: optionHeight
    });
  }

  // 計算下一題按鈕
  let actionWidth = min(
    contentWidth * 0.55,
    250
  );

  let actionHeight = constrain(
    height * 0.075,
    48,
    62
  );

  let lastOption =
    optionButtons[optionButtons.length - 1];

  actionButton.x =
    (width - actionWidth) / 2;

  actionButton.y =
    lastOption.y +
    lastOption.h +
    35;

  actionButton.w = actionWidth;
  actionButton.h = actionHeight;
  actionButton.label = "下一題";

  // 計算內容高度
  contentHeight =
    actionButton.y +
    actionButton.h +
    50;

  // 計算可捲動距離
  maxScroll = max(
    0,
    contentHeight - height
  );
}


// -----------------------------------------------------
// 計算結果頁面版面
// -----------------------------------------------------
function updateResultLayout() {
  let centerX = width / 2;

  let resultTop = max(
    height * 0.18,
    120
  );

  let buttonWidth = min(
    contentWidth * 0.55,
    250
  );

  let buttonHeight = constrain(
    height * 0.075,
    48,
    62
  );

  // 最後一頁只保留一個再挑戰一次按鈕
  retryButton.x =
    centerX - buttonWidth / 2;

  retryButton.y =
    resultTop + 210;

  retryButton.w = buttonWidth;
  retryButton.h = buttonHeight;
  retryButton.label = "再挑戰一次";

  // 計算結果頁高度
  contentHeight =
    retryButton.y +
    retryButton.h +
    50;

  maxScroll = max(
    0,
    contentHeight - height
  );
}


// -----------------------------------------------------
// 畫出題目頁面
// -----------------------------------------------------
function drawQuestionPage() {
  let data = questions[currentQuestion];

  let topMargin = constrain(
    height * 0.06,
    35,
    65
  );

  // ------------------------------
  // 標題：Noto Sans TC
  // ------------------------------
  textFont(FONT_BODY);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  textSize(titleSize);
  fill(30);
  noStroke();

  text(
    "p5.js 基礎選擇題測驗",
    width / 2,
    topMargin
  );

  // ------------------------------
  // 題數：Noto Sans TC
  // ------------------------------
  textFont(FONT_BODY);
  textStyle(NORMAL);
  textSize(
    constrain(optionTextSize * 0.85, 14, 18)
  );

  text(
    "第 " +
      (currentQuestion + 1) +
      " 題 / 共 " +
      questions.length +
      " 題",
    width / 2,
    topMargin + titleSize * 1.5
  );

  // ------------------------------
  // 題目：Noto Serif TC 明體粗體
  // ------------------------------
  let questionX =
    (width - contentWidth) / 2;

  let questionY =
    topMargin + titleSize * 2.1;

  let questionAreaHeight = constrain(
    height * 0.16,
    90,
    145
  );

  textFont(FONT_QUESTION);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  textSize(questionSize);
  fill(0);

  text(
    data.question,
    questionX,
    questionY,
    contentWidth,
    questionAreaHeight
  );

  // ------------------------------
  // 選項：Noto Sans TC
  // ------------------------------
  textFont(FONT_BODY);
  textStyle(NORMAL);

  for (
    let i = 0;
    i < optionButtons.length;
    i++
  ) {
    let button = optionButtons[i];

    let buttonColor = color(255);

    // 正確答案變綠色
    if (
      answered &&
      i === data.answer
    ) {
      buttonColor = color(
        150,
        235,
        150
      );
    }

    // 使用者選錯的答案變紅色
    if (
      answered &&
      i === selectedOption &&
      i !== data.answer
    ) {
      buttonColor = color(
        255,
        150,
        150
      );
    }

    let optionLabel =
      String.fromCharCode(65 + i) +
      ". " +
      data.options[i];

    drawButton(
      button,
      optionLabel,
      buttonColor,
      false
    );
  }

  // 作答後顯示下一題按鈕
  if (answered) {
    drawButton(
      actionButton,
      actionButton.label,
      BLUE,
      true
    );
  }
}


// -----------------------------------------------------
// 畫出最後結果頁面
// 內文使用 Noto Sans TC
// -----------------------------------------------------
function drawResultPage() {
  let resultTop = max(
    height * 0.18,
    120
  );

  textFont(FONT_BODY);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  fill(30);
  noStroke();

  // 顯示測驗完成
  textSize(titleSize * 1.15);
  text(
    "測驗完成",
    width / 2,
    resultTop
  );

  // 顯示分數
  textSize(questionSize);
  text(
    "分數：" +
      score +
      " / " +
      questions.length,
    width / 2,
    resultTop + 75
  );

  // 顯示鼓勵文字
  textSize(optionTextSize);
  text(
    "再挑戰一次，讓自己更進步！",
    width / 2,
    resultTop + 135
  );

  // 唯一的再挑戰一次按鈕
  drawButton(
    retryButton,
    retryButton.label,
    BLUE,
    true
  );
}


// -----------------------------------------------------
// 畫出按鈕
// 按鈕文字使用 Noto Sans TC
// -----------------------------------------------------
function drawButton(
  button,
  label,
  buttonColor,
  whiteText
) {
  let radius = constrain(
    min(width, height) * 0.018,
    6,
    14
  );

  stroke(90);
  strokeWeight(1);
  fill(buttonColor);

  rect(
    button.x,
    button.y,
    button.w,
    button.h,
    radius
  );

  if (whiteText) {
    fill(255);
  } else {
    fill(0);
  }

  textFont(FONT_BODY);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  textSize(buttonTextSize);
  noStroke();

  text(
    label,
    button.x + button.w / 2,
    button.y + button.h / 2
  );
}


// -----------------------------------------------------
// 滑鼠按下
// -----------------------------------------------------
function mousePressed() {
  pointerMoved = false;

  pointerStartX = mouseX;
  pointerStartY = mouseY;
  pointerLastY = mouseY;
}


// -----------------------------------------------------
// 滑鼠拖曳
// -----------------------------------------------------
function mouseDragged() {
  let movementY =
    mouseY - pointerLastY;

  // 超過 6 像素才算拖曳
  if (
    abs(mouseY - pointerStartY) > 6
  ) {
    pointerMoved = true;
  }

  scrollOffset += movementY;

  scrollOffset = constrain(
    scrollOffset,
    -maxScroll,
    0
  );

  pointerLastY = mouseY;
}


// -----------------------------------------------------
// 滑鼠放開
// -----------------------------------------------------
function mouseReleased() {
  // 沒有拖曳才判定為點擊
  if (!pointerMoved) {
    handleClick(mouseX, mouseY);
  }

  pointerMoved = false;
}


// -----------------------------------------------------
// 觸控開始
// -----------------------------------------------------
function touchStarted() {
  if (touches.length > 0) {
    pointerMoved = false;

    pointerStartX = touches[0].x;
    pointerStartY = touches[0].y;
    pointerLastY = touches[0].y;
  }

  return true;
}


// -----------------------------------------------------
// 觸控拖曳
// -----------------------------------------------------
function touchMoved() {
  if (touches.length > 0) {
    let currentY = touches[0].y;

    let movementY =
      currentY - pointerLastY;

    if (
      abs(currentY - pointerStartY) > 6
    ) {
      pointerMoved = true;
    }

    scrollOffset += movementY;

    scrollOffset = constrain(
      scrollOffset,
      -maxScroll,
      0
    );

    pointerLastY = currentY;
  }

  return true;
}


// -----------------------------------------------------
// 觸控結束
// -----------------------------------------------------
function touchEnded() {
  // 沒有拖曳才判定為點擊
  if (!pointerMoved) {
    handleClick(
      pointerStartX,
      pointerStartY
    );
  }

  pointerMoved = false;

  return true;
}


// -----------------------------------------------------
// 處理點擊
// -----------------------------------------------------
function handleClick(x, y) {
  // 將畫面座標轉換成內容座標
  let contentY =
    y - scrollOffset;

  // 題目頁面
  if (!quizFinished) {
    // 尚未作答時判斷選項
    if (!answered) {
      for (
        let i = 0;
        i < optionButtons.length;
        i++
      ) {
        let button =
          optionButtons[i];

        if (
          isInsideButton(
            button,
            x,
            contentY
          )
        ) {
          selectedOption = i;
          answered = true;

          // 答對時增加分數
          if (
            selectedOption ===
            questions[currentQuestion].answer
          ) {
            score++;
          }

          return;
        }
      }
    }

    // 已作答時判斷下一題
    else if (
      isInsideButton(
        actionButton,
        x,
        contentY
      )
    ) {
      currentQuestion++;

      // 題目全部完成
      if (
        currentQuestion >=
        questions.length
      ) {
        quizFinished = true;
      }

      answered = false;
      selectedOption = -1;
      scrollOffset = 0;

      updateLayout();
    }
  }

  // 結果頁面
  else {
    // 只判斷「再挑戰一次」按鈕
    if (
      isInsideButton(
        retryButton,
        x,
        contentY
      )
    ) {
      currentQuestion = 0;
      score = 0;
      answered = false;
      selectedOption = -1;
      quizFinished = false;
      scrollOffset = 0;

      updateLayout();
    }
  }
}


// -----------------------------------------------------
// 判斷點擊是否在按鈕內
// 所有按鈕共用這個函式
// -----------------------------------------------------
function isInsideButton(
  button,
  x,
  y
) {
  return (
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h
  );
}

