# BonChat

BonChat is a modern, real-time video conferencing and chat application built with **Next.js** and **Supabase**. It leverages **WebRTC** to enable secure, low-latency peer-to-peer video and audio communication directly in the browser.

## Key Features

- **Real-time Video & Audio Calls**: High-quality P2P communication powered by WebRTC and Simple Peer.
- **Instant Messaging**: Real-time chat functionality synchronized via Supabase.
- **Secure Authentication**: User management and authentication handled by Supabase Auth.
- **Screen Sharing**: Easily share your screen with other participants.
- **File Sharing**: Share files and images directly within the chat interface.
- **Video Filters**: Apply fun real-time video filters (Grayscale, Sepia, Blur, etc.).
- **Meeting Recording**: Record your meetings directly from the client.
- **Waiting Room**: Host control for admitting participants to the meeting.
- **Modern UI**: Sleek, responsive interface built with Tailwind CSS.

## Tech Stack

-   **Frontend**: [Next.js 15](https://nextjs.org/), [React 19](https://react.dev/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Auth, Storage)
-   **WebRTC**: [simple-peer](https://github.com/feross/simple-peer) for peer-to-peer connections
-   **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm or yarn
-   A [Supabase](https://supabase.com/) project

### Installation

1.  **Clone the repository:**
    ```bash
<<<<<<< HEAD
    git clone https://github.com/yourusername/bonchat-web.git
=======
    git clone https://github.com/Muzaffar01/bonchat-web.git
>>>>>>> 6a1769ecff46fc588cf436511fe0be5dba72743f
    cd bonchat-web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Configuration:**

    Create a `.env.local` file in the root directory and add your Supabase credentials:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

    > **Note**: You can find these keys in your Supabase Project Settings -> API.

4.  **Database Setup:**

    Ensure your Supabase project has the required tables designed for messaging. (If you have a schema file `supabase_schema.sql`, you can run it in the SQL Editor of your Supabase dashboard).

5.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1.  **Sign Up/Login**: Create an account or log in to access the app.
2.  **Create a Room**: Start a new meeting room.
3.  **Invite Others**: Share the room ID or URL with others to join.
4.  **Collaborate**: Use chat, video, and screen sharing to collaborate.

## Deployment

This application is optimized for deployment on [Vercel](https://vercel.com/).

1.  Push your code to a Git repository.
2.  Import the project into Vercel.
3.  Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel Environment Variables.
4.  Deploy!

## License

[MIT](LICENSE)
