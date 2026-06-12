# AI-Meeting-Copilot
# AI Meeting Copilot

AI Meeting Copilot is an intelligent meeting assistant that helps users record, transcribe, summarize, and manage meeting discussions efficiently. The application leverages AI to generate meeting summaries, extract key points, identify action items, and improve productivity.

## Features

* 🎙️ Real-time meeting transcription
* 🤖 AI-generated meeting summaries
* 📝 Automatic extraction of key discussion points
* ✅ Action item detection and tracking
* 📂 Meeting history management
* 🔍 Search and review previous meetings
* 🌐 User-friendly web interface
* 🔒 Secure data handling

## Tech Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js / Express.js
* REST APIs

### Database

* MongoDB

### AI Integration

* OpenAI API
* Speech-to-Text Processing
* Natural Language Processing (NLP)

## Project Structure

```text
AI-Meeting-Copilot/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── config/
│   └── server.js
│
├── README.md
└── .gitignore
```

## Installation

### Clone Repository

```bash
git clone https://github.com/Jahnavi-Priya-28/AI-Meeting-Copilot.git
cd AI-Meeting-Copilot
```

### Backend Setup

```bash
cd backend
npm install
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Environment Variables

Create a `.env` file in the backend folder and add:

```env
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## Usage

1. Start the backend server.
2. Start the frontend application.
3. Open the application in your browser.
4. Upload or record meeting audio.
5. View AI-generated transcripts, summaries, and action items.

## Future Enhancements

* Multi-language transcription
* Speaker identification
* Calendar integration
* Meeting analytics dashboard
* Cloud storage support

## Author

**Jahnavi Priya**

GitHub: https://github.com/Jahnavi-Priya-28

## License

This project is developed for educational and academic purposes.
