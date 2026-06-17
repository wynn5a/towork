/* Towork — Tweaks island. Writes CSS vars / data-attrs that app.css consumes. */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#6e79d6",
  "density": "regular",
  "sidebar": 240,
  "radius": 8
}/*EDITMODE-END*/;

function TworkTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--accent', t.accent);
    r.setProperty('--accent-soft', `color-mix(in srgb, ${t.accent} 16%, transparent)`);
    r.setProperty('--accent-line', `color-mix(in srgb, ${t.accent} 45%, transparent)`);
    r.setProperty('--sidebar-w', t.sidebar + 'px');
    r.setProperty('--radius', t.radius + 'px');
    r.setProperty('--radius-sm', Math.max(2, t.radius - 2) + 'px');
    r.setProperty('--radius-lg', (t.radius + 4) + 'px');
    document.documentElement.setAttribute('data-density', t.density);
  }, [t.accent, t.density, t.sidebar, t.radius]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Appearance" />
      <TweakColor label="Accent" value={t.accent}
        options={['#6e79d6', '#4f9be6', '#2dd4bf', '#a371e8']}
        onChange={(v) => setTweak('accent', v)} />
      <TweakRadio label="Density" value={t.density}
        options={['compact', 'regular', 'comfortable']}
        onChange={(v) => setTweak('density', v)} />
      <TweakSection label="Layout" />
      <TweakSlider label="Sidebar width" value={t.sidebar} min={210} max={320} step={2} unit="px"
        onChange={(v) => setTweak('sidebar', v)} />
      <TweakSlider label="Corner radius" value={t.radius} min={0} max={14} step={1} unit="px"
        onChange={(v) => setTweak('radius', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<TworkTweaks />);
