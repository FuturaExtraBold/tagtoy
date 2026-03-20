import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Canvas from './Canvas.jsx';
import { STYLE_DEFAULTS } from './styleConfig.js';

const { tag: TAG, throwup: THROWUP, burner: BURNER } = STYLE_DEFAULTS;

export default function App() {
  const [strokes, setStrokes] = useState([]);
  const [style, setStyle] = useState('tag');
  const [gradientMode, setGradientMode] = useState('overlay');
  const [bg, setBg] = useState('');

  const [brushType,      setBrushType]      = useState(TAG.brushType);
  const [brushSize,      setBrushSize]      = useState(TAG.brushSize);
  const [shadowOffset,   setShadowOffset]   = useState(THROWUP.shadowOffset);
  const [shadowColor,    setShadowColor]    = useState(THROWUP.shadowColor);
  const [shadowAngle,    setShadowAngle]    = useState(THROWUP.shadowAngle);
  const [shadowAttached, setShadowAttached] = useState(THROWUP.shadowAttached);
  const [outlineSize,    setOutlineSize]    = useState(THROWUP.outlineSize);
  const [outlineColor,   setOutlineColor]   = useState(THROWUP.outlineColor);
  const [throwupColor,   setThrowupColor]   = useState(THROWUP.throwupColor);
  const [gradientStart,  setGradientStart]  = useState(BURNER.gradientStart);
  const [gradientEnd,    setGradientEnd]    = useState(BURNER.gradientEnd);
  const [showDrips,      setShowDrips]      = useState(TAG.showDrips);
  const [dripCount,      setDripCount]      = useState(TAG.dripCount);
  const [showOverspray,  setShowOverspray]  = useState(TAG.showOverspray);
  const [oversprayAmount,setOversprayAmount]= useState(TAG.oversprayAmount);

  const cursorRef = useRef(null);

  const handleBrushSize = (v) => {
    setBrushSize(v);
    setOutlineSize(s => Math.max(v, Math.min(s, v * 2)));
  };

  const handleUndo = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const renderConfig = useMemo(() => ({
    brushType, brushSize,
    shadowOffset, shadowColor, shadowAngle, shadowAttached,
    outlineSize, outlineColor,
    throwupColor,
    gradientStart, gradientEnd,
    showDrips, dripCount, showOverspray, oversprayAmount,
  }), [brushType, brushSize, shadowOffset, shadowColor, shadowAngle, shadowAttached,
      outlineSize, outlineColor, throwupColor, gradientStart, gradientEnd,
      showDrips, dripCount, showOverspray, oversprayAmount]);

  const handleStrokeComplete = useCallback((stroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  // Background texture
  useEffect(() => {
    if (bg) {
      document.body.style.backgroundImage = `url(/backgrounds/${bg})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.classList.add('has-bg');
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.classList.remove('has-bg');
    }
  }, [bg]);

  // Custom cursor
  useEffect(() => {
    const move = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top  = `${e.clientY}px`;
      }
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  // Undo on 'z' key (skip when focus is in a form control)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'z' || e.key === 'Z') handleUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo]);

  const isTagged   = style === 'tag';
  const isThrowup  = style === 'throwup';
  const isBurner   = style === 'burner';
  const hasEffects = isThrowup || isBurner;

  return (
    <>
      <div ref={cursorRef} className="cursor" />

      <Canvas
        strokes={strokes}
        style={style}
        gradientMode={gradientMode}
        renderConfig={renderConfig}
        onStrokeComplete={handleStrokeComplete}
      />

      <div className="controls">

        {/* Row 1: style + mode toggle + undo + clear */}
        <div className="ctrl-row">
          <select value={style} onChange={e => setStyle(e.target.value)}>
            <option value="tag">Tag</option>
            <option value="throwup">Throwup</option>
            <option value="burner">Burner</option>
          </select>
          <select value={bg} onChange={e => setBg(e.target.value)}>
            <option value="">No Background</option>
            <option value="bricks.jpg">Bricks</option>
            <option value="bricks-white.jpg">Bricks White</option>
            <option value="concrete-dark.jpg">Concrete Dark</option>
            <option value="concrete-light.jpg">Concrete Light</option>
            <option value="scratch.jpg">Scratch</option>
          </select>
          {isBurner && (
            <label className="check-label">
              <input type="checkbox"
                checked={gradientMode === 'combined'}
                onChange={e => setGradientMode(e.target.checked ? 'combined' : 'overlay')}
              />
              Combined
            </label>
          )}
          <button onClick={handleUndo}>Undo</button>
          <button onClick={() => setStrokes([])}>Clear</button>
        </div>

        {/* Row 2: brush type + size + feather + drips */}
        <div className="ctrl-row">
          <select value={brushType} onChange={e => setBrushType(e.target.value)}>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
          <label style={{flex:1}}>Size
            <input type="range" min={10} max={200} value={brushSize}
              onChange={e => handleBrushSize(Number(e.target.value))} />
            <span>{brushSize}px</span>
          </label>
          <label className="check-label">
            <input type="checkbox"
              checked={showDrips}
              onChange={e => setShowDrips(e.target.checked)}
            />
            Drips
          </label>
          {showDrips && (
            <label style={{flex:1}}>
              <input type="range" min={1} max={20} value={dripCount}
                onChange={e => setDripCount(Number(e.target.value))} />
              <span>{dripCount}</span>
            </label>
          )}
          <label className="check-label">
            <input type="checkbox"
              checked={showOverspray}
              onChange={e => setShowOverspray(e.target.checked)}
            />
            Overspray
          </label>
          {showOverspray && (
            <label style={{flex:1}}>
              <input type="range" min={0.5} max={5} step={0.1} value={oversprayAmount}
                onChange={e => setOversprayAmount(Number(e.target.value))} />
              <span>{oversprayAmount.toFixed(1)}×</span>
            </label>
          )}
        </div>

        {hasEffects && (<>
          {/* Row 3: shadow */}
          <div className="ctrl-row">
            <label style={{flex:1}}>Shadow
              <input type="range" min={0} max={150} value={shadowOffset}
                onChange={e => setShadowOffset(Number(e.target.value))} />
              <span>{shadowOffset}px</span>
            </label>
            <input type="color" title="Shadow color" value={shadowColor}
              onChange={e => setShadowColor(e.target.value)} />
            <select value={shadowAngle} onChange={e => setShadowAngle(e.target.value)}>
              <option value="horizontal">→</option>
              <option value="45">↘</option>
              <option value="vertical">↓</option>
            </select>
            <label className="check-label" title="Attach shadow to stroke edges">
              <input type="checkbox"
                checked={shadowAttached}
                onChange={e => setShadowAttached(e.target.checked)}
              />
              Attached
            </label>
          </div>

          {/* Row 4: outline */}
          <div className="ctrl-row">
            <label style={{flex:1}}>Outline
              <input type="range" min={brushSize} max={brushSize * 2} value={outlineSize}
                onChange={e => setOutlineSize(Number(e.target.value))} />
              <span>{outlineSize}px</span>
            </label>
            <input type="color" title="Outline color" value={outlineColor}
              onChange={e => setOutlineColor(e.target.value)} />
          </div>

          {/* Row 5: fill colors */}
          {isThrowup && (
            <div className="ctrl-row">
              <label>Fill <input type="color" value={throwupColor}
                onChange={e => setThrowupColor(e.target.value)} /></label>
            </div>
          )}
          {isBurner && (
            <div className="ctrl-row">
              <label>Fill start <input type="color" value={gradientStart}
                onChange={e => setGradientStart(e.target.value)} /></label>
              <label>Fill end <input type="color" value={gradientEnd}
                onChange={e => setGradientEnd(e.target.value)} /></label>
            </div>
          )}
        </>)}

      </div>
    </>
  );
}
