
  # High-Fidelity Chatbot Prototype

  This is a code bundle for High-Fidelity Chatbot Prototype. The original project is available at https://www.figma.com/design/EeO32LGPaBgtsAY7tm0sIu/High-Fidelity-Chatbot-Prototype.

  ## Requirements
  - Node.js 20 LTS (`nvm use` with `.nvmrc` recommended)
  - npm 10+

  ## Setup
  1. Install dependencies
     - `npm ci`
  2. Configure environment
     - Copy `.env.example` to `.env.local` and fill in values
  3. Start dev server
     - `npm run dev`
     - You can override dev server host/port and allowed hosts via `.env.local`:
       - `DEV_SERVER_HOST`, `DEV_SERVER_PORT`, `DEV_ALLOWED_HOSTS`
       - Optional HMR overrides: `DEV_HMR_HOST`, `DEV_HMR_PORT`

  ## Build
  - `npm run build` (outputs to `build/`)

  ## Notes
  - Do not commit any `.env*` file except `.env.example`.
  - Set your own API keys locally.
  
