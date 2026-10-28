import type { ReactNode } from 'react';

export type AgentId = 'lynx' | 'echo' | 'blaze';
export type Expression = 'default' | 'focus' | 'smug' | 'down';

export interface AgentProfile {
  id: AgentId;
  name: string;
  codename: string;
  role: string;
  feature: string;
  accent: string;
}

export const agents: Record<AgentId, AgentProfile> = {
  lynx: { id: 'lynx', name: '灵眸', codename: 'LYNX', role: '侦察员', feature: '关键词监控', accent: '#17e5c9' },
  echo: { id: 'echo', name: '回声', codename: 'ECHO', role: '情报员', feature: '定时日报', accent: '#f5b83d' },
  blaze: { id: 'blaze', name: '烈锋', codename: 'BLAZE', role: '先锋', feature: '兴趣发现', accent: '#ff4655' },
};

export const expressionLabels: Record<Expression, string> = {
  default: '默认',
  focus: '专注',
  smug: '得意',
  down: '宕机',
};

const INK = '#0f1923';
const LINE = '#1a1410';

const looks: Record<AgentId, { skin: string; skinShade: string; jacket: string }> = {
  lynx: { skin: '#f3d6bd', skinShade: '#dcb597', jacket: '#24303b' },
  echo: { skin: '#e6b993', skinShade: '#c9976f', jacket: '#2b2a33' },
  blaze: { skin: '#c68b63', skinShade: '#a56f4b', jacket: '#2a2026' },
};

function Eyes({ expression }: { expression: Expression }) {
  const stroke = { stroke: LINE, strokeWidth: 3.5, strokeLinecap: 'round' as const, fill: 'none' };
  const almond = (narrow: boolean) => (
    <>
      <path d={narrow ? 'M37 69 Q45 65.5 53 69 Q45 71.5 37 69Z' : 'M37 69 Q45 62 53 68 Q45 73 37 69Z'} fill={LINE} />
      <path d={narrow ? 'M83 69 Q75 65.5 67 69 Q75 71.5 83 69Z' : 'M83 69 Q75 62 67 68 Q75 73 83 69Z'} fill={LINE} />
      {!narrow && (
        <>
          <circle cx="47.5" cy="67" r="1.6" fill="#fff" />
          <circle cx="77.5" cy="67" r="1.6" fill="#fff" />
        </>
      )}
    </>
  );

  switch (expression) {
    case 'default':
      return (
        <>
          {almond(false)}
          <path d="M36 58 L53 61.5" {...stroke} />
          <path d="M84 58 L67 61.5" {...stroke} />
        </>
      );
    case 'focus':
      return (
        <>
          {almond(true)}
          <path d="M36 60 L53 64.5" {...stroke} />
          <path d="M84 60 L67 64.5" {...stroke} />
        </>
      );
    case 'smug':
      return (
        <>
          <path d="M37 69 Q45 64 53 69" {...stroke} />
          <path d="M83 69 Q75 62 67 68 Q75 73 83 69Z" fill={LINE} />
          <circle cx="77.5" cy="67" r="1.6" fill="#fff" />
          <path d="M36 60 L53 62" {...stroke} />
          <path d="M84 54 L67 58" {...stroke} />
        </>
      );
    case 'down':
      return (
        <>
          <path d="M40 64 L50 73 M50 64 L40 73" {...stroke} strokeWidth={3} />
          <path d="M70 64 L80 73 M80 64 L70 73" {...stroke} strokeWidth={3} />
          <path d="M36 60 L52 57" {...stroke} />
          <path d="M84 60 L68 57" {...stroke} />
        </>
      );
  }
}

function Mouth({ expression }: { expression: Expression }) {
  const stroke = { stroke: LINE, strokeWidth: 2.6, strokeLinecap: 'round' as const, fill: 'none' };
  switch (expression) {
    case 'default':
      return <path d="M54 85 Q60 87 66 83" {...stroke} />;
    case 'focus':
      return <path d="M55 85 L65 85" {...stroke} />;
    case 'smug':
      return <path d="M52 83 Q60 90 69 81" {...stroke} />;
    case 'down':
      return <path d="M51 87 q4.5 -4 9 0 t9 0" {...stroke} />;
  }
}

