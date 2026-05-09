export const WOTD_POOL = [
  { word: 'ephemeral', definition: 'Lasting for a very short time; transient and fleeting.' },
  { word: 'serendipity', definition: 'The occurrence of events by chance in a happy or beneficial way.' },
  { word: 'mellifluous', definition: 'Sweet or musical; pleasant to hear, as if sweetened with honey.' },
  { word: 'petrichor', definition: 'The pleasant, earthy smell produced when rain falls on dry soil.' },
  { word: 'luminous', definition: 'Full of or shedding light; bright, shining, or glowing.' },
  { word: 'sonder', definition: 'The realization that each passerby has a life as vivid and complex as your own.' },
  { word: 'ineffable', definition: 'Too great or extreme to be expressed or described in words.' },
  { word: 'quixotic', definition: 'Exceedingly idealistic; unrealistic and impractical.' },
  { word: 'verisimilitude', definition: 'The appearance of being true or real; the quality of seeming truthful.' },
  { word: 'limerence', definition: 'The state of being infatuated or obsessed with another person.' },
  { word: 'palimpsest', definition: 'Something reused or altered but still bearing visible traces of its earlier form.' },
  { word: 'susurrus', definition: 'A whispering or rustling sound; a murmur.' },
  { word: 'apricity', definition: 'The warmth of the sun in winter.' },
  { word: 'vellichor', definition: 'The strange wistfulness of used bookstores.' },
  { word: 'sonorous', definition: 'Imposingly deep and full in sound; rich and resonant.' },
  { word: 'ethereal', definition: 'Extremely delicate and light in a way that seems not of this world.' },
  { word: 'laconic', definition: 'Using very few words; brief and concise in speech or expression.' },
  { word: 'redolent', definition: 'Strongly reminiscent or suggestive of something; fragrant.' },
  { word: 'penumbra', definition: 'The partially shaded outer region of a shadow; an area of ambiguity.' },
  { word: 'chiaroscuro', definition: 'The treatment of light and shade in drawing and painting.' },
  { word: 'diaphanous', definition: 'Light, delicate, and translucent; gossamer.' },
  { word: 'quintessence', definition: 'The most perfect or typical example of a quality or class.' },
  { word: 'ebullience', definition: 'The quality of being cheerful and full of energy; exuberance.' },
  { word: 'halcyon', definition: 'Denoting a period of time that was idyllically happy and peaceful.' },
  { word: 'saudade', definition: 'A deep emotional state of melancholic longing for something absent.' },
  { word: 'syzygy', definition: 'An alignment of three celestial bodies; a pair of connected or corresponding things.' },
  { word: 'gossamer', definition: 'Used to refer to something very light, thin, and insubstantial.' },
  { word: 'crepuscular', definition: 'Of, resembling, or relating to twilight.' },
  { word: 'numinous', definition: 'Having a strong religious or spiritual quality; awe-inspiring.' },
  { word: 'liminal', definition: 'Occupying a position at, or on both sides of, a boundary or threshold.' },
];

export const COMMON_EN_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'about', 'which', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
  'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
]);

export const COMMON_PT_WORDS = new Set([
  'de', 'que', 'não', 'no', 'um', 'uma', 'com', 'para', 'por', 'mais',
  'se', 'como', 'mas', 'ao', 'ele', 'das', 'em', 'ou', 'ser', 'quando',
  'muito', 'há', 'nos', 'já', 'também', 'só', 'pelo', 'pela', 'até',
  'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter',
  'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'está', 'você', 'tinha',
  'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm',
  'numa', 'pelos', 'elas', 'havia', 'seja', 'qual', 'será', 'nós',
  'tenho', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'dele',
]);

export function detectLanguage(keys: string[]): 'en' | 'pt' {
  const sample = keys.slice(0, 200).map(k => k.toLowerCase());
  let enScore = 0;
  let ptScore = 0;
  for (const word of sample) {
    if (COMMON_EN_WORDS.has(word)) enScore++;
    if (COMMON_PT_WORDS.has(word)) ptScore++;
  }
  return ptScore > enScore ? 'pt' : 'en';
}
