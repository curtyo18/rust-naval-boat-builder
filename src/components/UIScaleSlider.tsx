import './UIScaleSlider.css'
import { useStore } from '../store/useStore'

export default function UIScaleSlider() {
  const uiScale = useStore((s) => s.uiScale)
  const setUiScale = useStore((s) => s.setUiScale)

  return (
    <div className="ui-scale-slider">
      <span className="ui-scale-slider__label">UI Scale</span>
      <input
        className="ui-scale-slider__input"
        type="range"
        min={75}
        max={150}
        step={5}
        value={uiScale}
        onChange={(e) => setUiScale(Number(e.target.value))}
      />
      <span className="ui-scale-slider__value">{uiScale}%</span>
    </div>
  )
}
