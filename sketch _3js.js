// =====================================================
// p5.js 網頁與 p5.js 基礎選擇題測驗
// instance mode；題庫由 questions.csv 載入
// 每次開始或再挑戰一次，從 15 題隨機抽出不重複的 5 題
// =====================================================

window.createQuizSketch = function (p) {
  // ---------------------------------------------------
  // 字型與顏色
  // ---------------------------------------------------
  const FONT_BODY = "Noto Sans TC";
  const FONT_NUMBER = "Outfit";
  const BLUE = "#1976D2";
  const BLUE_DARK = "#125ca5";
  const LIGHT_BACKGROUND = "#F5F7FB";
  const RESULT_BACKGROUND = "#EBF5FF";
  const TEXT_COLOR = "#172033";
  const MUTED_COLOR = "#5B6578";
  const BORDER_COLOR = "#CBD5E1";
  const CORRECT_COLOR = "#B9E8C1";
  const WRONG_COLOR = "#FFC4C4";

  // ---------------------------------------------------
  // CSV 與測驗狀態
  // ---------------------------------------------------
  let questionTable = null;
  let questionPool = [];
  let quizQuestions = [];
  let loadError = "";
  let quizReady = false;

  let currentQuestion = 0;
  let score = 0;
  let answered = false;
  let selectedOption = -1;
  let quizFinished = false;

  // ---------------------------------------------------
  // 虛擬捲動與指標狀態
  // ---------------------------------------------------
  let scrollOffset = 0;
  let contentHeight = 0;
  let maxScroll = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerLastY = 0;
  let pointerMoved = false;
  let lastTouchTime = -1000;

  // ---------------------------------------------------
  // 響應式版面與按鈕位置
  // ---------------------------------------------------
  let contentWidth = 0;
  let sideMargin = 0;
  let titleSize = 24;
  let questionSize = 20;
  let optionTextSize = 18;
  let buttonTextSize = 18;
  let optionButtons = [];

  // 畫按鈕與判斷點擊共用下列位置資料。
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

  // ---------------------------------------------------
  // p5 preload：用 p.loadTable 讀取 questions.csv
  // ---------------------------------------------------
  p.preload = function () {
    questionTable = p.loadTable(
      "questions.csv",
      "csv",
      "header",
      function () {
        // 成功後在 setup() 統一解析，避免不同 p5 版本的時序差異。
      },
      function () {
        loadError = "無法載入 questions.csv，請確認檔案與 index.html 位於同一個資料夾。";
      }
    );
  };

  // ---------------------------------------------------
  // 初始化
  // ---------------------------------------------------
  p.setup = function () {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    p.textWrap(p.CHAR);
    setBodyFont();

    parseQuestionTable();

    if (!loadError && questionPool.length >= 5) {
      quizReady = true;
      beginQuiz();
    } else if (!loadError) {
      loadError = "題庫至少需要 5 筆完整資料，目前可用題目不足。";
    }

    updateLayout();
  };

  // ---------------------------------------------------
  // 將 CSV 每一列轉成題目物件
  // ---------------------------------------------------
  function parseQuestionTable() {
    if (!questionTable || questionTable.getRowCount() === 0) {
      if (!loadError) {
        loadError = "questions.csv 沒有可讀取的題目。";
      }
      return;
    }

    const fields = ["question", "optionA", "optionB", "optionC", "optionD", "answer"];

    for (let rowIndex = 0; rowIndex < questionTable.getRowCount(); rowIndex += 1) {
      const row = questionTable.getRow(rowIndex);
      const values = fields.map(function (field) {
        return String(row.get(field) || "").trim();
      });
      const answer = Number.parseInt(values[5], 10);

      if (
        values.slice(0, 5).every(function (value) { return value.length > 0; }) &&
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer <= 3
      ) {
        questionPool.push({
          question: values[0],
          options: [values[1], values[2], values[3], values[4]],
          answer: answer
        });
      }
    }
  }

  // ---------------------------------------------------
  // Fisher-Yates 洗牌，確保抽出的 5 題不重複
  // ---------------------------------------------------
  function pickFiveQuestions() {
    const shuffled = questionPool.slice();

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(p.random(i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled.slice(0, 5);
  }

  // ---------------------------------------------------
  // 開始或重新開始測驗
  // ---------------------------------------------------
  function beginQuiz() {
    if (questionPool.length < 5) {
      return;
    }

    quizQuestions = pickFiveQuestions();
    currentQuestion = 0;
    score = 0;
    answered = false;
    selectedOption = -1;
    quizFinished = false;
    scrollOffset = 0;
    updateLayout();
  }

  // ---------------------------------------------------
  // 視窗縮放與手機轉向
  // ---------------------------------------------------
  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    updateLayout();
    scrollOffset = p.constrain(scrollOffset, -maxScroll, 0);
  };

  // ---------------------------------------------------
  // 主繪圖函式
  // ---------------------------------------------------
  p.draw = function () {
    if (loadError || !quizReady) {
      p.background(LIGHT_BACKGROUND);
      drawStatusPage();
      return;
    }

    p.background(quizFinished ? RESULT_BACKGROUND : LIGHT_BACKGROUND);
    updateLayout();

    p.push();
    p.translate(0, scrollOffset);

    if (quizFinished) {
      drawResultPage();
    } else {
      drawQuestionPage();
    }

    p.pop();
  };

  // ---------------------------------------------------
  // 字型設定
  // ---------------------------------------------------
  function setBodyFont() {
    // Noto Sans TC 含繁體中文字形，避免 Outfit 單獨使用時缺字。
    p.textFont(FONT_BODY);
    p.textStyle(p.NORMAL);
  }

  // ---------------------------------------------------
  // 計算響應式版面
  // ---------------------------------------------------
  function updateLayout() {
    sideMargin = p.constrain(p.width * 0.07, 16, 80);
    contentWidth = p.min(p.width - sideMargin * 2, 820);

    titleSize = p.constrain(p.width * 0.055, 21, 36);
    questionSize = p.constrain(p.width * 0.043, 16, 25);
    optionTextSize = p.constrain(p.width * 0.036, 14, 21);
    buttonTextSize = p.constrain(p.width * 0.038, 15, 22);

    if (quizFinished) {
      updateResultLayout();
    } else {
      updateQuestionLayout();
    }
  }

  // ---------------------------------------------------
  // 題目頁面版面
  // ---------------------------------------------------
  function updateQuestionLayout() {
    optionButtons = [];

    const optionX = (p.width - contentWidth) / 2;
    const optionHeight = p.constrain(p.width * 0.17, 58, 74);
    const optionGap = p.constrain(p.width * 0.035, 10, 18);
    const topMargin = p.constrain(p.height * 0.055, 30, 60);
    const questionAreaHeight = p.constrain(p.height * 0.16, 105, 145);
    const optionStartY = topMargin + titleSize * 2.25 + questionAreaHeight;

    for (let i = 0; i < 4; i += 1) {
      optionButtons.push({
        x: optionX,
        y: optionStartY + i * (optionHeight + optionGap),
        w: contentWidth,
        h: optionHeight
      });
    }

    const lastOption = optionButtons[optionButtons.length - 1];
    const actionWidth = p.min(contentWidth * 0.56, 260);
    const actionHeight = p.constrain(p.width * 0.14, 50, 62);

    actionButton.x = (p.width - actionWidth) / 2;
    actionButton.y = lastOption.y + lastOption.h + 30;
    actionButton.w = actionWidth;
    actionButton.h = actionHeight;
    actionButton.label = "下一題";

    contentHeight = actionButton.y + actionButton.h + 44;
    maxScroll = p.max(0, contentHeight - p.height);
  }

  // ---------------------------------------------------
  // 結果頁面版面
  // ---------------------------------------------------
  function updateResultLayout() {
    const resultTop = p.max(p.height * 0.18, 120);
    const buttonWidth = p.min(contentWidth * 0.56, 260);
    const buttonHeight = p.constrain(p.width * 0.14, 50, 62);

    retryButton.x = (p.width - buttonWidth) / 2;
    retryButton.y = resultTop + 205;
    retryButton.w = buttonWidth;
    retryButton.h = buttonHeight;
    retryButton.label = "再挑戰一次";

    contentHeight = retryButton.y + retryButton.h + 44;
    maxScroll = p.max(0, contentHeight - p.height);
  }

  // ---------------------------------------------------
  // 錯誤或載入狀態頁面，避免失敗時整個畫布空白
  // ---------------------------------------------------
  function drawStatusPage() {
    setBodyFont();
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(TEXT_COLOR);
    p.noStroke();
    p.textSize(p.constrain(p.width * 0.055, 20, 30));
    p.text("題庫載入中或發生問題", p.width / 2, p.height * 0.35);

    p.textSize(p.constrain(p.width * 0.035, 14, 18));
    p.fill(MUTED_COLOR);
    p.text(loadError || "正在載入 questions.csv...", p.width / 2, p.height * 0.48, p.width * 0.84, 120);
  }

  // ---------------------------------------------------
  // 題目頁面
  // ---------------------------------------------------
  function drawQuestionPage() {
    const data = quizQuestions[currentQuestion];
    const topMargin = p.constrain(p.height * 0.055, 30, 60);
    const questionX = (p.width - contentWidth) / 2;
    const questionY = topMargin + titleSize * 2.15;
    const questionAreaHeight = p.constrain(p.height * 0.16, 105, 145);

    setBodyFont();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(titleSize);
    p.fill(TEXT_COLOR);
    p.noStroke();
    p.text("p5.js 基礎選擇題測驗", p.width / 2, topMargin);

    // 題數中的數字用 Outfit，其餘中文仍由 Noto Sans TC 顯示。
    setBodyFont();
    p.textSize(p.constrain(optionTextSize * 0.86, 14, 18));
    p.fill(MUTED_COLOR);
    p.text("第 " + (currentQuestion + 1) + " 題 / 共 " + quizQuestions.length + " 題", p.width / 2, topMargin + titleSize * 1.48);

    setBodyFont();
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(questionSize);
    p.textStyle(p.BOLD);
    p.fill(TEXT_COLOR);
    p.text(data.question, questionX, questionY, contentWidth, questionAreaHeight);
    p.textStyle(p.NORMAL);

    for (let i = 0; i < optionButtons.length; i += 1) {
      const button = optionButtons[i];
      let buttonColor = p.color(255);

      if (answered && i === data.answer) {
        buttonColor = p.color(CORRECT_COLOR);
      }

      if (answered && i === selectedOption && i !== data.answer) {
        buttonColor = p.color(WRONG_COLOR);
      }

      const label = String.fromCharCode(65 + i) + ". " + data.options[i];
      drawButton(button, label, buttonColor, false);
    }

    if (answered) {
      drawButton(actionButton, actionButton.label, BLUE, true, true);
    }
  }

  // ---------------------------------------------------
  // 完成頁面
  // ---------------------------------------------------
  function drawResultPage() {
    const resultTop = p.max(p.height * 0.18, 120);

    setBodyFont();
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(TEXT_COLOR);
    p.noStroke();

    p.textStyle(p.BOLD);
    p.textSize(titleSize * 1.15);
    p.text("測驗完成", p.width / 2, resultTop);

    p.textStyle(p.NORMAL);
    p.textSize(questionSize);
    p.text("分數：" + score + " / " + quizQuestions.length, p.width / 2, resultTop + 76);

    p.textSize(optionTextSize);
    p.text("再挑戰一次，讓自己更進步！", p.width / 2, resultTop + 136);

    drawButton(retryButton, retryButton.label, BLUE, true, true);
  }

  // ---------------------------------------------------
  // 畫按鈕；位置資料也會用於點擊判斷
  // ---------------------------------------------------
  function drawButton(button, label, buttonColor, whiteText, centered) {
    const radius = p.constrain(p.min(p.width, p.height) * 0.018, 6, 14);

    p.stroke(BORDER_COLOR);
    p.strokeWeight(1);
    p.fill(buttonColor);
    p.rect(button.x, button.y, button.w, button.h, radius);

    setBodyFont();
    p.textStyle(p.NORMAL);
    p.textSize(buttonTextSize);
    p.fill(whiteText ? 255 : TEXT_COLOR);
    p.noStroke();

    if (centered) {
      p.textAlign(p.CENTER, p.CENTER);
      p.text(label, button.x + button.w / 2, button.y + button.h / 2);
    } else {
      p.textAlign(p.LEFT, p.CENTER);
      p.text(label, button.x + 16, button.y + button.h / 2, button.w - 32, button.h - 10);
    }
  }

  // ---------------------------------------------------
  // 滑鼠與觸控共用的拖曳起點
  // ---------------------------------------------------
  function pointerDown(x, y) {
    pointerMoved = false;
    pointerStartX = x;
    pointerStartY = y;
    pointerLastY = y;
  }

  function pointerMove(y) {
    const movementY = y - pointerLastY;

    if (Math.abs(y - pointerStartY) > 6) {
      pointerMoved = true;
    }

    scrollOffset += movementY;
    scrollOffset = p.constrain(scrollOffset, -maxScroll, 0);
    pointerLastY = y;
  }

  function pointerUp(x, y) {
    if (!pointerMoved) {
      handleClick(x, y);
    }
    pointerMoved = false;
  }

  // ---------------------------------------------------
  // 滑鼠事件
  // ---------------------------------------------------
  p.mousePressed = function () {
    if (p.millis() - lastTouchTime < 500) {
      return false;
    }
    pointerDown(p.mouseX, p.mouseY);
    return false;
  };

  p.mouseDragged = function () {
    if (p.millis() - lastTouchTime < 500) {
      return false;
    }
    pointerMove(p.mouseY);
    return false;
  };

  p.mouseReleased = function () {
    if (p.millis() - lastTouchTime < 500) {
      return false;
    }
    pointerUp(p.mouseX, p.mouseY);
    return false;
  };

  p.mouseWheel = function (event) {
    scrollOffset -= event.delta;
    scrollOffset = p.constrain(scrollOffset, -maxScroll, 0);
    return false;
  };

  // ---------------------------------------------------
  // 觸控事件
  // ---------------------------------------------------
  p.touchStarted = function () {
    lastTouchTime = p.millis();
    if (p.touches.length > 0) {
      pointerDown(p.touches[0].x, p.touches[0].y);
    }
    return false;
  };

  p.touchMoved = function () {
    lastTouchTime = p.millis();
    if (p.touches.length > 0) {
      pointerMove(p.touches[0].y);
    }
    return false;
  };

  p.touchEnded = function () {
    lastTouchTime = p.millis();
    pointerUp(pointerStartX, pointerStartY);
    return false;
  };

  // ---------------------------------------------------
  // 統一處理點擊
  // ---------------------------------------------------
  function handleClick(x, y) {
    if (!quizReady) {
      return;
    }

    // 內容已由 translate(0, scrollOffset) 移動，需換回內容座標。
    const contentY = y - scrollOffset;

    if (!quizFinished) {
      if (!answered) {
        for (let i = 0; i < optionButtons.length; i += 1) {
          if (isInsideButton(optionButtons[i], x, contentY)) {
            selectedOption = i;
            answered = true;

            if (selectedOption === quizQuestions[currentQuestion].answer) {
              score += 1;
            }
            return;
          }
        }
      } else if (isInsideButton(actionButton, x, contentY)) {
        currentQuestion += 1;
        answered = false;
        selectedOption = -1;
        scrollOffset = 0;

        if (currentQuestion >= quizQuestions.length) {
          quizFinished = true;
        }

        updateLayout();
      }
    } else if (isInsideButton(retryButton, x, contentY)) {
      beginQuiz();
    }
  }

  // ---------------------------------------------------
  // 所有按鈕共用的點擊判斷
  // ---------------------------------------------------
  function isInsideButton(button, x, y) {
    return (
      x >= button.x &&
      x <= button.x + button.w &&
      y >= button.y &&
      y <= button.y + button.h
    );
  }
};
