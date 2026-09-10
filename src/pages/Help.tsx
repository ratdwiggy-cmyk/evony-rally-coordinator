import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ: FaqItem[] = [
  {
    question: "How do I join my alliance's board?",
    answer:
      "Open the link your alliance shares, then enter your in-game name and the alliance's join code when prompted. You only need to do this once per device — you'll stay signed in after that.",
  },
  {
    question: 'How do I update my status?',
    answer:
      'Go to the Status Board or your Profile page and use "Edit my status." You can only ever edit your own record — there is no way to change anyone else\'s.',
  },
  {
    question: 'What does "Available Until" do?',
    answer:
      'It marks when your current availability window ends. Once that time passes, your status automatically switches to Unavailable for everyone viewing the board — no one needs to remember to update it for you.',
  },
  {
    question: 'Why did my status change to Unavailable on its own?',
    answer:
      'Your "Available Until" time passed. This happens automatically and live, for every viewer, so the board never shows a stale "Available" after your window has closed.',
  },
  {
    question: 'Does this work without an internet connection?',
    answer:
      "You'll see the last board data your device had before going offline, along with an offline banner so it's clear the information may not be current. Any status change you make while offline is queued and sent automatically once you're back online.",
  },
  {
    question: 'Can I install this as an app?',
    answer:
      'Yes — most phones and desktop browsers offer an "Install" or "Add to Home Screen" option for this site. Installing gives you a home-screen icon and a faster-loading, full-screen experience.',
  },
  {
    question: 'Can I edit someone else\'s status for them?',
    answer:
      'No. Every player can only edit their own record — this is enforced by the server, not just hidden in the interface, so it can\'t be worked around.',
  },
];

export function Help() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ash-50">Help</h1>
        <p className="mt-1 text-sm text-ash-400">
          Answers to common questions. Looking for what this tool is for in general? See{' '}
          <Link to="/about" className="text-gold underline underline-offset-2 hover:text-gold-bright">
            About
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FAQ.map((item) => (
          <Card key={item.question} aria-labelledby={slugify(item.question)}>
            <h2 id={slugify(item.question)} className="mb-2 font-display text-base text-gold">
              {item.question}
            </h2>
            <p className="text-sm leading-relaxed text-ash-200">{item.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function slugify(text: string): string {
  return 'faq-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
