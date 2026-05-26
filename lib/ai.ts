const AFFIRMATIONS = [
  'You are capable of more than you realize — keep going! 💫',
  'Every effort you make today is building the future you want. 🌟',
  'You have the strength to handle whatever today brings. 💪',
  'Small progress is still progress. You\'re doing great. ✨',
  'Believe in your ability to learn, grow, and succeed. 🎯',
  'You\'ve overcome challenges before — this is no different. 🔥',
  'Your hard work is creating opportunities you can\'t even see yet. 🌱',
  'You are smart, resilient, and absolutely capable. 💎',
  'Today is full of possibilities — make the most of them! ☀️',
  'You are not behind. You are exactly where you need to be. 🌿',
  'Your dedication to your goals will pay off. Stay the course. 🚀',
  'It\'s okay to take it one step at a time. You\'ve got this. 👊',
  'The person you\'re becoming is worth every hard moment. 🌻',
  'You bring unique strengths to everything you do. Own that. ⚡',
  'Rest when needed, but never quit. You\'re doing amazing. 🏆',
  'You show up every day — that\'s more powerful than you know. 🔑',
  'Challenges are just proof that you\'re growing. 🌊',
  'Your future self will thank you for not giving up today. 🎓',
  'Focus on progress, not perfection. 💙',
  'You are worth the investment of your own time and energy. 🌈',
  'Every expert was once a beginner. Keep learning. 📚',
];

const POWER_QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"You are braver than you believe, stronger than you seem." — A.A. Milne',
  '"It does not matter how slowly you go, as long as you do not stop." — Confucius',
  '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"In the middle of difficulty lies opportunity." — Albert Einstein',
  '"Success is not final, failure is not fatal: it is the courage to continue that counts." — Winston Churchill',
  '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt',
  '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
  '"Hard work beats talent when talent doesn\'t work hard." — Tim Notke',
  '"Education is the most powerful weapon you can use to change the world." — Nelson Mandela',
  '"The expert in anything was once a beginner." — Helen Hayes',
  '"Push yourself, because no one else is going to do it for you." ✊',
  '"Great things never come from comfort zones." 🌟',
  '"Dream it. Wish it. Do it." ✨',
  '"Your limitation — it\'s only your imagination." 💡',
  '"Sometimes later becomes never. Do it now." ⏰',
  '"Great stories come from trying things that scare you." 🔥',
];

const ENCOURAGEMENTS_LOW = [
  'Sending you a big virtual hug. 💙 It\'s okay to have tough days — they pass. You\'re still here, and that takes courage.',
  'Rough days are real, but they\'re not permanent. 🌤️ Take it one hour at a time. You\'ve gotten through hard days before.',
  'I see you, and I\'m rooting for you. 💜 Be gentle with yourself today — rest is productive too.',
  'Even on hard days, you\'re still moving forward. 🌱 That\'s something worth recognizing. You\'ve got this.',
  'Struggling means you\'re still in the fight. 💪 Take a breath, give yourself grace, and know that tomorrow is a fresh start.',
];

async function callClaude(prompt: string, maxTokens = 500): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content: Array<{ text: string }> };
    return data.content[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function generateQuiz(subject: string): Promise<string> {
  const result = await callClaude(
    `Generate exactly 3 short practice questions for a college student studying "${subject}". Number them 1, 2, 3. Be concise and educational. Just the questions — no answers.`,
    300
  );
  if (result) return result;
  return `Add ANTHROPIC_API_KEY to Vercel to enable AI quiz generation.\n\nMeanwhile, search for "${subject}" practice questions at:\nhttps://www.google.com/search?q=${encodeURIComponent(subject + ' practice questions')}`;
}

export async function findAndSummarize(topic: string): Promise<string> {
  const result = await callClaude(
    `Give a 2-3 sentence summary of "${topic}" for a college student, then suggest one specific resource URL. Be concise.`,
    200
  );
  if (result) return result;
  return `Here\'s a Google search for "${topic}":\nhttps://www.google.com/search?q=${encodeURIComponent(topic)}`;
}

export function getDailyAffirmation(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

export function getRandomQuote(): string {
  return POWER_QUOTES[Math.floor(Math.random() * POWER_QUOTES.length)];
}

export function getLowMoodEncouragement(): string {
  return ENCOURAGEMENTS_LOW[Math.floor(Math.random() * ENCOURAGEMENTS_LOW.length)];
}
