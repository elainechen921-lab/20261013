// =====================================================
// Google Sheets 題庫版 p5.js 選擇題測驗
// =====================================================
//
// 題目字型：LXGW WenKai TC
// 選項與中文內文：Noto Sans TC
// 英文、數字與 A-D 標記：Outfit
//
// Google Sheets 欄位格式：
// question,optionA,optionB,optionC,optionD,answer
//
// answer 可使用：
// 0 或 A = 第一個選項
// 1 或 B = 第二個選項
// 2 或 C = 第三個選項
// 3 或 D = 第四個選項
// =====================================================


// =====================================================
// Google Sheets 發布 CSV 網址
// 請替換成自己的 Google Sheets CSV 發布網址
// =====================================================
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBXN0H63EocbaZJQ3UEl_Dwllk-HJkBGYkLfYxr0hzmumUGOKtoyPyHdWthKiGEGygR70lb7gZe-DL/pub?gid=292180364&single=true&output=csv";


// =====================================================
// 字型名稱
// =====================================================
const FONT_QUESTION = "LXGW WenKai TC";
const FONT_CHINESE = "Noto Sans TC";
const FONT_ENGLISH = "Outfit";


// =====================================================
// 顏色設定
// =====================================================
const BLUE = "#1976D2";
const LIGHT_BACKGROUND = "#F5F5F5";
const RESULT_BACKGROUND = "#EBF5FF";
const QUESTION_BACKGROUND = "#FFF4BF";


