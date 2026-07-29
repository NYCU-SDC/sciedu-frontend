# SciEdu Frontend

## Getting Started

### Prerequisites

- Node.js 24 or higher
- pnpm (comes with Node.js)

### Installation

```shell
# Clone the repository
git clone https://github.com/NYCU-SDC/sciedu-frontend.git
cd sciedu-frontend

# Install dependencies
pnpm install

# Configure the local backend and development mode
cp example.env .env

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`. The default local configuration connects to the backend at `http://localhost:8080`, so follow `.deploy/local/README.md` in the backend repository and start the local backend before testing authentication.

### Development Scripts

| Command        | Description                                       |
| -------------- | ------------------------------------------------- |
| `pnpm dev`     | Start Vite dev server with hot module replacement |
| `pnpm build`   | TypeScript compilation + production build         |
| `pnpm lint`    | Run ESLint code analysis                          |
| `pnpm preview` | Preview production build locally                  |