/** Hair and gear that make each agent recognisable. Drawn before the face so features stay on top. */
function Gear({ id, accent }: { id: AgentId; accent: string }): ReactNode {
  switch (id) {
    case 'lynx':
      return (
        <>
          <path
            d="M20 64 C17 30 40 17 62 18 C86 19 104 34 100 64 L93 50 L87 58 L81 43 L73 54 L65 39 L57 53 L49 41 L43 55 L35 45 L28 60 Z"
            fill="#1b2a3a"
          />
          <path d="M22 47 Q60 31 98 47" stroke={INK} strokeWidth="5" fill="none" />
          <rect x="33" y="33" width="22" height="13" rx="5" fill={accent} stroke={INK} strokeWidth="3" />
          <rect x="65" y="33" width="22" height="13" rx="5" fill={accent} stroke={INK} strokeWidth="3" />
          <path d="M37 37 L43 37" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d="M69 37 L75 37" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      );
    case 'echo':
      return (
        <>
          <path
            d="M17 74 C13 34 36 17 60 17 C87 17 107 35 103 74 L96 74 C97 57 91 46 81 41 C68 50 47 51 29 45 C25 54 24 63 24 74 Z"
            fill="#2b1f1a"
          />
          <path d="M20 62 C20 24 100 24 100 62" stroke={INK} strokeWidth="5" fill="none" />
          <rect x="11" y="56" width="13" height="22" rx="5" fill={accent} stroke={INK} strokeWidth="3" />
          <rect x="96" y="56" width="13" height="22" rx="5" fill={accent} stroke={INK} strokeWidth="3" />
          <path d="M17 77 Q20 93 43 91" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="45" cy="91" r="3.5" fill={accent} stroke={INK} strokeWidth="2" />
        </>
      );
    case 'blaze':
      return (
        <>
          <path d="M22 60 C20 30 42 16 66 18 C89 20 104 35 98 60 C92 45 80 37 64 39 C50 39 36 45 30 60 Z" fill="#3a1f24" />
          <path d="M56 22 L70 3 L77 24 Z" fill="#3a1f24" />
          <path d="M21 51 Q60 40 99 51 L99 58 Q60 47 21 58 Z" fill={accent} />
          <path d="M97 53 L115 46 L110 57 Z" fill={accent} />
          <path d="M97 56 L113 64 L104 65 Z" fill={accent} />
          <path d="M28 75 L38 73 M29 80 L37 78.5" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
  }
}

interface AgentProps {
  id: AgentId;
  expression?: Expression;
  /** Hide from assistive tech when the agent's name is already shown as text nearby. */
  decorative?: boolean;
  className?: string;
}

export function Agent({ id, expression = 'default', decorative = false, className = '' }: AgentProps) {
  const profile = agents[id];
  const look = looks[id];
  const label = `原创角色 ${profile.name}（${profile.role}），表情：${expressionLabels[expression]}`;

  return (
    <svg
      viewBox="0 0 120 150"
      className={`block h-auto w-full ${className}`}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
      data-agent={id}
      data-expression={expression}
    >
      <ellipse cx="60" cy="145" rx="32" ry="4" fill="#000" opacity="0.35" />
      <path d="M28 147 C28 119 41 108 60 108 C79 108 92 119 92 147 Z" fill={look.jacket} />
      <path d="M38 134 L76 112" stroke={profile.accent} strokeWidth="4" />
      <path d="M49 108 L60 123 L71 108" stroke={INK} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <rect x="52" y="96" width="16" height="15" rx="4" fill={look.skinShade} />
      <circle cx="21" cy="68" r="6.5" fill={look.skinShade} />
      <circle cx="99" cy="68" r="6.5" fill={look.skinShade} />
      <ellipse cx="60" cy="63" rx="40" ry="38" fill={look.skin} />
      <ellipse cx="41" cy="79" rx="5" ry="2.5" fill="#ff7a7a" opacity="0.35" />
      <ellipse cx="79" cy="79" rx="5" ry="2.5" fill="#ff7a7a" opacity="0.35" />
      <Gear id={id} accent={profile.accent} />
      <Eyes expression={expression} />
      <Mouth expression={expression} />
    </svg>
  );
}
