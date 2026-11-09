# Unprompted

A local-first communication and public-speaking practice app built with React, TypeScript, Vite and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
npm run preview
```

Deploy the project directory to Vercel. `vercel.json` is included for SPA routing.

## Included in this rebuild

- Five primary areas: Practice, Debate, Topics, Progress and Library.
- Purple/dark and light themes, with the selected theme stored locally.
- Spontaneous, prepared/deep-research, extended and Q&A practice modes.
- Configurable speaking timer, pause/resume/reset and lifetime timer-minute tracking independent of audio recordings.
- Ten speaking frameworks.
- Browser audio recording, waveform feedback, playback, local IndexedDB storage, rename, delete and export in the actual recorded format.
- Session self-review, reflection notes and ratings.
- Generated spontaneous and prepared topic collections, including personality-focused topics; the topic count is calculated from the bank at runtime.
- Search and category filtering, recent-topic avoidance, custom Q&A questions.
- Debate motions, proposition/opposition, preparation notes, structured rounds, rebuttal and cross-examination practice modes.
- Exercise prompts for Explain Anything, Argue Both Sides, Storytelling, Summarisation, Vocabulary, Interview, Presentation, Meetings, Conversation Simulator, Active Listening, Question Crafting, Conciseness, Real-Life Scenarios, Persuasion/Rhetoric and Movie/Book Explanation.
- The supplemental 20,000-prompt CSV dataset is included at `public/data/20000_speaking_topics.csv`.
- Mobile layout spacing fixes for the fixed bottom navigation and timer label wrapping.

## Important implementation notes

- All user content and recordings are stored locally in the browser. Clearing site data can erase them; export important recordings and keep backups.
- Audio export always uses the browser's actual recording MIME type. The app does not relabel WebM as M4A. Genuine M4A/AAC is available only when the browser records a compatible MP4/AAC format.
- No paid API or AI service is required. Debate and conversation practice are structured self-practice prompts, not a live AI opponent.
- Speech transcription and automatic speech analytics, cloud sync, cross-device accounts, full curated research notes for every prompt, and an automated adaptive coaching engine are not included in this offline build.
- The 20,000-row CSV is included as a supplemental data asset; the current topic browser uses the generated topic bank in `src/lib/topicBank.ts`.

## Browser requirements

Use a modern browser. Microphone recording requires permission and a secure context (HTTPS or localhost). IndexedDB and MediaRecorder support vary by browser.
