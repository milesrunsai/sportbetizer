'use client';

interface ModelIconProps {
  model: 'claude' | 'gpt' | 'gemini';
  agrees?: boolean;
  size?: 'sm' | 'md';
}

const config = {
  claude: { label: 'C', color: '#A855F7', name: 'Claude' },
  gpt: { label: 'G', color: '#22C55E', name: 'GPT' },
  gemini: { label: 'Ge', color: '#3B82F6', name: 'Gemini' },
};

export default function ModelIcon({ model, agrees = true, size = 'md' }: ModelIconProps) {
  const { label, color, name } = config[model];
  const dim = size === 'sm' ? 28 : 36;

  return (
    <div className="flex flex-col items-center gap-1" title={name}>
      <div
        className="rounded-full flex items-center justify-center font-bold text-black transition-all"
        style={{
          width: dim,
          height: dim,
          backgroundColor: agrees ? color : 'transparent',
          border: `2px solid ${color}`,
          opacity: agrees ? 1 : 0.3,
          fontSize: size === 'sm' ? 10 : 12,
          color: agrees ? '#000' : color,
        }}
      >
        {label}
      </div>
      {size === 'md' && (
        <span className="text-[10px] text-zinc-500">{name}</span>
      )}
    </div>
  );
}
