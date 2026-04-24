import ModelIcon from '@/components/ModelIcon';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-[24px] font-black text-[#333] mb-2">How It Works</h1>
        <p className="text-[13px] text-[#666] max-w-lg mx-auto">
          Three competing AI models analyze every sporting event, and where they agree, we bet.
        </p>
      </div>

      {/* Pipeline */}
      <div className="space-y-4 mb-12">
        {[
          {
            step: '01',
            title: 'Scrape the Odds',
            description:
              'Every morning, we pull live odds from Sportsbet.com.au across every major sport — AFL, NRL, NBA, UFC, horse racing, greyhounds, soccer, and more. We capture odds, event details, venues, and start times for 20-30 events daily.',
            color: '#f47920',
          },
          {
            step: '02',
            title: 'Feed the Models',
            description:
              'The same event data and odds are sent simultaneously to three competing AI models: Claude (Anthropic), GPT (OpenAI), and Gemini (Google). Each model independently analyzes the matchup and picks a winner with reasoning and a confidence score. No model sees the others\' picks.',
            color: '#A855F7',
          },
          {
            step: '03',
            title: 'Find Consensus',
            description:
              'We compare all three picks for each event. When 2 out of 3 models agree, that\u2019s a medium-confidence pick. When all 3 agree, that\u2019s high confidence. Split decisions (all three disagree) are discarded entirely.',
            color: '#004a99',
          },
          {
            step: '04',
            title: 'Build the Multi',
            description:
              'The top 4-6 consensus picks are assembled into a daily multi bet. High-confidence picks (3/3 agree) get higher stake allocation at 5% of bankroll. Medium-confidence multis (mostly 2/3 agree) get 2%. Combined odds are calculated by multiplying all individual legs.',
            color: '#00a651',
          },
          {
            step: '05',
            title: 'Track Everything',
            description:
              'Every daily multi is tracked with full transparency. Win or lose, the result is recorded. The bankroll updates in real-time. You can see every pick, every reasoning, every result — no hiding the losses.',
            color: '#d32f2f',
          },
        ].map((item) => (
          <div
            key={item.step}
            className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-5 flex items-start gap-4"
          >
            <span
              className="text-[20px] font-black shrink-0"
              style={{ color: item.color }}
            >
              {item.step}
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-[#333] mb-1">{item.title}</h3>
              <p className="text-[13px] text-[#666] leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* The Models */}
      <div className="mb-12">
        <h2 className="text-[18px] font-bold text-[#333] text-center mb-6">The Three Models</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              model: 'claude' as const,
              name: 'Claude',
              maker: 'Anthropic',
              style: 'Analytical & Probability-Focused',
              description:
                'Claude approaches each event with pure probability analysis. It calculates implied probabilities from the odds, identifies market inefficiencies, and makes selections based on expected value calculations. Methodical and precise.',
              borderColor: '#A855F7',
            },
            {
              model: 'gpt' as const,
              name: 'GPT',
              maker: 'OpenAI',
              style: 'Stats-Heavy & Historical',
              description:
                'GPT leans heavily on statistical models and historical data. It references head-to-head records, seasonal performance metrics, and advanced analytics. Sometimes contrarian when the data disagrees with the market.',
              borderColor: '#10B981',
            },
            {
              model: 'gemini' as const,
              name: 'Gemini',
              maker: 'Google',
              style: 'Trend & Momentum-Based',
              description:
                'Gemini focuses on recent form, momentum shifts, and trajectory analysis. It identifies which teams or athletes are trending up or down, and weights current form heavily in its predictions.',
              borderColor: '#3B82F6',
            },
          ].map((m) => (
            <div
              key={m.model}
              className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-4"
              style={{ borderTopColor: m.borderColor, borderTopWidth: 3 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <ModelIcon model={m.model} />
                <div>
                  <div className="text-[13px] font-bold text-[#333]">{m.name}</div>
                  <div className="text-[10px] text-[#999]">{m.maker}</div>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-[#333] mb-2">{m.style}</div>
              <p className="text-[11px] text-[#666] leading-relaxed">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Consensus Works */}
      <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm p-6 mb-12">
        <h2 className="text-[18px] font-bold text-[#333] mb-5 text-center">Why Consensus Beats Solo</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-[24px] font-black text-[#999] mb-1">1 Model</div>
            <div className="text-[12px] text-[#666]">Each model alone has blind spots. Claude might miss momentum shifts. GPT might over-index on historical data that no longer applies. Gemini might chase false trends.</div>
          </div>
          <div>
            <div className="text-[24px] font-black text-[#004a99] mb-1">2/3 Agree</div>
            <div className="text-[12px] text-[#666]">When two different analytical approaches reach the same conclusion independently, it significantly reduces the chance of a systematic error. Different methodologies, same answer.</div>
          </div>
          <div>
            <div className="text-[24px] font-black text-[#f47920] mb-1">3/3 Agree</div>
            <div className="text-[12px] text-[#666]">Full consensus across three fundamentally different approaches — probability, statistics, and momentum — is a strong signal. These picks historically outperform single-model selections.</div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-[11px] text-[#999] max-w-lg mx-auto">
        This is a content experiment. Gambling involves risk. Past results don&apos;t guarantee future performance. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1800 858 858.
      </div>
    </div>
  );
}
