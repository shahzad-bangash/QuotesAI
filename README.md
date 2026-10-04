# QuotesAI ✨

> An intelligent, full-stack web application leveraging AI and Retrieval-Augmented Generation (RAG) to extract, manage, and generate beautiful quote graphics from your documents.



## 🌟 Overview

QuotesAI is built to bridge the gap between reading insightful documents and sharing those insights with the world. By uploading your favorite books, articles, or PDFs, QuotesAI parses, chunks, and stores the text in a vector database. Using semantic search and Google's Generative AI, it extracts highly relevant, thought-provoking quotes and can automatically render them into stunning, stylized graphic cards ready for social media.

This project was built to explore advanced RAG pipelines, modern UI/UX design with smooth animations, and seamless background job processing.

## 👥 User Roles & Testing

QuotesAI implements role-based access control with two primary user types: Standard Users and Administrators.

### Standard Users
By default, newly registered accounts are Standard Users. They are subject to usage limits to prevent abuse:
- **Documents**: Upload up to 1 document.
- **Image Generation**: Generate up to 3 quote images.
- **Book Quote Searches**: Perform up to 3 book quote searches.

**Live Demo Bypass:** If you want to test the application without using a real email address, you can use the built-in test bypass. 
Register with **any email ending in `@quotesai.com`** (for example: `test@quotesai.com`). When prompted for the email verification OTP, simply enter **`123456`**.

## ✨ Key Features

- **Document Processing (RAG)**: Upload text or PDF documents to be parsed, chunked, and embedded into a vector database (ChromaDB).
- **Intelligent Quote Extraction**: Semantic search capabilities that find highly relevant quotes using AI rather than just keyword matching.
- **Automated Image Generation**: Automatically renders beautiful, stylized graphic cards from extracted quotes using Playwright.
- **Background Scheduler**: Automated background jobs that pull quotes and generate images based on user topic preferences.
- **User Authentication**: Secure signup, login, JWT-based session management, and OTP-based email verification using gmail app.
- **Customizable & Responsive UI**: A beautiful, fully responsive interface featuring smooth animations (Framer Motion) and multiple theme support (Light, Dark, Cyber, Crimson).

## 🛠️ Architecture & Tech Stack

QuotesAI is built with a modern, decoupled architecture separating the highly interactive frontend from the computationally heavy, AI-driven backend.

### Frontend (Client-Side)
- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui, Base UI & Lucide Icons
- **Animations**: Framer Motion
- **State Management**: React Context API

### Backend (Server-Side & AI)
- **Framework**: FastAPI (Python)
- **Relational Database**: PostgreSQL (Production) / SQLite (Local) with SQLAlchemy ORM
- **Vector Database**: ChromaDB (for semantic document search)
- **AI/LLM**: Google Generative AI (Gemini) for embeddings and text generation
- **Authentication**: bcrypt password hashing & JWT tokens
- **Graphic Rendering**: Playwright (HTML to Image rendering)
- **Background Jobs**: APScheduler

## 🔮 Roadmap & Planned Features

- [x] **Email Verification**: OTP-based email verification gmail template.
- [x] **Image Generation**: Generate beautiful, stylized image cards for quotes.
- [ ] **Social Sharing**: Direct integrations to share generated quotes to X/Twitter, Facebook, or LinkedIn.
- [ ] **Quote Collections**: Organize favorite quotes into custom categories or folders.
- [ ] **Daily Quote Push**: A scheduler to send a curated "Quote of the Day" based on preferences.
- [ ] **More Document Formats**: Ingestion support for `.docx`, `.epub`.
- [ ] **Advanced RAG Analytics**: Highlight exactly where a quote was extracted from (page number, surrounding context).
- [ ] **OAuth Integration**: Social logins via Google or GitHub.

## 📸 Application Gallery

### Dashboard
The central hub for QuotesAI, providing a high-level overview of your activity, recent generations, and quick access to core tools.
<p align="center"><img src="./assets/dashboard.png" alt="Dashboard" width="80%"></p>

### Image Generator
The creative engine of QuotesAI. Turn extracted quotes into beautiful, stylized, and shareable graphic cards customized to your taste.
<p align="center"><img src="./assets/generator.png" alt="Image Generator" width="80%"></p>

### RAG Document Processing
Upload and manage your documents. Here, QuotesAI parses and chunks your text, embedding it into the ChromaDB vector database for semantic retrieval.
<p align="center"><img src="./assets/rag.png" alt="RAG Document Processing" width="80%"></p>

### Document Library
A unified view of all your uploaded and processed documents, allowing you to easily browse, organize, and select sources for quote extraction.
<p align="center"><img src="./assets/library.png" alt="Document Library" width="80%"></p>

### Quotes Explorer
Leveraging semantic search powered by the **Google Generative AI (Gemini) API** and ChromaDB, the Quotes Explorer intelligently sifts through your library to extract and present highly relevant quotes based on your queries.
<p align="center"><img src="./assets/explorer.png" alt="Quotes Explorer" width="80%"></p>

### Book Quotes Explorer
Search for your favorite books or authors and automatically extract famous exact quotes directly from the source text. This feature uses the **Gutendex API** (Project Gutenberg) to fetch public domain books, and the **Google Generative AI (Gemini) API** to intelligently extract the most meaningful quotes.

### Background Scheduler
Automate your inspiration. The scheduler runs background jobs to automatically pull quotes and generate stunning images based on your preferred topics and intervals.
<p align="center"><img src="./assets/scheduler.png" alt="Background Scheduler" width="80%"></p>

### User Profile
Manage your account details, preferences, and customized settings to tailor the QuotesAI experience to your needs.
<p align="center"><img src="./assets/profile.png" alt="User Profile" width="80%"></p>

## 🔐 Environment Variables

To run this project locally or in production, you need to configure the following environment variables.

### Backend (`backend/.env`)

Create a `.env` file in the `backend` directory with the following variables:

- `LLM_API_KEY`: Your Google Generative AI (Gemini) API key used for embeddings and text generation.
- `GMAIL_ADDRESS`: The Gmail address used to send out OTP verification emails.
- `GMAIL_APP_PASSWORD`: The App Password for your Gmail account.
- `DATABASE_URL`: The database connection string (e.g., PostgreSQL URL like `postgresql://user:password@host/db`).

### Frontend (`frontend/.env` - Optional)

You can create a `.env` or `.env.local` file in the `frontend` directory:

- `NEXT_PUBLIC_API_URL`: The URL of your FastAPI backend. Defaults to `http://localhost:8000` if not set.

## 📦 External Tools & Infrastructure Versions

This section tracks the versions of external tools, runtime environments, and infrastructure software required to run and deploy the QuotesAI application smoothly.

### Runtime Environments
- **Python:** 3.14.x (Required for the FastAPI backend)
- **Node.js:** 26.x.x (Required for the Next.js frontend)

### Databases & Infrastructure
- **PostgreSQL:** 18.x (Required for user authentication and relational data)
- **ChromaDB:** Local persistence (embedded vector database via python dependency `chromadb`)

### Notes for Deployment
When deploying to cloud platforms (like Render, Vercel, or AWS):
1. Ensure the platform is configured to use at least **Node 26** for the frontend.
2. Ensure the backend environment uses **Python 3.14**.
3. Provision a **PostgreSQL 18** (or compatible 14+) database instance and supply the connection string as `DATABASE_URL` in the environment variables.

---
*Note: This repository is presented as a portfolio showcase. The source code is provided for demonstration of the architecture, tech stack, and implementation details.*
