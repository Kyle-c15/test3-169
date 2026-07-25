(() => {
  "use strict";

  const QUESTIONS = window.QUESTION_BANK || [];
  const STORAGE_KEY = "nutrition-master-progress-v2";
  const PAGE_SIZE = 36;
  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const TIPS = {
    "磷": "留意血清无机磷、钙磷比和 RNI/UL 这组数值。",
    "镁": "镁缺乏偏向神经肌肉兴奋性亢进，过量则偏向反射减弱和肌麻痹。",
    "铁": "铁题常考吸收部位、血红素与非血红素、评价指标和缺铁分期。",
    "锌": "锌和生长、蛋白质合成、免疫功能联系紧密。",
    "硒": "硒重点记住克山病、GSH-Px、RNI/UL 和地域土壤差异。",
    "铬、碘与其他矿物质": "矿物质题先分清元素的作用、价态、缺乏表现和评价指标。",
    "维生素总论": "脂溶性易储存、易蓄积；水溶性通常易排出，B12 是例外。",
    "维生素 A": "维生素 A 记住暗适应、毕脱氏斑和过量的致畸风险。",
    "维生素 D": "维生素 D 的活性形式、25-(OH)-D3 评价和钙磷代谢是主线。",
    "维生素 E": "维生素 E 是脂质抗氧化剂，常与维生素 C、硒的协同关系一起考。",
    "维生素 B1": "B1 抓住 TPP、两类关键反应和干湿性脚气病。",
    "维生素 B2": "B2 对应 FMN/FAD，缺乏典型累及眼、口腔和皮肤。",
    "烟酸": "烟酸缺乏的三 D 和烟酸当量换算是高频考点。",
    "泛酸": "泛酸的核心是辅酶 A 和酰基载体蛋白。",
    "维生素 B6": "B6 以 PLP 形式参与氨基酸、血红素和神经递质代谢。",
    "生物素": "生蛋清中的抗生物素蛋白会阻碍吸收，加热可以破坏它。",
    "叶酸": "叶酸连接一碳代谢、巨幼红细胞贫血和神经管畸形。",
    "维生素 B12": "B12 记住内因子、回肠吸收、神经损害和动物性来源。",
    "维生素 C": "维生素 C 既抗氧化，也促进铁吸收和胶原蛋白形成。"
  };

  const $ = (id) => document.getElementById(id);
  const unique = (items) => [...new Set(items)];
  const blankRecord = () => ({ selected: [], submitted: false, correct: false, bookmarked: false, attempts: 0 });

  const loadProgress = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  };

  const state = {
    view: "practice",
    chapter: "全部",
    type: "all",
    index: 0,
    mapPage: 0,
    progress: loadProgress()
  };

  function recordFor(id) {
    if (!state.progress[id]) state.progress[id] = blankRecord();
    return state.progress[id];
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
      $("syncText").textContent = "刚刚已保存";
      window.clearTimeout(saveProgress.timer);
      saveProgress.timer = window.setTimeout(() => { $("syncText").textContent = "本地自动保存"; }, 1800);
    } catch {
      $("syncText").textContent = "本地保存不可用";
    }
  }

  function filteredQuestions() {
    return QUESTIONS.filter((question) => {
      const chapterMatch = state.chapter === "全部" || question.category === state.chapter;
      const typeMatch = state.type === "all" || question.type === state.type;
      if (state.view === "wrong") return chapterMatch && typeMatch && recordFor(question.id).submitted && !recordFor(question.id).correct;
      if (state.view === "bookmarks") return chapterMatch && typeMatch && recordFor(question.id).bookmarked;
      return chapterMatch && typeMatch;
    });
  }

  function currentQuestion() {
    const list = filteredQuestions();
    if (!list.length) return null;
    state.index = Math.max(0, Math.min(state.index, list.length - 1));
    return list[state.index];
  }

  function allStats() {
    const records = QUESTIONS.map((question) => recordFor(question.id));
    const submitted = records.filter((record) => record.submitted);
    return {
      completed: submitted.length,
      correct: submitted.filter((record) => record.correct).length,
      wrong: submitted.filter((record) => record.submitted && !record.correct).length,
      bookmarks: records.filter((record) => record.bookmarked).length
    };
  }

  function renderNavigation() {
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
    const stats = allStats();
    $("wrongCount").textContent = stats.wrong;
    $("bookmarkCount").textContent = stats.bookmarks;
    const titles = { practice: "章节练习", wrong: "错题复习", bookmarks: "重点收藏" };
    $("pageTitle").textContent = titles[state.view];
  }

  function renderFilters() {
    const categories = unique(QUESTIONS.map((question) => question.category));
    const container = $("chapterFilters");
    container.innerHTML = ["全部", ...categories].map((category) => `<button class="filter-chip${state.chapter === category ? " is-selected" : ""}" data-chapter="${category}" type="button">${category}</button>`).join("");
    container.querySelectorAll("[data-chapter]").forEach((button) => button.addEventListener("click", () => {
      state.chapter = button.dataset.chapter;
      state.index = 0;
      state.mapPage = 0;
      render();
    }));
    $("modeSelect").value = state.type;
    $("modeSelect").onchange = (event) => {
      state.type = event.target.value;
      state.index = 0;
      state.mapPage = 0;
      render();
    };
    $("poolLabel").textContent = `${filteredQuestions().length} 道题`;
  }

  function renderMetrics() {
    const stats = allStats();
    const total = QUESTIONS.length;
    const accuracy = stats.completed ? `${Math.round(stats.correct / stats.completed * 100)}%` : "--";
    $("completedNumber").textContent = stats.completed;
    $("totalNumber").textContent = `/ ${total}`;
    $("accuracyNumber").textContent = accuracy;
    $("reviewNumber").textContent = stats.wrong;
    const percent = total ? Math.round(stats.completed / total * 100) : 0;
    $("overallPercent").textContent = `${percent}%`;
    $("progressBar").style.width = `${percent}%`;
    const list = filteredQuestions();
    const listRecords = list.map((question) => recordFor(question.id));
    const done = listRecords.filter((record) => record.submitted).length;
    const correct = listRecords.filter((record) => record.submitted && record.correct).length;
    const wrong = listRecords.filter((record) => record.submitted && !record.correct).length;
    const sessionPercent = list.length ? Math.round(done / list.length * 100) : 0;
    $("sessionPercent").textContent = `${sessionPercent}%`;
    $("sessionBar").style.width = `${sessionPercent}%`;
    $("railDone").textContent = done;
    $("railCorrect").textContent = correct;
    $("railWrong").textContent = wrong;
  }

  function renderQuestion() {
    const list = filteredQuestions();
    const question = currentQuestion();
    const empty = !question;
    $("questionCard").hidden = empty;
    $("emptyState").hidden = !empty;
    if (empty) {
      const title = state.view === "wrong" ? "错题已经清空" : state.view === "bookmarks" ? "还没有收藏题" : "当前筛选没有题目";
      const text = state.view === "wrong" ? "继续保持，错题会在答错后自动归入这里。" : state.view === "bookmarks" ? "把容易混淆的题收藏起来，集中复习。" : "换一个章节或题型试试。";
      $("emptyTitle").textContent = title;
      $("emptyText").textContent = text;
      $("submitButton").hidden = true;
      return;
    }
    const record = recordFor(question.id);
    const submitted = record.submitted;
    $("chapterTag").textContent = question.category;
    $("typeTag").textContent = question.type === "single" ? "单选题" : "多选题";
    $("questionKicker").textContent = `QUESTION ${String(state.index + 1).padStart(2, "0")}`;
    $("questionSource").textContent = question.source;
    $("questionStem").textContent = question.stem;
    $("questionHint").textContent = question.type === "multiple" ? "多选题 · 请选择全部正确选项后提交" : "单选题 · 选择后立即判断正误";
    $("memoryTip").textContent = TIPS[question.category] || "先判断题型，再抓数字、指标和因果方向。";
    $("bookmarkButton").classList.toggle("is-saved", record.bookmarked);
    $("bookmarkIcon").textContent = record.bookmarked ? "★" : "☆";
    $("bookmarkText").textContent = record.bookmarked ? "已收藏" : "收藏";
    $("optionsList").innerHTML = question.options.map((option, optionIndex) => {
      const checked = record.selected.includes(optionIndex) ? " checked" : "";
      const disabled = submitted ? " disabled" : "";
      return `<div class="option" data-option="${optionIndex}"><input id="${question.id}-${optionIndex}" name="${question.id}" type="${question.type === "single" ? "radio" : "checkbox"}" value="${optionIndex}"${checked}${disabled}><label for="${question.id}-${optionIndex}"><span class="option-letter">${LETTERS[optionIndex]}</span><span>${option}</span></label></div>`;
    }).join("");
    const options = $("optionsList");
    options.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => onSelect(question, Number(input.value))));
    renderOptionStates(question, record);
    renderFeedback(question, record);
    $("submitButton").hidden = question.type !== "multiple" || submitted;
    $("submitButton").disabled = !record.selected.length;
    $("prevButton").disabled = state.index === 0;
    $("nextButton").disabled = state.index >= list.length - 1;
    $("saveStatus").textContent = submitted ? (record.correct ? "已记录 · 答对" : "已记录 · 加入错题") : (question.type === "single" ? "选择后立即判分" : "选择全部答案后提交");
  }

  function renderOptionStates(question, record) {
    if (!record.submitted) return;
    const answerSet = new Set(question.answer);
    document.querySelectorAll("#optionsList .option").forEach((option) => {
      const index = Number(option.dataset.option);
      const selected = record.selected.includes(index);
      if (answerSet.has(index)) option.classList.add(selected ? "is-correct" : "is-missed");
      else if (selected) option.classList.add("is-wrong");
    });
  }

  function renderFeedback(question, record) {
    const feedback = $("feedback");
    feedback.hidden = !record.submitted;
    feedback.classList.toggle("is-wrong", record.submitted && !record.correct);
    if (!record.submitted) return;
    $("feedbackIcon").textContent = record.correct ? "✓" : "!";
    $("feedbackTitle").textContent = record.correct ? "回答正确" : "需要复习";
    $("feedbackText").textContent = record.correct ? "这个知识点已经答对，再巩固一次解释即可。" : `正确答案：${question.answer.map((index) => LETTERS[index]).join("、")}。已自动加入错题复习。`;
    $("explanation").textContent = question.explanation;
  }

  function renderMap() {
    const list = filteredQuestions();
    const start = state.mapPage * PAGE_SIZE;
    const visible = list.slice(start, start + PAGE_SIZE);
    $("questionMap").innerHTML = visible.map((question, offset) => {
      const record = recordFor(question.id);
      const classes = ["map-button", state.index === start + offset ? "is-current" : "", record.submitted ? "is-done" : "", record.submitted && !record.correct ? "is-wrong" : ""].filter(Boolean).join(" ");
      return `<button class="${classes}" data-map-index="${start + offset}" type="button">${start + offset + 1}</button>`;
    }).join("");
    $("mapCount").textContent = `${list.length} 道`;
    $("mapRange").textContent = list.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, list.length)}` : "0–0";
    $("mapPrev").disabled = state.mapPage === 0;
    $("mapNext").disabled = start + PAGE_SIZE >= list.length;
    $("questionMap").querySelectorAll("[data-map-index]").forEach((button) => button.addEventListener("click", () => { state.index = Number(button.dataset.mapIndex); renderQuestion(); renderMap(); }));
  }

  function onSelect(question, optionIndex) {
    const record = recordFor(question.id);
    if (record.submitted) return;
    if (question.type === "single") record.selected = [optionIndex];
    else record.selected = [...new Set(record.selected.includes(optionIndex) ? record.selected.filter((index) => index !== optionIndex) : [...record.selected, optionIndex])].sort((a, b) => a - b);
    if (question.type === "single") submitAnswer(question);
    else {
      $("submitButton").disabled = !record.selected.length;
      saveProgress();
    }
    renderQuestion();
    renderNavigation();
    renderMetrics();
    renderMap();
  }

  function submitAnswer(question) {
    const record = recordFor(question.id);
    if (record.submitted || !record.selected.length) return;
    record.submitted = true;
    record.attempts += 1;
    record.correct = record.selected.length === question.answer.length && record.selected.every((value, index) => value === question.answer[index]);
    saveProgress();
  }

  function moveQuestion(delta) {
    const list = filteredQuestions();
    if (!list.length) return;
    state.index = Math.max(0, Math.min(list.length - 1, state.index + delta));
    state.mapPage = Math.floor(state.index / PAGE_SIZE);
    renderQuestion();
    renderMap();
  }

  function render() {
    renderNavigation();
    renderFilters();
    renderMetrics();
    renderQuestion();
    renderMap();
  }

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    state.index = 0;
    state.mapPage = 0;
    render();
  }));
  $("prevButton").addEventListener("click", () => moveQuestion(-1));
  $("nextButton").addEventListener("click", () => moveQuestion(1));
  $("submitButton").addEventListener("click", () => {
    const question = currentQuestion();
    if (question) { submitAnswer(question); render(); }
  });
  $("bookmarkButton").addEventListener("click", () => {
    const question = currentQuestion();
    if (!question) return;
    const record = recordFor(question.id);
    record.bookmarked = !record.bookmarked;
    saveProgress();
    render();
  });
  $("mapPrev").addEventListener("click", () => { state.mapPage -= 1; state.index = state.mapPage * PAGE_SIZE; renderQuestion(); renderMap(); });
  $("mapNext").addEventListener("click", () => { state.mapPage += 1; state.index = state.mapPage * PAGE_SIZE; renderQuestion(); renderMap(); });
  $("resetProgress").addEventListener("click", () => {
    if (!window.confirm("确定清空所有答题、错题和收藏记录吗？")) return;
    state.progress = {};
    state.index = 0;
    state.mapPage = 0;
    saveProgress();
    render();
  });

  render();
})();
