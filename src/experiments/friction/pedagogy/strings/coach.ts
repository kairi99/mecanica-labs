import type { Strings } from '../../views/view.ts'
import type { CoachStrings as CoreCoachStrings } from '../../../../core/pedagogy/coachView.ts'
import type { CoachKey } from '../coach.ts'

export type CoachStrings = CoreCoachStrings<CoachKey>

export const strings: Strings<CoachStrings> = {
  es: {
    label: 'Sugerencia',
    dismiss: 'Descartar la sugerencia',
    nudges: {
      paperLoose: 'El papel no está fijo a la mesa. Si se desliza con el taco, el dinamómetro mide el rozamiento del papel con la mesa y las lecturas salen bajas y erráticas. Fíjalo antes de jalar.',
      zeroMissing: 'El dinamómetro no está puesto a cero en horizontal. Su cero se ajusta colgando; acostado la aguja marca de menos y todas tus lecturas salen corridas. Gira el tornillo de cero con él acostado.',
      massMissing: 'Aún no mediste la masa M del taco con la balanza. La necesitarás para el peso y para calcular μ.',
      overRange: 'La aguja topó con el tope del dinamómetro: la fuerza real es mayor que el fondo de escala y esa lectura no vale. Cambia al dinamómetro de 2 N.',
      lateRead: 'Leíste {s} s después de que el taco empezó a moverse: la aguja ya había caído y obtuviste una fuerza menor que el máximo. Para la fuerza máxima, pulsa «Leer» justo antes de que el taco arranque.',
      stickSlip: 'El taco se detuvo y arrancó {n} veces: jalas demasiado despacio y el resorte blando hace que se pegue y se suelte. Para fuerza constante jala a unos 4 cm/s o más.',
      offPaper: 'El taco se salió de la hoja y ahora roza con la mesa. Usa solo el recorrido sobre el papel: suelta y repite.',
      wrongSetup: 'Esa lectura la tomaste con otra cara o con otra masa que la de la fila {row}. Revisa que corresponda al caso de la fila.',
      crankLate: 'Paraste la manivela {s} s después de que la barra empezó a deslizar: la altura queda por encima de la de inicio y el ángulo que usas es mayor que el real. Detén la manivela apenas veas que se mueve.',
      crankNotStopped: 'La barra llegó al final con la manivela aún girando: el riel siguió subiendo mientras deslizaba y la aceleración no fue constante. Detén la manivela cuando empiece a deslizar.',
      heightWhileRaising: 'No puedes leer la cinta mientras la manivela gira. Detén la manivela y luego mide h.',
      startedEarly: 'Iniciaste el cronómetro unos {s} s antes de que la barra empezara a moverse. El tiempo de recorrido empieza cuando suelta.',
      startedLate: 'Iniciaste el cronómetro unos {s} s después de que la barra empezó a moverse: te falta parte del recorrido. Con tiempos tan cortos el retraso pesa mucho en la aceleración.',
      implausibleForce: 'Una fuerza de {f} N supera el fondo de escala de los dos dinamómetros (2 N). Revisa el valor y la unidad.',
      implausibleHeight: 'Una altura de {h} m es mayor que lo que alcanza el soporte. Revisa el valor y que esté en metros.',
      implausibleTime: 'Un tiempo de {t} s es raro para recorrer 1 m en este riel. Revisa en qué momento presionaste inicio y alto.',
    },
  },
  en: {
    label: 'Hint',
    dismiss: 'Dismiss the hint',
    nudges: {
      paperLoose: 'The paper is not fixed to the table. If it slides with the block, the spring scale measures the friction of the paper on the table and the readings come out low and erratic. Fix it before pulling.',
      zeroMissing: 'The spring scale is not zeroed horizontally. Its zero is set hanging; lying flat the needle reads low and all your readings are shifted. Turn the zero screw with it lying flat.',
      massMissing: 'You have not measured the block\'s mass M with the balance yet. You will need it for the weight and for computing μ.',
      overRange: 'The needle hit the spring scale\'s stop: the real force is above full scale and that reading is not valid. Switch to the 2 N spring scale.',
      lateRead: 'You read {s} s after the block started to move: the needle had already dropped and you got a force below the maximum. For the largest force, press “Read” just before the block starts.',
      stickSlip: 'The block stopped and started {n} times: you pull too slowly and the soft spring makes it stick and release. For a constant force pull at about 4 cm/s or faster.',
      offPaper: 'The block left the sheet and now rubs on the table. Use only the travel on the paper: let go and repeat.',
      wrongSetup: 'You took that reading with a different face or mass than the one in row {row}. Check that it matches the row\'s case.',
      crankLate: 'You stopped the crank {s} s after the bar began to slide: the height ends up above the starting one and the angle you use is larger than the real one. Stop the crank as soon as you see it move.',
      crankNotStopped: 'The bar reached the end with the crank still turning: the rail kept rising while it slid and the acceleration was not constant. Stop the crank when it starts to slide.',
      heightWhileRaising: 'You cannot read the tape while the crank turns. Stop the crank and then measure h.',
      startedEarly: 'You started the stopwatch about {s} s before the bar began to move. The travel time starts when it lets go.',
      startedLate: 'You started the stopwatch about {s} s after the bar began to move: part of the travel is missing. With times this short the delay weighs a lot in the acceleration.',
      implausibleForce: 'A force of {f} N is above full scale of both spring scales (2 N). Check the value and the unit.',
      implausibleHeight: 'A height of {h} m is more than the stand reaches. Check the value and that it is in metres.',
      implausibleTime: 'A time of {t} s is odd for covering 1 m on this rail. Check when you pressed start and stop.',
    },
  },
}
