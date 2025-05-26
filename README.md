This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Functionality

This application, "MIDI Akkord-Detektor" (MIDI Chord Detector), analyzes musical files to detect and display a chord progression.

### Supported File Types

Users can upload two types of files:

*   **MIDI Files:**
    *   Directly supported formats: `.mid`, `.midi`.
    *   These files are processed quickly as they already contain musical note data.

*   **Audio Files (WAV only):**
    *   Users can upload `.wav` audio files.
    *   These audio files are first converted to MIDI data using the `@spotify/basic-pitch` library. The resulting MIDI is then analyzed for chords.
    *   **Limitation:** Currently, only WAV (`.wav`) files are officially supported for audio input. While the file selection dialog may allow selecting other audio formats (e.g., `.mp3`, `.ogg`, `.flac`, `.aac`), these other formats will **not** be processed by the backend.
    *   **Processing Time:** Please be aware that processing audio files may take significantly longer than processing MIDI files due to the audio-to-MIDI conversion step.

The detected chord progression is then displayed to the user.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
