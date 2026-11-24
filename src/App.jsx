import { useEffect, useState } from "react";
import {
  Search, Plus, Home, Library, Brain, Layers, Gamepad2,
  NotebookPen, Settings, BookOpen, Upload, Sparkles,
  CheckCircle, Moon, Sun, Trash2, ExternalLink, X,
  ChevronRight, RotateCcw, FileText
} from "lucide-react";

const starterQuestions = [
  {
    question: "Which molecule carries genetic information in most living organisms?",
    options: ["Protein", "DNA", "Lipid", "Carbohydrate"],
    answer: "DNA",
    explanation: "DNA stores hereditary information in most living organisms."
  },
  {
    question: "Which organelle is mainly responsible for photosynthesis?",
    options: ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"],
    answer: "Chloroplast",
    explanation: "Chloroplast contains chlorophyll and performs photosynthesis."
  },
  {
    question: "What is the basic unit of heredity?",
    options: ["Cell", "Gene", "Tissue", "Organ"],
    answer: "Gene",
    explanation: "A gene is a unit of hereditary information."
  }
];

const starterCards = [
  { q: "What is DNA?", a: "DNA is the molecule that stores hereditary information." },
  { q: "What is a gene?", a: "A gene is a segment of DNA that carries hereditary information." },
  { q: "What is photosynthesis?", a: "The process by which green plants use light energy to make food." }
];

const menu = [
  ["Home", Home],
  ["Research", Search],
  ["Library", Library],
  ["AI Workspace", Brain],
  ["Quiz", CheckCircle],
  ["Flashcards", Layers],
  ["Games", Gamepad2],
  ["Notes", NotebookPen],
  ["Settings", Settings]
];

