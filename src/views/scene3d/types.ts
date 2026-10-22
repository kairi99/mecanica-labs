// Types shared by the scene, its interaction layer and the DOM overlay.
export interface CardAction {
  label: string
  /** `timeStamp` is the event.timeStamp of the click (used for time-stamped apparatus actions such as the release). */
  run(timeStamp: number): void
}
export interface CardInfo {
  title: string
  text: string
  actions: CardAction[]
  /** Panel id for the "open panel" button (null: no button). */
  panel: string | null
  /** A refusal or other message that should be announced (role alert). */
  alert: boolean
}