// =====================================================
// p5 Instance Mode
// =====================================================
window.createQuizSketch = function (p) {
  // ---------------------------------------------------
  // 題庫資料
  // ---------------------------------------------------
  let allQuestions = [];
  let quizQuestions = [];

  // ---------------------------------------------------
  // 載入狀態
  // ---------------------------------------------------
  let loading = true;
  let loadError = "";

  // ---------------------------------------------------
  // 測驗狀態
  // ---------------------------------------------------
  let currentQuestion = 0;
  let score = 0;
  let answered = false;
  let selectedOption = -1;
  let quizFinished = false;

  // ---------------------------------------------------
  // 虛擬捲動
  // ---------------------------------------------------
  let scrollOffset = 0;
  let contentHeight = 0;
  let maxScroll = 0;

  // ---------------------------------------------------
  // 拖曳判斷
  // ---------------------------------------------------
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerLastY = 0;
  let pointerMoved = false;

  // ---------------------------------------------------
  // 響應式版面
  // ---------------------------------------------------
  let sideMargin = 0;
  let contentWidth = 0;

  let titleSize = 24;
  let questionSize = 22;
  let optionTextSize = 18;
  let buttonTextSize = 18;

  // ---------------------------------------------------
  // 題目欄位資料
  // ---------------------------------------------------
  let questionBox = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    lines: [],
    lineHeight: 0
  };

  // ---------------------------------------------------
  // 選項按鈕資料
  // 畫按鈕與判斷點擊共用這些資料
  // ---------------------------------------------------
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


  // ===================================================
  // 初始化
  // ===================================================
  p.setup = function () {
    p.createCanvas(
      p.windowWidth,
      p.windowHeight
    );

    // 使用字串，避免 instance mode 常數問題
    p.textWrap("word");

    updateLayout();

    // 啟動 Google Sheets 題庫載入
    loadGoogleSheet();
  };


  // ===================================================
  // 載入 Google Sheets CSV
  // ===================================================
  async function loadGoogleSheet() {
    if (
      GOOGLE_SHEET_CSV_URL.includes(
        "你的發布ID"
      )
    ) {
      loading = false;
      loadError =
        "請先將 sketch.js 中的 Google Sheets CSV 網址替換成自己的發布網址。";
      return;
    }

    try {
      const response = await fetch(
        GOOGLE_SHEET_CSV_URL +
        "&cache=" +
        Date.now()
      );

      if (!response.ok) {
        throw new Error(
          "HTTP 狀態碼：" +
          response.status
        );
      }

      const csvText =
        await response.text();

      const rows = parseCSV(csvText);

      if (rows.length < 2) {
        throw new Error(
          "Google Sheets 沒有足夠的題目資料。"
        );
      }

      parseQuestionRows(rows);

      if (allQuestions.length < 5) {
        throw new Error(
          "有效題目少於 5 題。"
        );
      }

      startNewQuiz();
      loading = false;
    } catch (error) {
      console.error(error);

      loading = false;
      loadError =
        "無法讀取 Google Sheets 題庫。\n\n" +
        "請確認：\n" +
        "1. 試算表已發布到網路\n" +
        "2. CSV 網址正確\n" +
        "3. 第一列欄位名稱正確\n" +
        "4. 網路允許跨來源讀取";
    }
  }


  // ===================================================
  // 解析 CSV
  // 支援逗號、雙引號與換行
  // ===================================================
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (
      let i = 0;
      i < text.length;
      i++
    ) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (
        char === '"' &&
        insideQuotes &&
        nextChar === '"'
      ) {
        value += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (
        char === "," &&
        !insideQuotes
      ) {
        row.push(value);
        value = "";
      } else if (
        (char === "\n" ||
          char === "\r") &&
        !insideQuotes
      ) {
        if (
          char === "\r" &&
          nextChar === "\n"
        ) {
          i++;
        }

        row.push(value);
        value = "";

        if (
          row.some(
            cell => cell.trim() !== ""
          )
        ) {
          rows.push(row);
        }

        row = [];
      } else {
        value += char;
      }
    }

    if (
      value !== "" ||
      row.length > 0
    ) {
      row.push(value);
      rows.push(row);
    }

    return rows;
  }


  // ===================================================
  // 解析題目資料
  // ===================================================
  function parseQuestionRows(rows) {
    const headers = rows[0].map(header =>
      header.trim()
    );

    const requiredHeaders = [
      "question",
      "optionA",
      "optionB",
      "optionC",
      "optionD",
      "answer"
    ];

    for (
      const header of requiredHeaders
    ) {
      if (!headers.includes(header)) {
        throw new Error(
          "Google Sheets 缺少欄位：" +
          header
        );
      }
    }

    function columnIndex(name) {
      return headers.indexOf(name);
    }

    allQuestions = [];

    for (
      let i = 1;
      i < rows.length;
      i++
    ) {
      const row = rows[i];

      const question = (
        row[columnIndex("question")] ||
        ""
      ).trim();

      const options = [
        (
          row[columnIndex("optionA")] ||
          ""
        ).trim(),

        (
          row[columnIndex("optionB")] ||
          ""
        ).trim(),

        (
          row[columnIndex("optionC")] ||
          ""
        ).trim(),

        (
          row[columnIndex("optionD")] ||
          ""
        ).trim()
      ];

      const answer = convertAnswer(
        row[columnIndex("answer")]
      );

      if (
        question === "" ||
        options.some(
          option => option === ""
        ) ||
        answer < 0 ||
        answer > 3
      ) {
        continue;
      }

      allQuestions.push({
        question: question,
        options: options,
        answer: answer
      });
    }
  }


  // ===================================================
  // 將答案轉成 0、1、2、3
  // ===================================================
  function convertAnswer(value) {
    const answerText = String(
      value || ""
    )
      .trim()
      .toUpperCase();

    if (answerText === "A") return 0;
    if (answerText === "B") return 1;
    if (answerText === "C") return 2;
    if (answerText === "D") return 3;

    const answerNumber =
      Number(answerText);

    if (
      Number.isInteger(answerNumber) &&
      answerNumber >= 0 &&
      answerNumber <= 3
    ) {
      return answerNumber;
    }

    return -1;
  }


  // ===================================================
  // 開始新測驗
  // 每次隨機抽出不重複的 5 題
  // ===================================================
  function startNewQuiz() {
    quizQuestions = p
      .shuffle(allQuestions.slice())
      .slice(0, 5);

    currentQuestion = 0;
    score = 0;
    answered = false;
    selectedOption = -1;
    quizFinished = false;
    scrollOffset = 0;

    updateLayout();
  }


  // ===================================================
  // 視窗大小改變
  // ===================================================
  p.windowResized = function () {
    p.resizeCanvas(
      p.windowWidth,
      p.windowHeight
    );

    updateLayout();

    scrollOffset = p.constrain(
      scrollOffset,
      -maxScroll,
      0
    );
  };


  // ===================================================
  // 主繪圖函式
  // ===================================================
  p.draw = function () {
    if (loading) {
      drawLoadingPage();
      return;
    }

    if (loadError !== "") {
      drawErrorPage();
      return;
    }

    if (quizFinished) {
      p.background(RESULT_BACKGROUND);
    } else {
      p.background(LIGHT_BACKGROUND);
    }

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


  // ===================================================
  // 載入畫面
  // ===================================================
  function drawLoadingPage() {
    p.background(LIGHT_BACKGROUND);

    p.textFont(FONT_CHINESE);
    p.textStyle("normal");
    p.textAlign("center", "center");
    p.textSize(22);
    p.fill(40);

    p.text(
      "正在讀取 Google Sheets 題庫……",
      p.width / 2,
      p.height / 2
    );
  }


  // ===================================================
  // 錯誤畫面
  // ===================================================
  function drawErrorPage() {
    p.background(255, 245, 245);

    p.textFont(FONT_CHINESE);
    p.textStyle("normal");
    p.textAlign("center", "center");
    p.textSize(19);
    p.fill(170, 0, 0);

    p.text(
      loadError,
      p.width / 2,
      p.height / 2,
      p.width - 40,
      240
    );
  }


  // ===================================================
  // 字型切換
  // ===================================================
  function setQuestionFont() {
    // 題目使用 LXGW WenKai TC
    p.textFont(FONT_QUESTION);
    p.textStyle("normal");
  }

  function setChineseFont() {
    // 選項與中文內文使用 Noto Sans TC
    p.textFont(FONT_CHINESE);
    p.textStyle("normal");
  }

  function setEnglishFont() {
    // 英文與數字使用 Outfit
    p.textFont(FONT_ENGLISH);
    p.textStyle("normal");
  }


  // ===================================================
  // 計算響應式版面
  // ===================================================
  function updateLayout() {
    sideMargin = p.constrain(
      p.width * 0.07,
      16,
      80
    );

    contentWidth = p.min(
      p.width - sideMargin * 2,
      800
    );

    titleSize = p.constrain(
      p.width * 0.055,
      21,
      36
    );

    questionSize = p.constrain(
      p.width * 0.043,
      18,
      28
    );

    optionTextSize = p.constrain(
      p.width * 0.036,
      15,
      22
    );

    buttonTextSize = p.constrain(
      p.width * 0.038,
      15,
      22
    );

    if (quizFinished) {
      updateResultLayout();
    } else if (
      quizQuestions.length > 0
    ) {
      updateQuestionLayout();
    }
  }


  // ===================================================
  // 計算題目頁面版面
  // ===================================================
  function updateQuestionLayout() {
    optionButtons = [];

    const optionX =
      (p.width - contentWidth) / 2;

    const topMargin = p.constrain(
      p.height * 0.06,
      35,
      65
    );

    const progressY =
      topMargin +
      titleSize * 2.2;

    const questionY =
      progressY + 75;

    // 題目文字使用 LXGW WenKai TC
    setQuestionFont();
    p.textSize(questionSize);

    const questionLines =
      wrapText(
        quizQuestions[currentQuestion]
          .question,
        contentWidth - 32,
        FONT_QUESTION,
        questionSize
      );

    const questionLineHeight =
      questionSize * 1.5;

    const questionPadding = 18;

    const questionHeight =
      questionLines.length *
        questionLineHeight +
      questionPadding * 2;

    questionBox = {
      x: optionX,
      y: questionY,
      w: contentWidth,
      h: questionHeight,
      lines: questionLines,
      lineHeight: questionLineHeight
    };

    let optionY =
      questionBox.y +
      questionBox.h +
      25;

    const optionGap = 14;

    // 建立四個選項按鈕
    for (let i = 0; i < 4; i++) {
      const label =
        String.fromCharCode(65 + i) +
        ". " +
        quizQuestions[currentQuestion]
          .options[i];

      const button =
        createOptionButton(
          optionX,
          optionY,
          contentWidth,
          label,
          i
        );

      optionButtons.push(button);

      optionY =
        button.y +
        button.h +
        optionGap;
    }

    // 下一題按鈕
    const actionWidth = p.min(
      contentWidth * 0.55,
      250
    );

    actionButton.x =
      (p.width - actionWidth) / 2;

    actionButton.y =
      optionY + 20;

    actionButton.w = actionWidth;
    actionButton.h = 54;
    actionButton.label = "下一題";

    contentHeight =
      actionButton.y +
      actionButton.h +
      50;

    maxScroll = p.max(
      0,
      contentHeight - p.height
    );
  }


  // ===================================================
  // 計算結果頁面版面
  // ===================================================
  function updateResultLayout() {
    const resultTop =
      p.max(p.height * 0.18, 120);

    const buttonWidth =
      p.min(contentWidth * 0.55, 250);

    retryButton.x =
      (p.width - buttonWidth) / 2;

    retryButton.y =
      resultTop + 220;

    retryButton.w = buttonWidth;
    retryButton.h = 54;
    retryButton.label = "再挑戰一次";

    contentHeight =
      retryButton.y +
      retryButton.h +
      50;

    maxScroll = p.max(
      0,
      contentHeight - p.height
    );
  }


  // ===================================================
  // 建立選項按鈕
  // ===================================================
  function createOptionButton(
    x,
    y,
    w,
    label,
    index
  ) {
    const innerWidth = w - 32;

    const lines =
      wrapText(
        label,
        innerWidth,
        FONT_CHINESE,
        optionTextSize
      );

    const lineHeight =
      optionTextSize * 1.45;

    const h =
      lines.length * lineHeight + 30;

    return {
      x: x,
      y: y,
      w: w,
      h: h,
      label: label,
      lines: lines,
      lineHeight: lineHeight,
      index: index
    };
  }


  // ===================================================
  // 題目頁面
  // ===================================================
  function drawQuestionPage() {
    const data =
      quizQuestions[currentQuestion];

    const topMargin = p.constrain(
      p.height * 0.06,
      35,
      65
    );

    // 標題
    setChineseFont();
    p.textAlign("center", "center");
    p.textSize(titleSize);
    p.fill(30);
    p.noStroke();

    p.text(
      "p5.js 基礎選擇題測驗",
      p.width / 2,
      topMargin
    );

    // 題數
    setChineseFont();
    p.textSize(16);

    p.text(
      "第 " +
        (currentQuestion + 1) +
        " 題 / 共 5 題",
      p.width / 2,
      topMargin + titleSize * 1.5
    );

    // 進度條
    drawProgressBar(
      topMargin + titleSize * 2.1
    );

    // 淺黃色題目欄位
    p.fill(QUESTION_BACKGROUND);
    p.stroke(220, 190, 80);
    p.strokeWeight(1);

    p.rect(
      questionBox.x,
      questionBox.y,
      questionBox.w,
      questionBox.h,
      12
    );

    // 題目：LXGW WenKai TC
    setQuestionFont();
    p.textAlign("left", "top");
    p.textSize(questionSize);
    p.fill(45);
    p.noStroke();

    for (
      let i = 0;
      i < questionBox.lines.length;
      i++
    ) {
      p.text(
        questionBox.lines[i],
        questionBox.x + 16,
        questionBox.y +
          18 +
          i * questionBox.lineHeight
      );
    }

    // 選項
    for (
      let i = 0;
      i < optionButtons.length;
      i++
    ) {
      drawOptionButton(
        optionButtons[i],
        data
      );
    }

    // 作答後顯示下一題
    if (answered) {
      drawButton(
        actionButton,
        actionButton.label,
        BLUE,
        true
      );
    }
  }


  // ===================================================
  // 進度條
  // ===================================================
  function drawProgressBar(y) {
    const barX =
      (p.width - contentWidth) / 2;

    const barW = contentWidth;
    const barH = 20;

    const progress =
      (currentQuestion + 1) /
      quizQuestions.length;

    // 進度條背景
    p.noStroke();
    p.fill(225);

    p.rect(
      barX,
      y,
      barW,
      barH,
      10
    );

    // 已完成部分
    p.fill(BLUE);

    p.rect(
      barX,
      y,
      barW * progress,
      barH,
      10
    );

    // 進度百分比
    setChineseFont();
    p.textAlign("center", "center");
    p.textSize(13);
    p.fill(255);

    p.text(
      Math.round(progress * 100) + "%",
      p.width / 2,
      y + barH / 2
    );
  }


  // ===================================================
  // 選項按鈕
  // ===================================================
  function drawOptionButton(
    button,
    data
  ) {
    let buttonColor =
      p.color(255);

    // 正確答案綠色
    if (
      answered &&
      button.index === data.answer
    ) {
      buttonColor =
        p.color(150, 235, 150);
    }

    // 錯誤答案紅色
    if (
      answered &&
      button.index === selectedOption &&
      button.index !== data.answer
    ) {
      buttonColor =
        p.color(255, 150, 150);
    }

    p.fill(buttonColor);
    p.stroke(110);
    p.strokeWeight(1);

    p.rect(
      button.x,
      button.y,
      button.w,
      button.h,
      9
    );

    // 選項使用 Noto Sans TC
    setChineseFont();
    p.textAlign("left", "center");
    p.textSize(optionTextSize);
    p.fill(0);
    p.noStroke();

    const totalTextHeight =
      button.lines.length *
      button.lineHeight;

    const firstLineY =
      button.y +
      button.h / 2 -
      totalTextHeight / 2 +
      button.lineHeight / 2;

    for (
      let i = 0;
      i < button.lines.length;
      i++
    ) {
      p.text(
        button.lines[i],
        button.x + 16,
        firstLineY +
          i * button.lineHeight
      );
    }
  }


  // ===================================================
  // 結果頁面
  // ===================================================
  function drawResultPage() {
    const resultTop =
      p.max(p.height * 0.18, 120);

    setChineseFont();
    p.textAlign("center", "center");
    p.fill(30);
    p.noStroke();

    p.textSize(titleSize * 1.15);
    p.text(
      "測驗完成",
      p.width / 2,
      resultTop
    );

    // 每題 20 分，滿分 100 分
    p.textSize(questionSize);
    p.text(
      "分數：" +
        score * 20 +
        " / 100",
      p.width / 2,
      resultTop + 75
    );

    p.textSize(optionTextSize);
    p.text(
      "再挑戰一次，讓自己更進步！",
      p.width / 2,
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


  // ===================================================
  // 一般按鈕
  // ===================================================
  function drawButton(
    button,
    label,
    buttonColor,
    whiteText
  ) {
    p.fill(buttonColor);
    p.stroke(80);
    p.strokeWeight(1);

    p.rect(
      button.x,
      button.y,
      button.w,
      button.h,
      9
    );

    p.fill(
      whiteText ? 255 : 0
    );

    setChineseFont();
    p.textAlign("center", "center");
    p.textSize(buttonTextSize);
    p.noStroke();

    p.text(
      label,
      button.x + button.w / 2,
      button.y + button.h / 2
    );
  }


  // ===================================================
  // 自動換行
  // 適合繁體中文，也能處理英文與數字
  // ===================================================
  function wrapText(
    text,
    maxWidth,
    fontName,
    fontSize
  ) {
    p.textFont(fontName);
    p.textStyle("normal");
    p.textSize(fontSize);

    const lines = [];
    let currentLine = "";

    for (
      const character of String(text)
    ) {
      const testLine =
        currentLine + character;

      if (
        currentLine !== "" &&
        p.textWidth(testLine) > maxWidth
      ) {
        lines.push(currentLine);
        currentLine = character;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine !== "") {
      lines.push(currentLine);
    }

    return lines.length > 0
      ? lines
      : [""];
  }


  // ===================================================
  // 滑鼠操作
  // ===================================================
  p.mousePressed = function () {
    pointerMoved = false;

    pointerStartX = p.mouseX;
    pointerStartY = p.mouseY;
    pointerLastY = p.mouseY;
  };

  p.mouseDragged = function () {
    const movementY =
      p.mouseY - pointerLastY;

    if (
      p.abs(p.mouseY - pointerStartY) > 6
    ) {
      pointerMoved = true;
    }

    scrollOffset += movementY;

    scrollOffset = p.constrain(
      scrollOffset,
      -maxScroll,
      0
    );

    pointerLastY = p.mouseY;
  };

  p.mouseReleased = function () {
    if (!pointerMoved) {
      handleClick(
        p.mouseX,
        p.mouseY
      );
    }

    pointerMoved = false;
  };

  p.mouseWheel = function (event) {
    scrollOffset -= event.delta;

    scrollOffset = p.constrain(
      scrollOffset,
      -maxScroll,
      0
    );

    return false;
  };


  // ===================================================
  // 觸控操作
  // ===================================================
  p.touchStarted = function () {
    if (p.touches.length > 0) {
      pointerMoved = false;

      pointerStartX =
        p.touches[0].x;

      pointerStartY =
        p.touches[0].y;

      pointerLastY =
        p.touches[0].y;
    }

    return true;
  };

  p.touchMoved = function () {
    if (p.touches.length > 0) {
      const currentY =
        p.touches[0].y;

      const movementY =
        currentY - pointerLastY;

      if (
        p.abs(currentY - pointerStartY) > 6
      ) {
        pointerMoved = true;
      }

      scrollOffset += movementY;

      scrollOffset = p.constrain(
        scrollOffset,
        -maxScroll,
        0
      );

      pointerLastY = currentY;
    }

    return true;
  };

  p.touchEnded = function () {
    if (!pointerMoved) {
      handleClick(
        pointerStartX,
        pointerStartY
      );
    }

    pointerMoved = false;

    return true;
  };


  // ===================================================
  // 處理點擊
  // ===================================================
  function handleClick(x, y) {
    const contentY =
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
          const button =
            optionButtons[i];

          if (
            isInsideButton(
              button,
              x,
              contentY
            )
          ) {
            selectedOption =
              button.index;

            answered = true;

            // 每題 20 分
            if (
              selectedOption ===
              quizQuestions[currentQuestion]
                .answer
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

        if (
          currentQuestion >=
          quizQuestions.length
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
      if (
        isInsideButton(
          retryButton,
          x,
          contentY
        )
      ) {
        startNewQuiz();
      }
    }
  }


  // ===================================================
  // 判斷點擊是否位於按鈕內
  // ===================================================
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
};