export default function App() {
  const [page, setPage] = useState("Home");
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState(() =>
    JSON.parse(localStorage.getItem("rgen-saved") || "[]")
  );
  const [notes, setNotes] = useState(() =>
    JSON.parse(localStorage.getItem("rgen-notes") || "[]")
  );
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [dark, setDark] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gameAnswer, setGameAnswer] = useState("");
  const [gameScore, setGameScore] = useState(0);
  const [fileMessage, setFileMessage] = useState("");
  const [studyText, setStudyText] = useState(() => localStorage.getItem("rgen-study-text") || "");
  const [studyItems, setStudyItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rgen-study-items") || "[]"); }
    catch { return []; }
  });
  const [gameChoice, setGameChoice] = useState("");
  const [gameRound, setGameRound] = useState(0);

  useEffect(() => {
    localStorage.setItem("rgen-study-text", studyText);
    localStorage.setItem("rgen-study-items", JSON.stringify(studyItems));
  }, [studyText, studyItems]);

  const activeCards = studyItems.length ? studyItems : starterCards;
  const activeQuestions = studyItems.length
    ? studyItems.map((item, index) => ({
        question: `What is ${item.q}?`,
        options: [item.a, ...studyItems.filter((x, i) => i !== index).slice(0, 3).map(x => x.a)],
        answer: item.a,
        explanation: item.a
      }))
    : starterQuestions;
  const gameOptions = [
    activeCards[gameRound % activeCards.length],
    ...activeCards.filter((item, index) => index !== gameRound % activeCards.length).slice(0, 3)
  ];
  const safeQuestion = activeQuestions[Math.min(questionIndex, activeQuestions.length - 1)];
  const safeCard = activeCards[Math.min(cardIndex, activeCards.length - 1)];

  function createStudySet() {
    const parsed = studyText.split(/\n+/).map(line => line.trim()).filter(Boolean)
      .map(line => {
        const splitAt = line.indexOf(":");
        return splitAt > 0 ? { q: line.slice(0, splitAt).trim(), a: line.slice(splitAt + 1).trim() } : null;
      }).filter(item => item && item.q && item.a);
    if (parsed.length < 2) {
      setFileMessage("Please add at least 2 lines in Term: Definition format.");
      return;
    }
    setStudyItems(parsed);
    setQuestionIndex(0); setAnswer(""); setScore(0); setFinished(false);
    setCardIndex(0); setFlipped(false); setGameRound(0); setGameChoice("");
    setFileMessage(`${parsed.length} study concepts added. Quiz, flashcards and game are ready!`);
  }

  function clearStudySet() {
    setStudyText(""); setStudyItems([]); setFileMessage("");
    setQuestionIndex(0); setAnswer(""); setScore(0); setFinished(false);
    setCardIndex(0); setFlipped(false); setGameRound(0); setGameChoice("");
  }

  useEffect(() => {
    localStorage.setItem("rgen-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("rgen-notes", JSON.stringify(notes));
  }, [notes]);

  async function searchResearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;

    setPage("Research");
    setLoading(true);
    setError("");
    setPapers([]);
    setSelected([]);

    try {
      const response = await fetch(
        `/api/research?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Search failed.");
      setPapers(data.papers || []);
      if (!data.papers?.length) setError("No papers found. Try another topic.");
    } catch (err) {
      setError(err.message || "Unable to search right now.");
    } finally {
      setLoading(false);
    }
  }

  function togglePaper(paper) {
    setSelected(old =>
      old.some(p => p.id === paper.id)
        ? old.filter(p => p.id !== paper.id)
        : [...old, paper]
    );
  }

  function savePaper(paper) {
    setSaved(old =>
      old.some(p => p.id === paper.id) ? old : [...old, paper]
    );
  }

  async function askAI(task) {
    setAiMessage("Connecting to AI...");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          papers: selected,
          query
        })
      });
      const data = await response.json();
      setAiMessage(data.error || "AI is not ready yet.");
    } catch {
      setAiMessage("AI service is not available. Please check deployment.");
    }
  }

  function addNote() {
    if (!noteText.trim()) return;
    setNotes(old => [
      { id: Date.now(), text: noteText.trim(), date: new Date().toLocaleString() },
      ...old
    ]);
    setNoteText("");
  }

  function handleUpload(files) {
    const file = files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setFileMessage("File is larger than the 50 MB limit.");
      return;
    }

    const allowed = /\.(pdf|docx|pptx|txt)$/i.test(file.name);
    if (!allowed) {
      setFileMessage("Supported formats: PDF, DOCX, PPTX and TXT.");
      return;
    }

    setFileMessage(
      `${file.name} selected. File storage and text extraction will be connected in the next setup stage.`
    );
  }

  function resetQuiz() {
    setQuestionIndex(0);
    setAnswer("");
    setScore(0);
    setFinished(false);
  }

  function submitAnswer() {
    if (!answer) return;
    if (answer === activeQuestions[questionIndex].answer) {
      setScore(s => s + 1);
    }
    if (questionIndex === activeQuestions.length - 1) {
      setFinished(true);
    } else {
      setQuestionIndex(i => i + 1);
      setAnswer("");
    }
  }

  function startGame() {
    setGameAnswer("");
    setGameScore(0);
  }

  const currentQuestion = safeQuestion;
  const currentCard = safeCard;

  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">R⌕</div>
          <div><b>RGen Search</b><small>Research + AI</small></div>
        </div>

        <div className="menuLabel">WORKSPACE</div>
        {menu.map(([name, Icon]) => (
          <button
            key={name}
            className={`navItem ${page === name ? "active" : ""}`}
            onClick={() => setPage(name)}
          >
            <Icon size={18} /> {name}
          </button>
        ))}

        <div className="sidebarBottom">
          <div className="aiStatus"><Sparkles size={16}/> AI setup pending</div>
          <small>RGen Search · Study smarter</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR RESEARCH COMPANION</span>
            <h2>{page}</h2>
          </div>
          <button className="iconButton" onClick={() => setDark(v => !v)}>
            {dark ? <Sun size={19}/> : <Moon size={19}/>}
          </button>
        </header>

        {page === "Home" && (
          <section>
            <div className="hero">
              <span className="pill"><Sparkles size={14}/> Research meets intelligent learning</span>
              <h1>Discover knowledge.<br/><em>Learn better.</em></h1>
              <p>Search research papers, understand concepts and build your study practice in one place.</p>
              <form className="searchBox" onSubmit={searchResearch}>
                <label className="uploadButton" title="Add study material">
                  <Plus size={21}/>
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.docx,.pptx,.txt"
                    onChange={e => handleUpload(e.target.files)}
                  />
                </label>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search a topic, e.g. Plant Genetics..."
                />
                <button className="primaryButton" type="submit">
                  <Search size={17}/> Search
                </button>
              </form>
              {fileMessage && <p className="notice">{fileMessage}</p>}
              <small>Search research papers using Crossref. Upload limit: 50 MB per file.</small>
            </div>

            <h3 className="sectionTitle">Your study workspace</h3>
            <div className="featureGrid">
              {[
                ["Research","Find academic papers","Search"],
                ["Library","Your saved papers","Library"],
                ["AI Workspace","Summaries and explanations","Brain"],
                ["Quiz","Test your understanding","Quiz"],
                ["Flashcards","Revise key concepts","Flashcards"],
                ["Games","Learn through activities","Games"]
              ].map(([title, desc, target]) => (
                <button className="featureCard" key={title} onClick={() => setPage(target)}>
                  <span className="featureIcon"><Sparkles size={20}/></span>
                  <b>{title}</b><small>{desc}</small>
                  <ChevronRight size={17}/>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === "Research" && (
          <section>
            <form className="searchBox compact" onSubmit={searchResearch}>
              <Search size={19}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search research topic..."/>
              <button className="primaryButton">Search</button>
            </form>
            <div className="sectionHeading">
              <div><h3>Research papers</h3><small>{papers.length} results</small></div>
              <button className="secondaryButton" disabled={!selected.length} onClick={() => { setPage("AI Workspace"); askAI("collective-summary"); }}>
                <Sparkles size={16}/> Summarize selected ({selected.length})
              </button>
            </div>
            {loading && <p className="notice">Searching research papers...</p>}
            {error && <p className="notice">{error}</p>}
            {papers.map(paper => (
              <article className="paperCard" key={paper.id}>
                <div className="paperTop">
                  <label className="checkLabel">
                    <input type="checkbox" checked={selected.some(p => p.id === paper.id)} onChange={() => togglePaper(paper)}/>
                    Select
                  </label>
                  <span className="sourceTag">{paper.source}</span>
                </div>
                <h3>{paper.title}</h3>
                <p>{paper.authors?.join(", ") || "Authors not listed"}</p>
                <small>{paper.journal} · {paper.year}</small>
                {paper.abstract && <p className="abstract">{paper.abstract.replace(/<[^>]*>/g, "").slice(0, 450)}</p>}
                <div className="paperActions">
                  <button className="secondaryButton" onClick={() => savePaper(paper)}><Library size={15}/> Save</button>
                  <button className="secondaryButton" onClick={() => { setSelected([paper]); setPage("AI Workspace"); askAI("individual-summary"); }}><Sparkles size={15}/> AI Summary</button>
                  {paper.url && <a href={paper.url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open paper</a>}
                </div>
              </article>
            ))}
          </section>
        )}

        {page === "Library" && (
          <section>
            <h3>Saved research papers</h3>
            {!saved.length && <p className="empty">Your saved papers will appear here.</p>}
            {saved.map(p => (
              <article className="paperCard" key={p.id}>
                <h3>{p.title}</h3><small>{p.journal} · {p.year}</small>
                <div className="paperActions">
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer">Open paper</a>}
                  <button className="secondaryButton" onClick={() => setSaved(old => old.filter(x => x.id !== p.id))}><Trash2 size={15}/> Remove</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {page === "AI Workspace" && (
          <section>
            <div className="panel">
              <span className="pill"><Sparkles size={14}/> AI WORKSPACE</span>
              <h2>Turn research into understanding.</h2>
              <p>Choose a paper or select multiple papers in Research to prepare an AI task.</p>
              <p><b>Selected papers:</b> {selected.length}</p>
              <div className="buttonWrap">
                <button className="primaryButton" onClick={() => askAI("individual-summary")}>Individual summary</button>
                <button className="primaryButton" onClick={() => askAI("collective-summary")} disabled={selected.length < 2}>Collective summary</button>
                <button className="secondaryButton" onClick={() => askAI("easy-explanation")}>Easy explanation</button>
                <button className="secondaryButton" onClick={() => askAI("quiz")}>Generate AI quiz</button>
                <button className="secondaryButton" onClick={() => askAI("flashcards")}>Generate flashcards</button>
                <button className="secondaryButton" onClick={() => askAI("games")}>Generate games</button>
              </div>
              {aiMessage && <p className="notice">{aiMessage}</p>}
              <p className="muted">AI generation will become active after the secure provider connection is completed.</p>
            </div>
          </section>
        )}

        {page === "Quiz" && (
          <section className="panel">
            <span className="pill">PRACTICE QUIZ</span>
            <h2>Test your understanding</h2>
            <p className="muted">{studyItems.length ? `Your custom study set · ${studyItems.length} concepts` : "Starter practice set. Add your own concepts below to create a custom quiz."}</p>
            {finished ? (
              <>
                <h1>{score} / {activeQuestions.length}</h1>
                <p>Your practice score</p>
                <button className="primaryButton" onClick={resetQuiz}><RotateCcw size={16}/> Try again</button>
              </>
            ) : (
              <>
                <small>Question {questionIndex + 1} of {activeQuestions.length}</small>
                <h3>{currentQuestion.question}</h3>
                {currentQuestion.options.map(option => (
                  <button key={option} className={`option ${answer === option ? "chosen" : ""}`} onClick={() => setAnswer(option)}>{option}</button>
                ))}
                <button className="primaryButton" disabled={!answer} onClick={submitAnswer}>Submit answer</button>
              </>
            )}
            <div className="studyBuilder">
              <h3>Create your own study set</h3>
              <p>Har line mein ek concept likho: <b>Term: Definition</b></p>
              <textarea value={studyText} onChange={e => setStudyText(e.target.value)} placeholder={"DNA: Stores hereditary information\nGene: Unit of heredity\nChloroplast: Site of photosynthesis"} />
              <div className="buttonWrap">
                <button className="primaryButton" onClick={createStudySet}>Create Quiz + Cards + Game</button>
                <button className="secondaryButton" onClick={clearStudySet}>Clear custom set</button>
              </div>
              {fileMessage && <p className="notice">{fileMessage}</p>}
            </div>
          </section>
        )}

        {page === "Flashcards" && (
          <section className="panel">
            <span className="pill">FLASHCARD REVISION</span>
            <h2>Revise your concepts</h2>
            <p className="muted">{studyItems.length ? "Custom flashcards from your study set" : "Starter flashcards. Add concepts in Quiz to make your own."}</p>
            <button className="flashcard" onClick={() => setFlipped(v => !v)}>
              <small>{flipped ? "ANSWER" : "QUESTION"} · Tap to flip</small>
              <h2>{flipped ? currentCard.a : currentCard.q}</h2>
            </button>
            <div className="buttonWrap">
              <button className="secondaryButton" onClick={() => {setCardIndex(i => (i + activeCards.length - 1) % activeCards.length); setFlipped(false);}}>Previous</button>
              <button className="primaryButton" onClick={() => {setCardIndex(i => (i + 1) % activeCards.length); setFlipped(false);}}>Next card</button>
            </div>
            <small>Card {cardIndex + 1} of {activeCards.length}</small>
            <div className="studyBuilder">
              <h3>Add concepts</h3>
              <p>Quiz page par Term: Definition format mein concepts paste karo. Yahi cards yahan show honge.</p>
              <button className="secondaryButton" onClick={() => setPage("Quiz")}>Open study set creator</button>
            </div>
          </section>
        )}

        {page === "Games" && (
          <section className="panel">
            <span className="pill">LEARNING GAME</span>
            <h2>Match the concept</h2>
            <p>Choose the correct definition for this term:</p>
            <h3>{activeCards[gameRound % activeCards.length].q}</h3>
            {gameOptions.map((item, index) => (
              <button key={`${item.q}-${index}`} className={`option ${gameChoice === item.a ? "chosen" : ""}`} onClick={() => {
                setGameChoice(item.a);
                if (item.a === activeCards[gameRound % activeCards.length].a) setGameScore(s => s + 1);
              }}>{item.a}</button>
            ))}
            {gameChoice && <p className="notice">{gameChoice === activeCards[gameRound % activeCards.length].a ? "Correct! Great work." : `Not quite. Correct answer: ${activeCards[gameRound % activeCards.le
