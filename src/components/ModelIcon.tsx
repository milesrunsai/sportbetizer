'use client';

interface ModelIconProps {
  model: 'claude' | 'gpt' | 'gemini';
  agrees?: boolean;
  size?: 'sm' | 'md';
}

const config = {
  claude: { label: 'C', color: '#A855F7', name: 'Claude' },
  gpt: { label: 'G', color: '#10B981', name: 'GPT' },
  gemini: { label: 'Ge', color: '#3B82F6', name: 'Gemini' },
};

export default function ModelIcon({ model, agrees = true, size = 'md' }: ModelIconProps) {
  const { label, color, name } = config[model];
  const dim = size === 'sm' ? 22 : 28;

  return (
    <div className="flex flex-col items-center gap-0.5" title={name}>
      <div
        className="rounded-full flex items-center justify-center font-bold transition-all"
        style={{
          width: dim,
          height: dim,
          backgroundColor: agrees ? color : 'transparent',
          border: `2px solid ${color}`,
          opacity: agrees ? 1 : 0.3,
          fontSize: size === 'sm' ? 9 : 11,
          color: agrees ? '#fff' : color,
        }}
      >
        {label}
      </div>
      {size === 'md' && (
        <span className="text-[10px] text-[#666]">{name}</span>
      )}
    </div>
  );
}
