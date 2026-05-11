// Entry point — sets page metadata and renders the main component.
import Head from "next/head";
import CoverLetterGen from "../components/CoverLetterGen";

export default function Home() {
  return (
    <>
      <Head>
        <title>Cover Letter Generator</title>
        <meta name="description" content="AI-powered cover letter generator. Paste your background and the job description — get a tailored letter in seconds." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CoverLetterGen />
    </>
  );
}
