import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Check, ChevronDown, Clock3, Compass, Download, FileAudio, Library, Mic, Pause, Play, Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, Swords, Trash2, X, Zap, BarChart3, Dices, Volume2 } from 'lucide-react'
import { deleteRecording, getRecordings, saveRecording, type SavedRecording } from './lib/db'
import { topicBank, topicCounts, randomTopic, type TopicMode } from './lib/topicBank'

type Tab = 'practice'|'debate'|'topics'|'progress'|'library'
type Framework = { name:string; short:string; steps:string[]; example:string }
const frameworks: Framework[] = [
  {name:'PREP',short:'Make one clear point and support it.',steps:['Point','Reason','Example','Point'],example:'Small talk matters because it builds trust. It gives people a low-pressure way to connect before deeper conversations.'},
  {name:'PEEL',short:'Build a paragraph with evidence and a clear link.',steps:['Point','Evidence','Explanation','Link'],example:'Public libraries remain valuable. Usage data shows they support learning and access. This matters because access to information should not depend on income.'},
  {name:'What–Why–How',short:'Define an idea, explain its importance, then make it practical.',steps:['What is it?','Why does it matter?','How can it work?'],example:'Remote work is location-independent work. It matters because it changes access and flexibility. Teams can make it work with clear goals and communication.'},
  {name:'Past–Present–Future',short:'Connect historical context to today and tomorrow.',steps:['Past','Present','Future'],example:'Education moved from print to digital resources. Today, blended learning is common. In the future, personalized tools may become more accessible.'},
  {name:'Problem–Cause–Solution',short:'Explain what is wrong, why it happens and what could help.',steps:['Problem','Cause','Solution'],example:'Many people struggle to focus. Constant interruptions fragment attention. Protected focus periods and fewer notifications can help.'},
  {name:'5W1H',short:'Explore a topic from six useful angles.',steps:['Who','What','When','Where','Why','How'],example:'Who is affected? What is changing? When and where does it happen? Why does it matter, and how should we respond?'},
  {name:'Pros and Cons',short:'Present trade-offs before reaching a balanced conclusion.',steps:['Advantages','Disadvantages','Balance'],example:'Online learning is flexible and widely accessible, but it can reduce social interaction. A blended approach may preserve the benefits of both.'},
  {name:'STAR',short:'Tell a concise story about an experience.',steps:['Situation','Task','Action','Result'],example:'Our team faced a tight deadline. I coordinated the work. We divided tasks and checked progress daily. We delivered on time.'},
  {name:'Claim–Evidence–Reasoning',short:'Make a claim, support it and explain the connection.',steps:['Claim','Evidence','Reasoning'],example:'Cities should invest in public transport. Reliable networks move many people efficiently. This can reduce congestion when services are convenient.'},
  {name:'First Principles',short:'Break a question into fundamentals and rebuild your answer.',steps:['Question assumptions','Find fundamentals','Rebuild logically'],example:'Instead of asking how to make meetings shorter, ask what a meeting must achieve. If information can be shared asynchronously, only decisions may need a meeting.'},
]
const topics = topicBank
const debateTopics = [
  'Schools should replace most exams with project-based assessment.',
  'Artificial intelligence will create more opportunities than it removes.',
  'Public transport should be free in major cities.',
  'Social media platforms should be responsible for misinformation shared on them.',
  'A four-day working week should become the standard.',
  'Governments should prioritize long-term environmental goals over short-term economic growth.',
  'University education should be tuition-free.',
  'Personal privacy is more important than convenience.',
  'Space exploration deserves public investment.',
  'Technology has made people less independent.'
]
const fmt = (s:number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
const ratingLabels = ['Topic relevance','Logical structure','Clarity','Vocabulary','Fluency','Confidence']

export default function App() {
  const [tab,setTab] = useState<Tab>('practice')
  const [topic,setTopic] = useState('Waiting Room')
  const [topicCategory,setTopicCategory] = useState('Everyday metaphor')
  const [recent,setRecent] = useState<string[]>([])
  const [spinning,setSpinning] = useState(false)
  const [mode,setMode] = useState('Spontaneous')
  const [theme,setTheme] = useState<'purple'|'light'>(()=>(localStorage.getItem('unprompted-theme') as 'purple'|'light')||'purple')
  const [lifetimeSeconds,setLifetimeSeconds] = useState(()=>Number(localStorage.getItem('unprompted-lifetime-seconds')||0))
  const [customQuestions,setCustomQuestions] = useState<string[]>(()=>JSON.parse(localStorage.getItem('unprompted-custom-questions')||'[]'))
  const [newQuestion,setNewQuestion] = useState('')
  const [questionSource,setQuestionSource] = useState<'mixed'|'mine'>('mixed')
  const [showQuestionEditor,setShowQuestionEditor] = useState(false)
  const [topicMode,setTopicMode] = useState<TopicMode>('spontaneous')
  const [exerciseMode,setExerciseMode] = useState('General speaking')
  const [framework,setFramework] = useState(frameworks[0])
  const [frameworkOpen,setFrameworkOpen] = useState(false)
  const [duration,setDuration] = useState(5)
  const [remaining,setRemaining] = useState(300)
  const [timerRunning,setTimerRunning] = useState(false)
  const [timerPaused,setTimerPaused] = useState(false)
  const [soundOn,setSoundOn] = useState(true)
  const [phase,setPhase] = useState<'ready'|'prep'|'speech'>('ready')
  const [recording,setRecording] = useState(false)
  const [startingRecording,setStartingRecording] = useState(false)
  const [recordPaused,setRecordPaused] = useState(false)
  const [recordSeconds,setRecordSeconds] = useState(0)
  const [level,setLevel] = useState(0)
  const [recordings,setRecordings] = useState<SavedRecording[]>([])
  const [activeBlob,setActiveBlob] = useState<Blob|null>(null)
  const [activeMime,setActiveMime] = useState('')
  const [activeUrl,setActiveUrl] = useState('')
  const [saveTitle,setSaveTitle] = useState('')
  const [ratings,setRatings] = useState<Record<string,number>>({})
  const [weakness,setWeakness] = useState('')
  const [target,setTarget] = useState('')
  const [notes,setNotes] = useState('')
  const [showReview,setShowReview] = useState(false)
  const [search,setSearch] = useState('')
  const [category,setCategory] = useState('All')
  const [debateTopic,setDebateTopic] = useState(debateTopics[0])
  const [position,setPosition] = useState<'Proposition'|'Opposition'>('Proposition')
  const [debateMode,setDebateMode] = useState('Structured')
  const [debateNotes,setDebateNotes] = useState('')
  const [toast,setToast] = useState('')
  const [editing,setEditing] = useState<string|null>(null)
  const recordingUrls = useMemo(()=>new Map(recordings.map(r=>[r.id,URL.createObjectURL(r.blob)] as const)),[recordings])
  useEffect(()=>()=>recordingUrls.forEach(url=>URL.revokeObjectURL(url)),[recordingUrls])
  const [editValue,setEditValue] = useState('')
  const [audioError,setAudioError] = useState('')
  const recorderRef = useRef<MediaRecorder|null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream|null>(null)
  const audioContextRef = useRef<AudioContext|null>(null)
  const analyserRef = useRef<AnalyserNode|null>(null)
  const rafRef = useRef<number>(0)
  const timerEndRef = useRef<number>(0)
  const timerLeftRef = useRef(300)
  const lifetimeTickRef = useRef(0)
  const recordStartRef = useRef(0)
  const recordAccumRef = useRef(0)
  const recordIntervalRef = useRef<number|undefined>(undefined)
  const [sessionKind,setSessionKind] = useState<'practice'|'debate'>('practice')

  useEffect(()=>{ getRecordings().then(setRecordings).catch(()=>setToast('Local recording storage is unavailable in this browser.')) },[])
  useEffect(()=>{ timerLeftRef.current=remaining },[remaining])
  useEffect(()=>{ return ()=>{ cancelAnimationFrame(rafRef.current); clearInterval(recordIntervalRef.current); streamRef.current?.getTracks().forEach(t=>t.stop()); if(activeUrl) URL.revokeObjectURL(activeUrl) } },[activeUrl])
  useEffect(()=>{ if(!toast) return; const id=window.setTimeout(()=>setToast(''),2800); return ()=>clearTimeout(id) },[toast])

  const chooseTopic = useCallback(() => {
    if(spinning) return
    setSpinning(true)
    const chosen = randomTopic(topicMode,recent)
    window.setTimeout(()=>{
      setTopic(chosen.title); setTopicCategory(`${chosen.category} · ${topicMode==='spontaneous'?'Off the cuff':'Deep research'}`); setRecent(prev=>[chosen.id,...prev].slice(0,20)); setSpinning(false)
    },850)
  },[spinning,recent,topicMode])

  const startTimer = () => {
    if(timerRunning && timerPaused) { timerEndRef.current=Date.now()+remaining*1000; lifetimeTickRef.current=Date.now(); setTimerPaused(false); return }
    if(timerRunning) return
    if(remaining<=0) setRemaining(duration*60)
    const startFrom = remaining<=0 ? duration*60 : remaining
    timerEndRef.current=Date.now()+startFrom*1000; lifetimeTickRef.current=Date.now(); setTimerRunning(true); setTimerPaused(false)
  }
  const flushLifetime = () => {
    if(!lifetimeTickRef.current)return
    const now=Date.now(); const delta=Math.floor((now-lifetimeTickRef.current)/1000)
    if(delta>0){lifetimeTickRef.current+=delta*1000;setLifetimeSeconds(v=>{const next=v+delta;localStorage.setItem('unprompted-lifetime-seconds',String(next));return next})}
  }
  const pauseTimer = () => { flushLifetime(); setTimerPaused(true) }
  useEffect(()=>{
    if(!timerRunning || timerPaused) return
    lifetimeTickRef.current=Date.now()
    const id=window.setInterval(()=>{
      const now=Date.now(); const elapsed=Math.floor((now-lifetimeTickRef.current)/1000)
      if(elapsed>0){lifetimeTickRef.current+=elapsed*1000;setLifetimeSeconds(v=>{const next=v+elapsed;localStorage.setItem('unprompted-lifetime-seconds',String(next));return next})}
      const next=Math.max(0,Math.ceil((timerEndRef.current-now)/1000))
      setRemaining(next)
      if(next===0){setTimerRunning(false);setTimerPaused(false);if(phase==='prep'){setPhase('speech');setDuration(5);setRemaining(300);setToast('Preparation complete. Your speech begins now.')}else{setToast('Time is up. Take a moment to reflect.');} if(soundOn){try { const Ctx=window.AudioContext; const ctx=new Ctx(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=660; gain.gain.value=.08; osc.start(); osc.stop(ctx.currentTime+.25); osc.onended=()=>ctx.close() } catch { /* sound is optional */ }}}
    },200)
    return ()=>clearInterval(id)
  },[timerRunning,timerPaused,phase,soundOn])
  const resetTimer = () => {if(timerRunning&&!timerPaused)flushLifetime();setTimerRunning(false);setTimerPaused(false);lifetimeTickRef.current=0;setRemaining(duration*60)}
  const setPreset = (n:number) => {if(timerRunning&&!timerPaused)flushLifetime();setDuration(n);setRemaining(n*60);setTimerRunning(false);setTimerPaused(false);lifetimeTickRef.current=0}

  const stopTracks = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; cancelAnimationFrame(rafRef.current); audioContextRef.current?.close().catch(()=>{}); audioContextRef.current=null }
  const startRecording = async () => {
    if(recording || startingRecording) return
    setStartingRecording(true)
    setAudioError('')
    if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined'){setAudioError('Audio recording is not supported in this browser. Try the latest Chrome, Edge or Safari over HTTPS.');return}
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      streamRef.current=stream
      const candidates=['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
      const mime=candidates.find(t=>MediaRecorder.isTypeSupported(t)) || ''
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)
      chunksRef.current=[]; recorderRef.current=rec
      rec.ondataavailable=e=>{if(e.data.size) chunksRef.current.push(e.data)}
      rec.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:rec.mimeType||'application/octet-stream'})
        setActiveBlob(blob); setActiveMime(rec.mimeType||blob.type||'unknown'); setSaveTitle(`${topic.slice(0,36)} — ${new Date().toLocaleDateString()}`)
        const url=URL.createObjectURL(blob); setActiveUrl(url); setShowReview(true); setRecording(false); setRecordPaused(false); stopTracks()
      }
      rec.start(500); recordAccumRef.current=0; recordStartRef.current=Date.now(); setRecordSeconds(0); setRecording(true); setRecordPaused(false)
      recordIntervalRef.current=window.setInterval(()=>setRecordSeconds(Math.floor((recordAccumRef.current+Date.now()-recordStartRef.current)/1000)),250)
      const ctx=new AudioContext(); audioContextRef.current=ctx; const source=ctx.createMediaStreamSource(stream); const analyser=ctx.createAnalyser(); analyser.fftSize=256; source.connect(analyser); analyserRef.current=analyser
      const data=new Uint8Array(analyser.frequencyBinCount)
      const draw=()=>{if(!analyserRef.current)return; analyserRef.current.getByteFrequencyData(data); setLevel(Math.min(100,Math.round(data.reduce((a,b)=>a+b,0)/data.length/1.5))); rafRef.current=requestAnimationFrame(draw)}; draw()
    } catch(err) { setAudioError(err instanceof Error && err.name==='NotAllowedError'?'Microphone permission was denied. Allow microphone access in your browser settings and try again.':'Could not start recording. Check your microphone and browser permissions.') } finally { setStartingRecording(false) }
  }
  const pauseRecording = () => { const rec=recorderRef.current; if(!rec)return; if(rec.state==='recording'){rec.pause();recordAccumRef.current+=Date.now()-recordStartRef.current;clearInterval(recordIntervalRef.current);setRecordPaused(true)} else if(rec.state==='paused'){rec.resume();recordStartRef.current=Date.now();recordIntervalRef.current=window.setInterval(()=>setRecordSeconds(Math.floor((recordAccumRef.current+Date.now()-recordStartRef.current)/1000)),250);setRecordPaused(false)} }
  const stopRecording = () => { if(recorderRef.current && recorderRef.current.state!=='inactive'){ if(!recordPaused) recordAccumRef.current+=Date.now()-recordStartRef.current; clearInterval(recordIntervalRef.current); recorderRef.current.stop() } }
  const persistActive = async () => {
    if(!activeBlob)return
    const item:SavedRecording={id:uid(),title:saveTitle.trim()||'Untitled practice',createdAt:Date.now(),duration:recordSeconds,mimeType:activeMime,blob:activeBlob,topic,kind:sessionKind,notes,ratings,weakness,target}
    try {await saveRecording(item);setRecordings(prev=>[item,...prev]);setToast('Recording saved on this device.');setShowReview(false);setActiveBlob(null);if(activeUrl)URL.revokeObjectURL(activeUrl);setActiveUrl('');setNotes('');setRatings({});setWeakness('');setTarget('')}
    catch {setToast('Could not save recording. Check available device storage.')}
  }
  const downloadBlob = (blob:Blob,name:string,mime:string) => {const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':mime.includes('webm')?'webm':'audio';const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${name.replace(/[^a-z0-9-_ ]/gi,'').trim()||'recording'}.${ext}`;a.click();URL.revokeObjectURL(url)}
  const removeRecording = async(id:string)=>{if(!confirm('Delete this recording permanently from this device?'))return;await deleteRecording(id);setRecordings(v=>v.filter(r=>r.id!==id));setToast('Recording deleted.')}
  const renameRecording = async(item:SavedRecording)=>{const title=editValue.trim();if(!title)return;const updated={...item,title};await saveRecording(updated);setRecordings(v=>v.map(r=>r.id===item.id?updated:r));setEditing(null)}
  const exercisePrompts:Record<string,string[]>={'Explain Anything':['Explain compound interest to a beginner.','Explain how a vaccine trains the immune system.','Explain the difference between correlation and causation.','Explain how a parliamentary democracy works.'],'Argue Both Sides':['Is competition more helpful than cooperation? Defend both positions in separate turns.','Should technology make decisions on behalf of people? Argue both sides.','Is tradition a source of stability or an obstacle to progress? Defend both sides.'],'Storytelling Studio':['Tell a story about a small mistake that led to an unexpected lesson.','Describe a moment when a plan changed completely.','Tell a story with a clear conflict, turning point and resolution.'],'Summarization Challenge':['Summarize the central idea of a book, film or article you recently encountered in 60 seconds.','Explain a complex news story in three sentences, separating facts from opinion.'],'Vocabulary in Action':['Use the word “nuance” naturally in a short explanation and give an example.','Use the word “resilient” in a story about adapting to change.','Explain an idea using the words “trade-off”, “evidence” and “consequence”.'],'Interview Simulator':['Tell me about a challenge you handled and what you learned.','What is a skill you are currently developing, and how are you practising it?','Describe a time you changed your mind after receiving new information.'],'Presentation Practice':['Present a three-point case for a change you would make at your school or workplace.','Introduce a subject you know well to an audience unfamiliar with it.'],'Meeting Simulator':['Give a 60-second project update: progress, obstacle, next action.','Explain a problem to a team and propose a clear next step.'],'Conversation Simulator':['You are joining a group conversation about a film you have not seen. Find a natural way to contribute.','Introduce yourself to someone new and ask a thoughtful follow-up question.','Disagree respectfully with a friend who strongly supports an idea you question.'],'Active Listening':['Summarise a speaker’s point in your own words, identify their request and ask one clarifying question.','A speaker describes a frustrating group project. Reflect their main concern without assuming how they feel.'],'Question Crafting':['Turn “Do you like history?” into three open-ended questions that invite deeper discussion.','Ask five follow-up questions that explore the reasoning behind an opinion.'],'Conciseness Training':['Explain why reading matters in 30 seconds, then repeat in 15 seconds without losing the central point.','Summarise a complex idea in exactly three sentences.'],'Real-Life Scenarios':['Ask a teacher to clarify an instruction respectfully and specifically.','Receive constructive criticism and respond with curiosity rather than defensiveness.','Explain a mistake, take responsibility and state the next step.'],'Persuasion and Rhetoric':['Make an evidence-based case for a school library improvement, including one likely objection.','Explain the same proposal using credibility, logic and a relatable human example.'],'Movie and Book Explanation':['Explain the central conflict of a film without retelling every scene.','Describe a novel’s main theme, support it with an example and explain why it matters.']}
  const chooseQuestion=()=>{const useCustom=customQuestions.length>0&&(questionSource==='mine'||Math.random()<0.5);const q=useCustom?customQuestions[Math.floor(Math.random()*customQuestions.length)]:randomTopic('spontaneous').title;setTopic(q);setTopicCategory(useCustom?'Your questions':'Question drill')}
  const startPractice = () => {setSessionKind('practice');setTab('practice');if(exerciseMode!=='General speaking'){const list=exercisePrompts[exerciseMode]||[];if(list.length){setTopic(list[Math.floor(Math.random()*list.length)]);setTopicCategory(exerciseMode)}}if(mode==='Q&A Drill')chooseQuestion();if(mode==='Prepared'){setPhase('prep');setRemaining(30);setDuration(5);setTimerRunning(false);setTimerPaused(false)}else{setPhase('speech');setPreset(mode==='Extended'?10:5)}}
  const filteredTopics=useMemo(()=>topics.filter(t=>t.mode===topicMode&&(category==='All'||t.category===category)&&(t.title.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()))).slice(0,80),[category,search,topicMode])
  const totalSessions=recordings.length
  const allRatings=recordings.flatMap(r=>Object.values(r.ratings||{}))
  const averageScore=allRatings.length?allRatings.reduce((a,b)=>a+b,0)/allRatings.length:0

  const saveCustomQuestion=()=>{const q=newQuestion.trim();if(!q)return;const next=[q,...customQuestions.filter(x=>x!==q)];setCustomQuestions(next);localStorage.setItem('unprompted-custom-questions',JSON.stringify(next));setNewQuestion('');setShowQuestionEditor(false);setToast('Your question was saved.')}
  const toggleTheme=()=>{const next=theme==='purple'?'light':'purple';setTheme(next);localStorage.setItem('unprompted-theme',next)}
  return <div className="app-shell min-h-screen bg-ink text-white" data-theme={theme}>
    <header className="topbar"><div className="brand"><span className="brand-wave"><Activity size={23}/></span><span>Unprompted</span></div><div className="top-actions"><span className="status"><i/> READY TO PRACTICE</span><button className="icon-btn theme-toggle" title={theme==='purple'?'Switch to light theme':'Switch to purple dark theme'} onClick={toggleTheme}><span>{theme==='purple'?'☼':'☾'}</span></button><button className="icon-btn" title="Settings" onClick={()=>setToast('Your recordings stay on this device. No account required.')}><Settings2 size={19}/></button><button className="avatar" title="Profile" onClick={()=>setToast('Local practice space')}>U</button></div></header>
    <main className="main-shell">
      {tab==='practice' && <section className="page-content">
        <div className="mode-switch"><button className={mode==='Spontaneous'?'selected':''} onClick={()=>{setMode('Spontaneous');setTopicMode('spontaneous');setPhase('ready')}}><Zap size={16}/> Off the cuff</button><button className={mode==='Prepared'?'selected':''} onClick={()=>{setMode('Prepared');setTopicMode('prepared');setPhase('ready')}}>Deep research</button><button className={mode==='Extended'?'selected':''} onClick={()=>{setMode('Extended');setPhase('ready')}}>Extended</button><button className={mode==='Q&A Drill'?'selected':''} onClick={()=>{setMode('Q&A Drill');setPhase('ready')}}>Q&amp;A Drill</button></div>
        <div className="exercise-row"><label htmlFor="exercise-mode">Exercise</label><select id="exercise-mode" className="exercise-select" value={exerciseMode} onChange={e=>setExerciseMode(e.target.value)}><option>General speaking</option><option>Explain Anything</option><option>Argue Both Sides</option><option>Storytelling Studio</option><option>Summarization Challenge</option><option>Vocabulary in Action</option><option>Interview Simulator</option><option>Presentation Practice</option><option>Meeting Simulator</option><option>Conversation Simulator</option><option>Active Listening</option><option>Question Crafting</option><option>Conciseness Training</option><option>Real-Life Scenarios</option><option>Persuasion and Rhetoric</option><option>Movie and Book Explanation</option></select></div>
        <p className="subline">{mode==='Spontaneous'?'Minimal prep. Think quickly on your feet.':mode==='Prepared'?'Research, organize and deliver a prepared explanation.':mode==='Q&A Drill'?'Answer one question at a time. Add your own questions whenever you like.':'Build clarity and stamina with a longer response.'}</p>
        {mode==='Q&A Drill'&&<div className="panel question-manager"><div className="flex justify-between items-center gap-2"><div><b>Your question bank</b><p className="muted text-sm">{customQuestions.length} personal questions · saved on this device</p></div><div className="flex items-center gap-2"><select className="question-source" value={questionSource} onChange={e=>setQuestionSource(e.target.value as 'mixed'|'mine')}><option value="mixed">Mixed bank</option><option value="mine" disabled={!customQuestions.length}>My questions only</option></select><button className="secondary compact" onClick={()=>setShowQuestionEditor(v=>!v)}><Plus size={15}/> Add yours</button></div></div>{showQuestionEditor&&<div className="mt-3"><textarea value={newQuestion} onChange={e=>setNewQuestion(e.target.value)} placeholder="Write a question or prompt you want to practise…"/><div className="flex justify-end gap-2 mt-2"><button className="text-action" onClick={()=>setShowQuestionEditor(false)}>Cancel</button><button className="primary compact" onClick={saveCustomQuestion}>Save question</button></div></div>}{customQuestions.length>0&&<div className="custom-question-list">{customQuestions.slice(0,5).map(q=><div key={q}><span>{q}</span><button className="text-action" onClick={()=>{const next=customQuestions.filter(x=>x!==q);setCustomQuestions(next);localStorage.setItem('unprompted-custom-questions',JSON.stringify(next))}}>Remove</button></div>)}</div>}</div>}
        <div className="topic-center"><div className="eyebrow">YOUR TOPIC</div><h1 className="serif topic-title">{topic}</h1>{sessionKind==='debate'&&<div className="eyebrow mb-3">{position.toUpperCase()} POSITION</div>}<span className="topic-tag"><i/> {topicCategory}</span><div className="framework-pill" onClick={()=>setFrameworkOpen(!frameworkOpen)}><span>✦ Framework:</span><b>{framework.name}</b><ChevronDown size={16}/></div></div>
        {frameworkOpen&&<div className="framework-pop panel"><div className="flex items-center justify-between mb-3"><b>Choose a framework</b><button className="icon-btn" onClick={()=>setFrameworkOpen(false)}><X size={16}/></button></div><div className="framework-list">{frameworks.map(f=><button key={f.name} className={`framework-option ${framework.name===f.name?'active':''}`} onClick={()=>{setFramework(f);setFrameworkOpen(false)}}><b>{f.name}</b><small>{f.short}</small></button>)}</div></div>}
        <div className="practice-actions"><button className="primary large" disabled={spinning} onClick={mode==='Q&A Drill'?chooseQuestion:chooseTopic}><Dices className={spinning?'spin':''} size={20}/>{mode==='Q&A Drill'?'Next question':spinning?'Choosing topic…':'Spin for a topic'}</button><div className="secondary-row"><button className="secondary" onClick={startPractice}><Clock3 size={19}/>{mode==='Prepared'?'Start preparation':mode==='Extended'?'Start 10 min practice':'Start 5 min practice'}</button><button className="icon-tile" onClick={()=>setFrameworkOpen(true)} title="Choose framework"><Settings2 size={20}/></button></div></div>
        <div className="practice-lower"><div><span className="eyebrow">QUICK FRAMEWORK</span><p className="muted small-copy">{framework.steps.join('  →  ')}</p></div><button className="text-action" onClick={()=>setTab('topics')}>Explore topics <span>↗</span></button></div>
        {phase!=='ready'&&<div className="panel live-panel"><div className="flex justify-between items-center"><span className="eyebrow">{phase==='prep'?'PREPARATION':'SPEAKING SESSION'}</span><button className="text-action" onClick={()=>{setPhase('ready');resetTimer()}}>Close session <X size={14}/></button></div><h2 className="serif text-2xl mt-3">{topic}</h2><div className="timer-presets">{[1,2,3,5,10].map(n=><button className={duration===n?'chosen':''} key={n} onClick={()=>setPreset(n)}>{n}m</button>)}</div><div className="flex justify-end"><button className="text-action" onClick={()=>setSoundOn(v=>!v)}><Volume2 size={15}/>{soundOn?'Sound on':'Sound off'}</button></div><div className="timer-face"><strong>{fmt(remaining)}</strong><span>{phase==='prep'?'Prepare your thoughts':'Stay with your structure'}</span></div><div className="flex gap-3"><button className="primary flex-1" onClick={()=>timerRunning&&!timerPaused?pauseTimer():startTimer()}>{timerRunning&&!timerPaused?<Pause size={18}/>:<Play size={18}/>} {timerRunning&&!timerPaused?'Pause timer':timerPaused?'Resume timer':'Start timer'}</button><button className="secondary compact" onClick={resetTimer}><RotateCcw size={17}/> Reset</button></div><div className="framework-steps">{framework.steps.map((s,i)=><span key={s}><b>0{i+1}</b> {s}</span>)}</div><div className="record-row"><div><div className="flex items-center gap-2"><span className={`record-dot ${recording?'live':''}`}/><b>{recording?(recordPaused?'Recording paused':'Recording live'):'Audio recording'}</b></div><small className="muted">{recording?fmt(recordSeconds):'Optional · saved privately on this device'}</small></div>{!recording?<button className="record-button" disabled={startingRecording} onClick={startRecording}><Mic size={18}/> {startingRecording?'Requesting mic…':'Record'}</button>:<div className="flex gap-2"><button className="secondary compact" onClick={pauseRecording}>{recordPaused?<Play size={16}/>:<Pause size={16}/>}</button><button className="danger compact" onClick={stopRecording}>Stop</button></div>}</div>{audioError&&<p className="error-text">{audioError}</p>}<div className="level-bars">{Array.from({length:28},(_,i)=><i key={i} style={{height:`${recording?Math.max(4,Math.min(34,(level/100)*(8+(i*7)%25))):4}px`}}/>)}</div></div>}
      </section>}

      {tab==='debate'&&<section className="page-content"><div className="page-heading"><div className="eyebrow">ARGUE WITH CLARITY</div><h1 className="serif">Debate practice</h1><p className="muted">Build arguments, test assumptions and learn to see both sides.</p></div><div className="debate-modes">{['Structured','Random position','Cross-examination','Devil’s advocate','Switch sides'].map(m=><button key={m} className={debateMode===m?'active':''} onClick={()=>{setDebateMode(m);if(m==='Random position')setPosition(Math.random()<.5?'Proposition':'Opposition')}}>{m}</button>)}</div><div className="panel debate-card"><div className="flex justify-between items-center"><span className="eyebrow">DEBATE MOTION</span><span className="topic-tag"><i/> {debateMode}</span></div><h2 className="serif debate-title">{debateTopic}</h2><button className="text-action" onClick={()=>setDebateTopic(debateTopics[Math.floor(Math.random()*debateTopics.length)])}><Dices size={15}/> Generate another motion</button><div className="position-grid"><button className={position==='Proposition'?'chosen':''} onClick={()=>setPosition('Proposition')}><span>FOR</span><b>Proposition</b><small>Defend the motion</small></button><button className={position==='Opposition'?'chosen':''} onClick={()=>setPosition('Opposition')}><span>AGAINST</span><b>Opposition</b><small>Challenge the motion</small></button></div><label className="field-label">Your preparation notes</label><textarea value={debateNotes} onChange={e=>setDebateNotes(e.target.value)} placeholder="Main claim, reasons, evidence and likely counterarguments…"/><div className="flex justify-between items-center mt-4"><span className="muted text-sm">Offline practice · no AI required</span><button className="primary" onClick={()=>{setSessionKind('debate');setNotes(debateNotes);setTab('practice');setTopic(debateTopic);setTopicCategory('Debate');setMode('Spontaneous');setPhase('speech');setPreset(3);setToast(`${position} position selected.`)}}><Mic size={17}/> Start debate</button></div></div><div className="section-label">DEBATE STRUCTURE</div><div className="round-list">{['Opening statement','Main argument','Evidence and examples','Rebuttal','Counter-rebuttal','Closing statement'].map((r,i)=><div key={r}><span className="round-number">0{i+1}</span><div><b>{r}</b><small>{['State your position clearly.','Develop your strongest reason.','Support claims with reliable evidence.','Respond directly to the opposing case.','Defend your reasoning and address challenges.','Summarize the case and leave a clear conclusion.'][i]}</small></div></div>)}</div><p className="muted footnote">AI debate partners are not enabled in this free offline build. The debate workflow, notes and recording tools work without an API.</p></section>}

      {tab==='topics'&&<section className="page-content"><div className="page-heading"><div className="eyebrow">TOPIC LIBRARY</div><h1 className="serif">Speech prompts</h1><p className="muted">{topicCounts.total.toLocaleString()} generated prompts across spontaneous and prepared practice, including personality-focused subjects.</p></div><div className="chips topic-mode-tabs"><button className={topicMode==='spontaneous'?'active':''} onClick={()=>{setTopicMode('spontaneous');setCategory('All')}}>Off the cuff · {topicCounts.spontaneous.toLocaleString()}</button><button className={topicMode==='prepared'?'active':''} onClick={()=>{setTopicMode('prepared');setCategory('All')}}>Deep research · {topicCounts.prepared.toLocaleString()}</button></div><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics or categories…"/></div><div className="chips">{['All',...Array.from(new Set(topics.filter(t=>t.mode===topicMode).map(t=>t.category)))].map(c=><button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="topic-list">{filteredTopics.map((t,i)=><button className="topic-item" key={t.title} onClick={()=>{setTopic(t.title);setTopicCategory(`${t.category} · ${t.mode==='spontaneous'?'Off the cuff':'Deep research'}`);setMode(t.mode==='spontaneous'?'Spontaneous':'Prepared');setTab('practice');setToast('Topic selected for practice.')}}><span className="topic-index">{String(i+1).padStart(2,'0')}</span><span className="topic-copy"><b>{t.title}</b><small>{t.category}</small></span><span className="level-label">{t.level}</span><Plus size={17}/></button>)}</div><p className="muted footnote">Showing up to 80 matching prompts. Search narrows the {topicMode==='spontaneous'?'off-the-cuff':'deep-research'} collection; select a prompt to practise it.</p></section>}

      {tab==='progress'&&<section className="page-content"><div className="page-heading"><div className="eyebrow">YOUR DEVELOPMENT</div><h1 className="serif">Progress</h1><p className="muted">A clear view of the practice you have completed.</p></div><div className="stats-grid"><div className="stat-card"><span>SESSIONS WITH RECORDINGS</span><strong>{totalSessions}</strong><small>Saved audio sessions</small></div><div className="stat-card lifetime-card"><span>LIFETIME PRACTICE TIME</span><strong>{Math.floor(lifetimeSeconds/3600)}<em>h</em> {Math.floor((lifetimeSeconds%3600)/60)}<em>m</em></strong><small>Every second the practice timer runs, whether recorded or not. Never reduced by deleting audio.</small></div><div className="stat-card"><span>AVG. SELF SCORE</span><strong>{averageScore?averageScore.toFixed(1):'—'}<em>/5</em></strong><small>{averageScore?'From completed reviews':'No reviews yet'}</small></div><div className="stat-card"><span>RECORDINGS</span><strong>{recordings.length}</strong><small>Stored locally</small></div><div className="stat-card"><span>PERSONAL QUESTIONS</span><strong>{customQuestions.length}</strong><small>Your own Q&amp;A prompts</small></div></div><div className="panel chart-panel"><div className="flex justify-between items-center"><div><b>Recent self-assessments</b><p className="muted text-sm">Average of your saved review scores</p></div><BarChart3 className="text-mint"/></div>{recordings.filter(r=>r.ratings&&Object.keys(r.ratings).length).length===0?<div className="empty-state"><Activity size={26}/><b>Your progress will appear here</b><p>Record a practice session and complete its self-assessment to begin tracking improvement.</p></div>:<div className="score-bars">{ratingLabels.map(label=>{const vals=recordings.filter(r=>r.ratings?.[label]).map(r=>r.ratings![label]);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return <div key={label}><span>{label}</span><div className="bar-track"><i style={{width:`${avg/5*100}%`}}/></div><b>{avg?avg.toFixed(1):'—'}</b></div>})}</div>}</div><div className="panel insight-panel"><ShieldCheck size={20}/><div><b>Keep feedback honest</b><p className="muted">Scores on this dashboard come from your own saved self-assessments. Speaking speed and filler-word analysis are not estimated without transcription.</p></div></div></section>}

      {tab==='library'&&<section className="page-content"><div className="page-heading"><div className="eyebrow">PRIVATE ON THIS DEVICE</div><h1 className="serif">Recording library</h1><p className="muted">Your audio stays in this browser. Nothing is uploaded.</p></div>{recordings.length===0?<div className="panel empty-library"><div className="empty-icon"><FileAudio size={25}/></div><h2 className="serif">No saved recordings yet</h2><p className="muted">Record a practice or debate session, then save it here to listen back and track your reflections.</p><button className="primary" onClick={()=>setTab('practice')}><Mic size={17}/> Start a practice session</button></div>:<div className="recording-list">{recordings.map(r=><div className="panel recording-card" key={r.id}><div className="flex justify-between items-start gap-3"><div className="recording-info"><div className="flex items-center gap-2"><FileAudio size={17} className="text-mint"/><b>{r.title}</b></div><small>{new Date(r.createdAt).toLocaleDateString()} · {fmt(r.duration)} · {r.mimeType.includes('mp4')?'M4A/AAC':r.mimeType.includes('webm')?'WebM/Opus':r.mimeType||'Unknown format'}</small><p className="muted text-sm mt-2">{r.topic}</p></div><button className="icon-btn" onClick={()=>removeRecording(r.id)} title="Delete"><Trash2 size={16}/></button></div>{editing===r.id?<div className="rename-row"><input value={editValue} onChange={e=>setEditValue(e.target.value)}/><button className="text-action" onClick={()=>renameRecording(r)}>Save</button><button className="text-action" onClick={()=>setEditing(null)}>Cancel</button></div>:<div className="recording-controls"><audio controls src={recordingUrls.get(r.id)} /><button className="icon-btn" title="Rename" onClick={()=>{setEditing(r.id);setEditValue(r.title)}}><Settings2 size={16}/></button><button className="icon-btn" title="Download original format" onClick={()=>downloadBlob(r.blob,r.title,r.mimeType)}><Download size={16}/></button></div>}{r.notes&&<p className="reflection"><b>Reflection:</b> {r.notes}</p>}</div>)}</div>}<div className="privacy-note"><ShieldCheck size={16}/> Local-only storage. Clearing browser data may permanently remove recordings; export important files for backup.</div></section>}
    </main>
    <nav className="bottom-nav">{([{id:'practice',label:'Practice',icon:Mic},{id:'debate',label:'Debate',icon:Swords},{id:'topics',label:'Topics',icon:Compass},{id:'progress',label:'Progress',icon:BarChart3},{id:'library',label:'Library',icon:Library}] as const).map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}><item.icon size={21}/><span>{item.label}</span></button>)}</nav>
    {showReview&&activeBlob&&<div className="modal-backdrop"><div className="review-modal"><div className="flex justify-between items-center"><div><span className="eyebrow">SESSION COMPLETE</span><h2 className="serif text-2xl mt-1">Review your speech</h2></div><button className="icon-btn" onClick={()=>{setShowReview(false);setActiveBlob(null);if(activeUrl)URL.revokeObjectURL(activeUrl);setActiveUrl('')}}><X/></button></div><div className="audio-review"><audio controls src={activeUrl}/><span>{fmt(recordSeconds)} · {activeMime.includes('mp4')?'M4A/AAC':activeMime.includes('webm')?'WebM/Opus':activeMime||'Browser audio format'}</span></div><label className="field-label">Recording title</label><input value={saveTitle} onChange={e=>setSaveTitle(e.target.value)}/><div className="rating-grid">{ratingLabels.map(label=><label key={label}><span>{label}</span><select value={ratings[label]||''} onChange={e=>setRatings(v=>({...v,[label]:Number(e.target.value)}))}><option value="">Rate 1–5</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>)}</div><label className="field-label">One weakness to work on</label><input value={weakness} onChange={e=>setWeakness(e.target.value)} placeholder="What could be clearer?"/><label className="field-label">Next improvement target</label><input value={target} onChange={e=>setTarget(e.target.value)} placeholder="What will you try next time?"/><label className="field-label">Reflection notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What went well? What will you improve?"/><div className="flex gap-2 mt-4"><button className="secondary flex-1" onClick={()=>downloadBlob(activeBlob,saveTitle,activeMime)}><Download size={16}/> Export original</button><button className="primary flex-1" onClick={persistActive}><Save size={16}/> Save locally</button></div><p className="muted text-xs mt-3">Export uses the actual browser recording format. M4A is offered only when your browser recorded genuine MP4/AAC audio; other formats are never renamed as M4A.</p></div></div>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>
}
