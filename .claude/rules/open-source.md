# Open-source hygiene (always applies: this repo is public)

- **Never commit the EPN guide or PHYWE photos**: PDFs, page renders or screenshots, copied figures, verbatim
  paragraphs, product photos. `refs/` is gitignored. Paraphrased facts, numerical values and our own drawings and data
  are fine when cited ("EPN, Práctica 1 MRUV, Laboratorio de Física").
- Cite sources in the README and in doc comments: the EPN guide and literature values (GUM, Taylor, WGS84).
- No secrets, tokens, local absolute paths (`/home/...`) or machine-specific settings in committed files.
  `.claude/settings.local.json` stays local.
- Licensing: MIT for code (`LICENSE`), CC BY 4.0 for educational content (`LICENSE-CONTENT`). New dependencies must be
  MIT/BSD/Apache/ISC; ask before adding GPL/AGPL or anything unclear.
- Prefer few, small, well-maintained dependencies. Every dependency ships to students' phones.
- Write for strangers: clear README, reproducible setup (`package-lock.json`), commit messages that explain why.
- Not affiliated with the Escuela Politécnica Nacional or PHYWE; say so in the README and in the app footer. PHYWE and
  DigiCart are trademarks of their owners; use the names descriptively only, with no logos.
