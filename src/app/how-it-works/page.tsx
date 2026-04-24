import ModelIcon from '@/components/ModelIcon';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">How It Works</h1>
        <p className="text-zinc-500 max-w-lg mx-auto">
          Three competing AI models analyze every sporting event, and where they agree, we bet.
        </p>
      </div>

      {/* Pipeline */}
      <div className="space-y-8 mb-16">
        {[
          {
            step: '01',
            title: 'Scrape the Odds',
            description:
              'Every morning, we pull live odds from Sportsbet.com.au across every major sport — AFL, NRL, NBA, UFC, horse racing, greyhounds, soccer, and more. We capture odds, event details, venues, and start times for 20-30 events daily.',
            accent: 'text-green-500',
            bg: 'bg-green-500/5 border-green-500/20',
          },
          {
            step: '02',
            title: 'Feed the Models',
            description:
              'The same event data and odds are sent simultaneously to three competing AI models: Claude (Anthropic), GPT (OpenAI), and Gemini (Google). Each model independently analyzes the matchup and picks a winner with reasoning and a confidence score. No model sees the others\' picks.',
            accent: 'text-purple-500',
            bg: 'bg-purple-500/5 border-purple-500/20',
          },
          {
            step: '03',
            title: 'Find Consensus',
            description:
              'We compare all three picks for each event. When 2 out of 3 models agree, that\u2019s a medium-confidence pick. When all 3 agree, that\u2019s high confidence. Split decisions (all three disagree) are discarded entirely.',
            accent: 'text-yellow-500',
            bg: 'bg-yellow-500/5 border-yellow-500/20',
          },
          {
            step: '04',
            title: 'Build the Multi',
            description:
              'The top 4-6 consensus picks are assembled into a daily multi bet. High-confidence picks (3/3 agree) get higher stake allocation at 5% of bankroll. Medium-confidence multis (mostly 2/3 agree) get 2%. Combined odds are calculated by multiplying all individual legs.',
            accent: 'text-blue-500',
            bg: 'bg-blue-500/5 border-blue-500/20',
          },
          {
            step: '05',
            title: 'Track Everything',
            description:
              'Every daily multi is tracked with full transparency. Win or lose, the result is recorded. The bankroll updates in real-time. You can see every pick, every reasoning, every result — no hiding the losses.',
            accent: 'text-red-500',
            bg: 'bg-red-500/5 border-red-500/20',
          },
        ].map((item) => (
          <div
            key={item.step}
            className={`border rounded-xl p-6 ${item.bg}`}
          >
            <div className="flex items-start gap-4">
              <span className={`text-2xl font-black ${item.accent} shrink-0`}>
                {item.step}
              </span>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The Models */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-white text-center mb-8">The Three Models</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              model: 'claude' as const,
              name: 'Claude',
              maker: 'Anthropic',
              style: 'Analytical & Probability-Focused',
              description:
                'Claude approaches each event with pure probability analysis. It calculates implied probabilities from the odds, identifies market inefficiencies, and makes selections based on expected value calculations. Methodical and precise.',
              color: 'border-purple-500/30 bg-purple-500/5',
            },
            {
              model: 'gpt' as const,
              name: 'GPT',
              maker: 'OpenAI',
              style: 'Stats-Heavy & Historical',
              description:
                'GPT leans heavily on statistical models and historical data. It references head-to-head records, seasonal performance metrics, and advanced analytics. Sometimes contrarian when the data disagrees with the market.',
              color: 'border-green-500/30 bg-green-500/5',
            },
            {
              model: 'gemini' as const,
              name: 'Gemini',
              maker: 'Google',
              style: 'Trend & Momentum-Based',
              description:
                'Gemini focuses on recent form, momentum shifts, and trajectory analysis. It identifies which teams or athletes are trending up or down, and weights current form heavily in its predictions.',
              color: 'border-blue-500/30 bg-blue-500/5',
            },
          ].map((m) => (
            <div key={m.model} className={`border rounded-xl p-5 ${m.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <ModelIcon model={m.model} />
                <div>
                  <div className="text-sm font-bold text-white">{m.name}</div>
                  <div className="text-[10px] text-zinc-500">{m.maker}</div>
                </div>
              </div>
              <div className="text-xs font-semibold text-zinc-300 mb-2">{m.style}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Consensus Works */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-16">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Why Consensus Beats Solo</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-black text-zinc-600 mb-1">1 Model</div>
            <div className="text-sm text-zinc-500">Each model alone has blind spots. Claude might miss momentum shifts. GPT might over-index on historical data that no longer applies. Gemini might chase false trends.</div>
          </div>
          <div>
            <div className="text-3xl font-black text-yellow-500 mb-1">2/3 Agree</div>
            <div className="text-sm text-zinc-500">When two different analytical approaches reach the same conclusion independently, it significantly reduces the chance of a systematic error. Different methodologies, same answer.</div>
          </div>
          <div>
            <div className="text-3xl font-black text-green-500 mb-1">3/3 Agree</div>
            <div className="text-sm text-zinc-500">Full consensus across three fundamentally different approaches — probability, statistics, and momentum — is a strong signal. These picks historically outperform single-model selections.</div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-zinc-700 max-w-lg mx-auto">
        This is a content experiment. Gambling involves risk. Past results don&apos;t guarantee future performance. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1800 858 858.
      </div>
    </div>
  );
}
