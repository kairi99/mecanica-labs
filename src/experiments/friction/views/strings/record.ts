import type { Strings } from '../view.ts'

export interface RecordStrings {
  title: string
  intro: string
  noPulls: string
  noTrials: string
  pullSel: string
  pullOpt: string
  setup: string
  face: { cloth: string; sandpaper: string }
  paper: { none: string; loose: string; fixed: string }
  scaleZeroed: string
  scaleNotZeroed: string
  plotAria: string
  axisT: string
  axisF: string
  lineFs: string
  lineFk: string
  peak: string
  noBreak: string
  trialsHead: string
  colBar: string
  colTrial: string
  colH: string
  colT: string
  colMus: string
  colMuk: string
  bar: { wood: string; aluminium: string; iron: string }
  noSlip: string
}

export const strings: Strings<RecordStrings> = {
  es: {
    title: 'Registro de referencia',
    intro: 'Un sensor de fuerza ideal anotó la fuerza verdadera del dinamómetro durante cada jalón, y el simulador guardó la altura verdadera donde empezó a deslizar cada barra y su tiempo real de recorrido. Compara con lo que leíste tú. Se oculta con ?reference=0.',
    noPulls: 'Aún no has jalado el taco.',
    noTrials: 'Aún no has levantado el riel.',
    pullSel: 'Jalón',
    pullOpt: 'Jalón {n}: {face}, +{g} g, dinamómetro de {s} N',
    setup: 'Montaje: {face}, {g} g añadidos, papel {paper}, {zero}.',
    face: { cloth: 'tela', sandpaper: 'lija' },
    paper: { none: 'ausente', loose: 'suelto', fixed: 'fijo' },
    scaleZeroed: 'cero ajustado en horizontal',
    scaleNotZeroed: 'cero sin ajustar en horizontal',
    plotAria: 'Fuerza del resorte en función del tiempo durante el jalón seleccionado',
    axisT: 't [s]',
    axisF: 'F [N]',
    lineFs: 'μs·N de este intento',
    lineFk: 'μk·N de este intento',
    peak: 'Fuerza al romper el reposo: {f} N.',
    noBreak: 'El taco no llegó a moverse en este jalón.',
    trialsHead: 'Barras sobre el riel',
    colBar: 'Barra', colTrial: 'No.', colH: 'h verdadera de inicio [m]', colT: 't verdadero [s]', colMus: 'μs del intento', colMuk: 'μk del intento',
    bar: { wood: 'Madera', aluminium: 'Aluminio', iron: 'Hierro' },
    noSlip: 'no deslizó',
  },
  en: {
    title: 'Reference record',
    intro: 'An ideal force sensor logged the true force of the spring scale during each pull, and the simulator kept the true height at which each bar started sliding and its real travel time. Compare with what you read. It is hidden with ?reference=0.',
    noPulls: 'You have not pulled the block yet.',
    noTrials: 'You have not raised the rail yet.',
    pullSel: 'Pull',
    pullOpt: 'Pull {n}: {face}, +{g} g, {s} N scale',
    setup: 'Setup: {face}, {g} g added, paper {paper}, {zero}.',
    face: { cloth: 'cloth', sandpaper: 'sandpaper' },
    paper: { none: 'absent', loose: 'loose', fixed: 'fixed' },
    scaleZeroed: 'zero set horizontally',
    scaleNotZeroed: 'zero not set horizontally',
    plotAria: 'Spring force against time during the selected pull',
    axisT: 't [s]',
    axisF: 'F [N]',
    lineFs: 'μs·N of this try',
    lineFk: 'μk·N of this try',
    peak: 'Force at breakaway: {f} N.',
    noBreak: 'The block never moved in this pull.',
    trialsHead: 'Bars on the rail',
    colBar: 'Bar', colTrial: 'No.', colH: 'true start h [m]', colT: 'true t [s]', colMus: 'μs of the try', colMuk: 'μk of the try',
    bar: { wood: 'Wood', aluminium: 'Aluminium', iron: 'Iron' },
    noSlip: 'did not slide',
  },
}
