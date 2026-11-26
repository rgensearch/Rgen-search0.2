# RGen Search – AI Integration Setup (Hinglish)

## Is ZIP mein kya update hua hai
- `api/ai.js`: Gemini API request, selected paper abstracts + uploaded document text, clearer errors, temporary 503/429 retry, and a lower-cost fallback model.
- `src/App.jsx`: correct request payload, visible AI answers, interactive AI quiz/flashcards/games, and text extraction for PDF, DOCX, PPTX and TXT.
- `package.json`: JSZip added for PPTX text extraction.
- `src/style.css`: AI response display styling.

## Phone se GitHub par update karne ke steps
1. ZIP ko extract karo.
2. GitHub par apna repository `rgensearch/Rgen-search0.2` kholo.
3. Repository ke existing files ko update karte waqt folder structure same rakho:
   - `api/ai.js`
   - `src/App.jsx`
   - `src/style.css`
   - `package.json`
4. `.env.example` ko upload karna optional hai. Ismein real key nahi hai.
5. Changes commit karo. Vercel ko automatic deployment start karna chahiye.
6. Vercel > Project > Settings > Environment Variables mein check karo ki `GEMINI_API_KEY` Production (aur agar preview test karna hai to Preview) environment ke liye saved hai.
7. Agar key pehle se saved hai, uski value change mat karo. Sirf verify karo ki variable ka exact naam `GEMINI_API_KEY` hai.
8. Environment Variable add/change kiya ho to Vercel se latest deployment ko Redeploy karo.

## Website par test
1. Research page par topic search karo.
2. Ek paper ke checkbox ko select karo; phir AI Workspace kholo.
3. Individual summary aur Easy explanation test karo.
4. Do ya zyada papers select karke Collective summary test karo.
5. PDF/DOCX/PPTX/TXT ka text-based document upload karke AI quiz, flashcards aur games test karo.
6. AI quiz/flashcards/games buttons generated interactive practice pages par le jayenge.

## Important limits
- Research search Crossref metadata/abstract dhoondhta hai. DOI ya publisher link hone ka matlab full paper ka text automatically download hona nahi hai. AI summary selected result ke title/abstract aur jo document text tum upload karte ho, usi par based hoti hai.
- Scanned/image-only PDFs mein selectable text nahi hota; unka OCR is build mein included nahi hai. Aise PDF ke liye readable/text-based PDF use karo.
- 50 MB upload limit frontend par enforced hai. AI request ke liye document text ko 80,000 characters tak limit kiya gaya hai.
- Gemini ki taraf se temporary 503/429 response aa sakta hai. Code limited retry aur fallback try karta hai, lekin provider outage ko guarantee ke saath prevent nahi kar sakta.
- Free usage, quotas, model access and billing Google AI Studio/Google AI terms and account limits par depend karte hain. “Free” unlimited usage ki guarantee nahi hai.

## Security
- Real `GEMINI_API_KEY` ko GitHub code, screenshots, chat, ya `.env.example` mein kabhi mat daalna.
- Key sirf Vercel Environment Variables mein rakho. Browser code ko key kabhi nahi bheji jaati.
