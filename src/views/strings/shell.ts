import type { Strings } from '../view.ts'

export interface ShellStrings {
  title: string
  titleShort: string
  subtitle: string
  regionMain: string
  regionStage: string
  lang: string
  langSwitch: string
  theme: string
  themes: { auto: string; light: string; dark: string }
  help: string
  helpTitle: string
  helpIntro: string
  helpSteps: string[]
  helpKeys: string
  helpClose: string
  viewMode: string
  view3d: string
  view2d: string
  notice3d: string
  noticeNoWebgl: string
  loading3d: string
  collapse: string
  expand: string
  credits: string
  stagePanel: string
  new: string
  newConfirm: string
  newYes: string
  newNo: string
}

export const strings: Strings<ShellStrings> = {
  es: {
    title: 'MRUV · DigiCart en plano inclinado',
    titleShort: 'MRUV · DigiCart',
    subtitle: 'Práctica 1 de Mecánica Newtoniana · Laboratorio virtual',
    regionMain: 'Laboratorio',
    regionStage: 'Escenario del laboratorio',
    lang: 'Idioma', langSwitch: 'Cambiar a inglés',
    theme: 'Tema',
    themes: { auto: 'Automático', light: 'Claro', dark: 'Oscuro' },
    help: 'Ayuda',
    helpTitle: 'Cómo usar el laboratorio',
    helpIntro: 'La ayuda completa está en preparación. Mientras tanto:',
    helpSteps: [
      'Pon los materiales sobre la mesa y arma la pista desde el inventario.',
      'Nivela la riel, sube el soporte con cremallera y mide las alturas con el calibrador.',
      'Marca las posiciones cada 10 cm, coloca el DigiCart en la marca A y suéltalo.',
      'Mide con el cronómetro hasta cada marca, 10 veces, y anota los tiempos en la Tabla 1.1.',
    ],
    helpKeys: 'Teclas: Espacio inicia o detiene el cronómetro, R lo reinicia y S suelta el DigiCart.',
    helpClose: 'Cerrar',
    viewMode: 'Vista del escenario', view3d: '3D', view2d: '2D',
    notice3d: 'La vista 3D no está disponible en este dispositivo; se muestra la vista lateral 2D.',
    noticeNoWebgl: 'Tu navegador no ofrece WebGL2; se muestra la vista lateral 2D.',
    loading3d: 'Cargando la vista 3D…',
    collapse: 'Contraer {x}', expand: 'Expandir {x}',
    credits: 'Basado en la guía de laboratorio de la EPN. Proyecto independiente y de código abierto, sin afiliación con la EPN ni con PHYWE.',
    stagePanel: 'Escenario',
    new: 'Empezar de nuevo',
    newConfirm: 'Se borrará el montaje, las corridas y la tabla. ¿Continuar?',
    newYes: 'Sí, empezar de nuevo', newNo: 'Cancelar',
  },
  en: {
    title: 'MRUV · DigiCart on an inclined plane',
    titleShort: 'MRUV · DigiCart',
    subtitle: 'Practice 1 of Newtonian Mechanics · Virtual lab',
    regionMain: 'Lab',
    regionStage: 'Lab stage',
    lang: 'Language', langSwitch: 'Switch to Spanish',
    theme: 'Theme',
    themes: { auto: 'Automatic', light: 'Light', dark: 'Dark' },
    help: 'Help',
    helpTitle: 'How to use the lab',
    helpIntro: 'The full help is being prepared. Meanwhile:',
    helpSteps: [
      'Put the materials on the table and build the track from the inventory.',
      'Level the rail, raise the rack stand and measure the heights with the caliper.',
      'Mark the positions every 10 cm, put the DigiCart on mark A and release it.',
      'Time it with the stopwatch up to each mark, 10 times, and write the times in Table 1.1.',
    ],
    helpKeys: 'Keys: Space starts or stops the stopwatch, R resets it and S releases the DigiCart.',
    helpClose: 'Close',
    viewMode: 'Stage view', view3d: '3D', view2d: '2D',
    notice3d: '3D view is not available on this device; showing the 2D side view.',
    noticeNoWebgl: 'Your browser does not offer WebGL2; showing the 2D side view.',
    loading3d: 'Loading the 3D view…',
    collapse: 'Collapse {x}', expand: 'Expand {x}',
    credits: 'Based on the EPN lab guide. Independent open-source project, not affiliated with EPN or PHYWE.',
    stagePanel: 'Stage',
    new: 'Start over',
    newConfirm: 'This clears the setup, the runs and the table. Continue?',
    newYes: 'Yes, start over', newNo: 'Cancel',
  },
}
