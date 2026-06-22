
const App = {
  mode: null, words: [], current: 0, score: 0, total: 0,
  streak: 0, bestStreak: 0, answered: false, settings: {},
  
  init() {
    this.settings = JSON.parse(localStorage.getItem("kaoyanSettings") || '{"sound":true,"level":0,"count":10}');
    this.loadStats();
    this.render();
  },

  loadStats() {
    const d = JSON.parse(localStorage.getItem("kaoyanStats") || '{"total":0,"correct":0,"streak":0,"games":0}');
    this.bestStreak = d.streak;
    this.stats = d;
  },

  saveStats() {
    localStorage.setItem("kaoyanStats", JSON.stringify(this.stats));
  },

  getFilteredWords() {
    let ws = WORD_BANK;
    if (this.settings.level > 0) ws = ws.filter(w => w.level === this.settings.level);
    return [...ws];
  },

  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  speak(text, cb) {
    if (!this.settings.sound) { if (cb) cb(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.onend = cb || null;
    u.onerror = cb || null;
    window.speechSynthesis.speak(u);
  },

  showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
  },

  render() {
    this.renderHome();
    this.renderStats();
  },

  renderHome() {
    const modes = [
      { id:"quiz", icon:"\u{1F3AF}", name:"选择题", desc:"看英文选中文含义", color:"#6C63FF" },
      { id:"flashcard", icon:"\u{1F0CF}", name:"闪卡", desc:"翻转卡片记忆单词", color:"#FF6584" },
      { id:"spelling", icon:"\u270D\uFE0F", name:"拼写", desc:"看中文拼英文单词", color:"#4ADE80" },
      { id:"listening", icon:"\u{1F3A7}", name:"听力", desc:"听发音选正确单词", color:"#FFD700" },
    ];
    document.getElementById("modeList").innerHTML = modes.map(m => 
      '<div class="mode-card slide-up" onclick="App.startGame(\'' + m.id + '\')">' +
        '<div class="icon">' + m.icon + '</div>' +
        '<div class="name">' + m.name + '</div>' +
        '<div class="desc">' + m.desc + '</div>' +
      '</div>'
    ).join("");
    document.getElementById("wordCount").textContent = "\u{1F4DA} 词库: " + WORD_BANK.length + " 词";
  },

  renderStats() {
    document.getElementById("statTotal").textContent = this.stats.total;
    document.getElementById("statRate").textContent = this.stats.total > 0 ? Math.round(this.stats.correct / this.stats.total * 100) + "%" : "0%";
    document.getElementById("statStreak").textContent = this.bestStreak;
    document.getElementById("statGames").textContent = this.stats.games;
  },

  startGame(mode) {
    this.mode = mode;
    this.current = 0;
    this.score = 0;
    this.total = 0;
    this.streak = 0;
    this.answered = false;
    this.words = this.shuffle(this.getFilteredWords()).slice(0, this.settings.count || 10);
    this.showView("gameView");
    const titles = { quiz:"选择题", flashcard:"闪卡", spelling:"拼写", listening:"听力" };
    document.getElementById("gameTitle").textContent = titles[mode] || "游戏";
    document.getElementById("gameArea").innerHTML = "";
    if (mode === "quiz") this.showQuiz();
    else if (mode === "flashcard") this.showFlashcard();
    else if (mode === "spelling") this.showSpelling();
    else if (mode === "listening") this.showListening();
    this.showProgress();
  },

  showProgress() {
    const pct = this.words.length > 0 ? (this.current / this.words.length * 100) : 0;
    document.getElementById("progressFill").style.width = Math.min(pct, 100) + "%";
    document.getElementById("gameScore").textContent = "\u2B50 " + this.score;
  },

  nextWord() {
    this.current++;
    this.answered = false;
    if (this.current >= this.words.length) return this.showResult();
    this.showProgress();
    if (this.mode === "quiz") this.showQuiz();
    else if (this.mode === "flashcard") this.showFlashcard();
    else if (this.mode === "spelling") this.showSpelling();
    else if (this.mode === "listening") this.showListening();
  },

  showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  },

  showQuiz() {
    const w = this.words[this.current];
    if (!w) return this.showResult();
    this.total++;
    const ga = document.getElementById("gameArea");
    ga.innerHTML = 
      '<div class="word-display slide-up">' +
        '<div class="word-english">' + w.en + '</div>' +
        '<button class="btn-speak" onclick="App.speak(\'' + this.escap(w.en) + '\')">\u{1F50A}</button>' +
      '</div>' +
      '<div class="options" id="options"></div>' +
      '<div class="feedback" id="feedback"></div>' +
      '<button class="next-btn" id="nextBtn" onclick="App.nextWord()">下一题 \u2192</button>';
    
    const wrong = this.shuffle(this.words.filter(x => x.en !== w.en)).slice(0, 3).map(x => x.zh);
    const opts = this.shuffle([w.zh, ...wrong]);
    ga.querySelector("#options").innerHTML = opts.map(o => '<button class="option-btn" onclick="App.answerQuiz(this,\'' + this.escap(o) + '\')">' + o + '</button>').join("");
    if (this.settings.sound) setTimeout(() => this.speak(w.en), 300);
  },

  escap(s) {
    return s.replace(/\'/g, "\\'").replace(/"/g, "&quot;");
  },

  answerQuiz(el, ans) {
    if (this.answered) return;
    this.answered = true;
    const w = this.words[this.current];
    const correct = ans === w.zh;
    document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
    el.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      document.querySelectorAll(".option-btn").forEach(b => { if (b.textContent === w.zh) b.classList.add("correct"); });
    }
    this.handleAnswer(correct);
    const fb = document.getElementById("feedback");
    fb.className = "feedback show " + (correct ? "correct" : "wrong");
    fb.textContent = correct ? "\u2705 正确! " + w.en + " = " + w.zh : "\u274C " + w.en + " = " + w.zh;
    document.getElementById("nextBtn").classList.add("show");
    this.showProgress();
    if (this.settings.sound) this.speak(w.en);
  },

  showFlashcard() {
    const w = this.words[this.current];
    if (!w) return this.showResult();
    this.total++;
    document.getElementById("gameArea").innerHTML = 
      '<div class="flashcard-container">' +
        '<div class="flashcard" id="flashcard" onclick="this.classList.toggle(\'flipped\')">' +
          '<div class="flashcard-face">' +
            '<div style="font-size:40px;font-weight:700;margin-bottom:12px">' + w.en + '</div>' +
            '<button class="btn-speak" onclick="event.stopPropagation();App.speak(\'' + this.escap(w.en) + '\')">\u{1F50A}</button>' +
            '<div class="hint">\u{1F446} 点击翻转</div>' +
          '</div>' +
          '<div class="flashcard-face flashcard-back">' +
            '<div style="font-size:28px;font-weight:600;color:var(--secondary);margin-bottom:8px">' + w.zh + '</div>' +
            '<div style="font-size:16px;color:var(--text-dim)">' + w.en + '</div>' +
            '<div class="hint">你记住了吗？</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="flashcard-actions">' +
        '<button class="flashcard-btn dunno" onclick="App.answerFlash(false)">\u{1F605} 不认识</button>' +
        '<button class="flashcard-btn know" onclick="App.answerFlash(true)">\u{1F60E} 认识</button>' +
      '</div>';
    if (this.settings.sound) setTimeout(() => this.speak(w.en), 500);
  },

  answerFlash(know) {
    if (this.answered) return;
    this.answered = true;
    this.handleAnswer(know);
    this.showStreakBadge();
    this.showProgress();
    setTimeout(() => this.nextWord(), know ? 600 : 1200);
  },

  showSpelling() {
    const w = this.words[this.current];
    if (!w) return this.showResult();
    this.total++;
    document.getElementById("gameArea").innerHTML = 
      '<div class="word-display slide-up">' +
        '<div style="font-size:28px;font-weight:700;margin-bottom:4px">' + w.zh + '</div>' +
        '<div style="color:var(--text-dim);font-size:13px;margin-bottom:12px">请输入对应的英文单词</div>' +
        '<button class="btn-speak" onclick="App.speak(\'' + this.escap(w.en) + '\')">\u{1F50A} 听发音提示</button>' +
        '<input class="spelling-input" id="spellInput" placeholder="输入英文..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key===\'Enter\')App.answerSpelling()">' +
      '</div>' +
      '<div class="feedback" id="feedback"></div>' +
      '<button class="next-btn" id="nextBtn" onclick="App.nextWord()">下一题 \u2192</button>';
    setTimeout(() => {
      const el = document.getElementById("spellInput");
      if (el) el.focus();
    }, 100);
  },

  answerSpelling() {
    if (this.answered) return;
    const input = document.getElementById("spellInput");
    if (!input) return;
    const ans = input.value.trim().toLowerCase();
    if (!ans) return;
    this.answered = true;
    const w = this.words[this.current];
    const correct = ans === w.en.toLowerCase();
    input.classList.add(correct ? "correct" : "wrong");
    input.disabled = true;
    this.handleAnswer(correct);
    const fb = document.getElementById("feedback");
    fb.className = "feedback show " + (correct ? "correct" : "wrong");
    fb.textContent = correct ? "\u2705 正确!" : "\u274C 正确答案: " + w.en;
    document.getElementById("nextBtn").classList.add("show");
    this.showProgress();
    if (this.settings.sound) this.speak(w.en);
  },

  showListening() {
    const w = this.words[this.current];
    if (!w) return this.showResult();
    this.total++;
    document.getElementById("gameArea").innerHTML = 
      '<div class="word-display slide-up">' +
        '<div style="font-size:16px;color:var(--text-dim);margin-bottom:12px">请听发音，选择正确的单词</div>' +
        '<button class="btn-speak speaking" id="listenBtn" onclick="App.speak(\'' + this.escap(w.en) + '\')">\u{1F50A} 再听一次</button>' +
      '</div>' +
      '<div class="options" id="options"></div>' +
      '<div class="feedback" id="feedback"></div>' +
      '<button class="next-btn" id="nextBtn" onclick="App.nextWord()">下一题 \u2192</button>';
    
    const wrong = this.shuffle(this.words.filter(x => x.en !== w.en)).slice(0, 3).map(x => x.en);
    const opts = this.shuffle([w.en, ...wrong]);
    document.getElementById("options").innerHTML = opts.map(o => '<button class="option-btn" onclick="App.answerListening(this,\'' + this.escap(o) + '\')">' + o + '</button>').join("");
    setTimeout(() => this.speak(w.en), 500);
  },

  answerListening(el, ans) {
    if (this.answered) return;
    this.answered = true;
    const w = this.words[this.current];
    const correct = ans === w.en;
    document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
    el.classList.add(correct ? "correct" : "wrong");
    if (!correct) {
      document.querySelectorAll(".option-btn").forEach(b => { if (b.textContent === w.en) b.classList.add("correct"); });
    }
    this.handleAnswer(correct);
    const fb = document.getElementById("feedback");
    fb.className = "feedback show " + (correct ? "correct" : "wrong");
    fb.textContent = correct ? "\u2705 正确! " + w.en + " = " + w.zh : "\u274C " + w.en + " = " + w.zh;
    document.getElementById("nextBtn").classList.add("show");
    this.showProgress();
  },

  handleAnswer(correct) {
    this.stats.total++;
    if (correct) {
      this.score++;
      this.stats.correct++;
      this.streak++;
      if (this.streak > this.bestStreak) {
        this.bestStreak = this.streak;
        this.stats.streak = this.streak;
      }
    } else {
      this.streak = 0;
    }
    this.saveStats();
  },

  showStreakBadge() {
    if (this.streak > 0 && this.streak % 5 === 0) {
      const b = document.createElement("div");
      b.className = "streak-badge";
      b.textContent = "\u{1F525} " + this.streak + " 连击!";
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    }
  },

  showResult() {
    this.stats.games++;
    this.saveStats();
    const pct = this.total > 0 ? Math.round(this.score / this.total * 100) : 0;
    const msg = pct >= 90 ? "\u{1F3C6} 太棒了!" : pct >= 70 ? "\u{1F44F} 不错!" : pct >= 50 ? "\u{1F4AA} 继续加油!" : "\u{1F4DA} 多练练!";
    document.getElementById("gameArea").innerHTML = 
      '<div class="result-screen slide-up">' +
        '<div class="result-score">' + pct + '%</div>' +
        '<div style="font-size:18px;margin:8px 0 16px">' + msg + '</div>' +
        '<div class="result-details">' +
          '<div class="result-detail"><div class="num" style="color:var(--success)">' + this.score + '</div><div class="lbl">正确</div></div>' +
          '<div class="result-detail"><div class="num" style="color:var(--error)">' + (this.total - this.score) + '</div><div class="lbl">错误</div></div>' +
          '<div class="result-detail"><div class="num" style="color:var(--gold)">' + this.bestStreak + '</div><div class="lbl">最长连击</div></div>' +
        '</div>' +
        '<div class="btn-group">' +
          '<button class="btn-primary" onclick="App.startGame(App.mode)">\u{1F504} 再来一次</button>' +
          '<button class="btn-secondary" onclick="App.backHome()">\u{1F3E0} 返回</button>' +
        '</div>' +
      '</div>';
    document.getElementById("progressFill").style.width = "100%";
    document.getElementById("gameScore").textContent = "\u2B50 " + this.score;
    this.renderStats();
  },

  backHome() {
    this.showView("homeView");
    this.render();
  },

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    document.getElementById("soundToggle").className = "toggle " + (this.settings.sound ? "on" : "off");
    this.saveSettings();
  },

  setLevel(lv) {
    this.settings.level = lv;
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.toggle("active", parseInt(b.dataset.lv) === lv));
    this.saveSettings();
  },

  setCount(n) {
    this.settings.count = n;
    document.getElementById("countDisplay").textContent = n;
    this.saveSettings();
  },

  saveSettings() {
    localStorage.setItem("kaoyanSettings", JSON.stringify(this.settings));
  },

  openSettings() {
    this.showView("settingsView");
    document.getElementById("soundToggle").className = "toggle " + (this.settings.sound ? "on" : "off");
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.toggle("active", parseInt(b.dataset.lv) === this.settings.level));
    document.getElementById("countDisplay").textContent = this.settings.count;
  },

  shareScore() {
    document.getElementById("shareOverlay").classList.add("show");
    document.getElementById("shareSheet").classList.add("open");
  },

  closeShare() {
    document.getElementById("shareOverlay").classList.remove("show");
    document.getElementById("shareSheet").classList.remove("open");
  },

  shareVia(type) {
    const url = window.location.href;
    const text = "我在考研英语单词游戏中获得了 " + this.score + "/" + this.total + " (" + (this.total > 0 ? Math.round(this.score/this.total*100) : 0) + "%) 的好成绩！来挑战我吧！";
    const urls = {
      weibo: "https://service.weibo.com/share/share.php?title=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url),
      qq: "https://connect.qq.com/widget/shareqq/index.html?title=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url),
    };
    if (urls[type]) window.open(urls[type], "_blank");
    else {
      navigator.clipboard.writeText(url).then(() => this.showToast("链接已复制!"));
    }
    this.closeShare();
  },

  copyLink() {
    const inp = document.getElementById("shareLinkInput");
    if (inp) {
      inp.select();
      navigator.clipboard.writeText(inp.value).then(() => this.showToast("已复制!"));
    }
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
