import type { Strings } from '../view.ts'

export interface BenchStrings {
  title: string
  intro: string
  face: string
  faces: { cloth: string; sandpaper: string }
  masses: string
  massOpt: string
  scale: string
  scales: { '1N': string; '2N': string }
  noScale: string
  zero: string
  zeroDone: string
  zeroTodo: string
  zeroHint: string
  paper: string
  paperOpts: { none: string; loose: string; fixed: string }
  paperHint: string
  weigh: string
  weighed: string
  notWeighed: string
  needItems: string
}

export const strings: Strings<BenchStrings> = {
  es: {
    title: 'Montaje del taco, el papel y el dinamómetro',
    intro: 'Apoya una cara del taco sobre el papel y engancha el dinamómetro al gancho: arrastra las piezas en el escenario o abre «Montar con botones». Todo cambio de montaje se hace antes de jalar.',
    face: 'Cara del taco sobre el papel',
    faces: { cloth: 'Tela', sandpaper: 'Lija' },
    masses: 'Masas de 50 g sobre el taco',
    massOpt: '{g} g',
    scale: 'Dinamómetro',
    scales: { '1N': '1 N (marcas de 0,02 N)', '2N': '2 N (marcas de 0,05 N)' },
    noScale: 'Sin dinamómetro elegido',
    zero: 'Poner a cero con el dinamómetro acostado',
    zeroDone: 'Cero ajustado en horizontal.',
    zeroTodo: 'El cero viene ajustado con el dinamómetro colgando. Acostado, la aguja marca un poco de menos.',
    zeroHint: 'Gira el tornillo de cero con el dinamómetro en la posición de trabajo (horizontal).',
    paper: 'Hoja de papel',
    paperOpts: { none: 'Sin papel', loose: 'Suelta', fixed: 'Fija a la mesa' },
    paperHint: 'La guía pide fijar la hoja para que no se mueva.',
    weigh: 'Pesar el taco en la balanza',
    weighed: 'Masa del taco M = {m} g',
    notWeighed: 'Aún no mediste la masa M del taco.',
    needItems: 'Necesitas el taco, un dinamómetro, el papel y la balanza sobre la mesa. Si quitaste alguno, devuélvelo desde la bandeja bajo el escenario.',
  },
  en: {
    title: 'Block, paper and spring scale setup',
    intro: 'Rest one face of the block on the paper and hook the spring scale to the block\'s hook: drag the parts on the stage or open “Assemble with buttons”. Change the setup before you pull, not during.',
    face: 'Face of the block on the paper',
    faces: { cloth: 'Cloth', sandpaper: 'Sandpaper' },
    masses: '50 g masses on the block',
    massOpt: '{g} g',
    scale: 'Spring scale',
    scales: { '1N': '1 N (0.02 N marks)', '2N': '2 N (0.05 N marks)' },
    noScale: 'No spring scale chosen',
    zero: 'Zero with the spring scale lying flat',
    zeroDone: 'Zero set horizontally.',
    zeroTodo: 'The zero comes set with the scale hanging. Lying flat, the needle reads a little low.',
    zeroHint: 'Turn the zero screw with the spring scale in its working position (horizontal).',
    paper: 'Sheet of paper',
    paperOpts: { none: 'No paper', loose: 'Loose', fixed: 'Fixed to the table' },
    paperHint: 'The guide asks you to fix the sheet so it does not move.',
    weigh: 'Weigh the block on the balance',
    weighed: 'Block mass M = {m} g',
    notWeighed: 'You have not measured the block\'s mass M yet.',
    needItems: 'You need the block, a spring scale, the paper and the balance on the table. If you took one off, bring it back from the tray under the stage.',
  },
}
