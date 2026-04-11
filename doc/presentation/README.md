# Export to PDF

```bash
# One-time setup
cd doc/presentation
npm install
npx playwright install chromium

# Render to PDF
node export-pdf.mjs
# or
npm run export-pdf

# Custom output path
node export-pdf.mjs ~/Desktop/my-talk.pdf
```