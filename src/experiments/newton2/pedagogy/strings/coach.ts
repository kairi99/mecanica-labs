import type { Strings } from '../../views/view.ts'
import type { CoachStrings } from '../../../../core/pedagogy/coachView.ts'
import type { CoachKey } from '../coach.ts'

export const strings: Strings<CoachStrings<CoachKey>> = {
  es: {
    label: 'Sugerencia',
    dismiss: 'Descartar la sugerencia',
    nudges: {
      notLevel: 'La burbuja del nivelador no está centrada: la riel está inclinada y el peso del DigiCart suma o resta a la fuerza del contenedor. Nivélala antes de medir.',
      stringTooLong: 'El contenedor tocó el piso antes de los 90 cm: el hilo se aflojó y el DigiCart siguió por inercia. Acorta el hilo para que el contenedor cuelgue más arriba.',
      stringTooShort: 'El hilo no llega a la polea desde la marca de inicio. Alárgalo un poco, de modo que el contenedor cuelgue unos centímetros bajo la polea.',
      stringNotAttached: 'Nada jala al DigiCart: el hilo no está atado (¿falta el tornillo de latón, el contenedor o pasar el hilo por la polea?). Revisa las conexiones en el montaje.',
      receiverBlocks: 'El DigiCart llegó al receptor antes de la marca final. Revisa dónde pusiste las marcas: los 90 cm deben caber entre el inicio y el receptor.',
      cartFell: 'Sin el receptor al final de la riel nada detiene al DigiCart: se salió por el extremo y cayó. Esa suelta no cuenta. Devuélvelo a la riel (arrástralo) y coloca el receptor con la polea antes de volver a soltar.',
      neverStarts: 'El contenedor pesa tan poco que no vence la fricción: el DigiCart no arranca. Pasa menos masas al DigiCart.',
      massTaken: 'Sacaste {n} masa(s) del sistema en lugar de pasarla(s) al DigiCart. La masa total cambió: la guía las pasa al DigiCart para que Mt se mantenga constante.',
      forceStale: 'Cambiaste las masas del contenedor ({n} ahora) y no volviste a leer F con el dinamómetro. La fuerza de la Tabla 3.1 debe ser la de esta prueba.',
      forceMissing: 'Todavía no leíste el peso del contenedor con el dinamómetro: sin F no hay punto en la gráfica de fuerza contra aceleración.',
      cartOffTrack: 'Ahí el DigiCart no queda sobre la riel. Nunca lo dejes fuera de la pista: rueda con mucha facilidad y puede caer al piso.',
      timeImplausible: 'Un tiempo de {t} s es raro para recorrer 90 cm con este montaje (esperarías entre 1 y 3 s). ¿Perdiste el inicio o el final, o mediste otra distancia?',
      distanceOff: 'Las marcas están a {cm} cm. La guía mide el recorrido entre dos marcas separadas 90 cm.',
      noMt: 'Ya hiciste varios recorridos y todavía no anotaste Mt con la balanza. La necesitarás para comparar con la pendiente del ajuste.',
    },
  },
  en: {
    label: 'Hint',
    dismiss: 'Dismiss the hint',
    nudges: {
      notLevel: 'The level bubble is not centred: the rail is tilted and the weight of the DigiCart adds to or subtracts from the force of the canister. Level it before measuring.',
      stringTooLong: 'The canister hit the floor before 90 cm: the string went slack and the DigiCart coasted on. Shorten the string so the canister hangs higher.',
      stringTooShort: 'The string does not reach the pulley from the start mark. Lengthen it a little so the canister hangs a few centimetres below the pulley.',
      stringNotAttached: 'Nothing pulls the DigiCart: the string is not tied (is the brass screw, the canister or the pulley missing?). Check the connections in the set-up.',
      receiverBlocks: 'The DigiCart reached the receiver before the end mark. Check where you put the marks: the 90 cm must fit between the start and the receiver.',
      cartFell: 'With no receiver at the end of the rail nothing stops the DigiCart: it ran off the end and fell. That release does not count. Put it back on the rail (drag it) and fit the receiver with the pulley before releasing again.',
      neverStarts: 'The canister is so light that it does not beat friction: the DigiCart does not start. Move fewer masses to the DigiCart.',
      massTaken: 'You took {n} mass(es) out of the system instead of moving them to the DigiCart. The total mass changed: the guide moves them to the DigiCart so Mt stays constant.',
      forceStale: 'You changed the masses in the canister ({n} now) and did not read F again with the dynamometer. The force in Table 3.1 must be the one of this trial.',
      forceMissing: 'You have not read the weight of the canister with the dynamometer yet: without F there is no point in the force against acceleration graph.',
      cartOffTrack: 'The DigiCart would not lie on the rail there. Never leave it off the track: it rolls very easily and can fall to the floor.',
      timeImplausible: 'A time of {t} s is odd for 90 cm with this set-up (you would expect between 1 and 3 s). Did you miss the start or the end, or time another distance?',
      distanceOff: 'The marks are {cm} cm apart. The guide times the run between two marks 90 cm apart.',
      noMt: 'You have made several runs and have not recorded Mt with the balance yet. You will need it to compare with the slope of the fit.',
    },
  },
}
