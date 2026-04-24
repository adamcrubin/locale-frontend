// ── WeatherIcon — shared across AmbientMode, WeatherScreen, ActiveMode ────────
// Maps NWS description text + emoji to a colored symbol.
// Always pass both icon AND desc for best matching — desc is the primary signal.

export default function WeatherIcon({ icon, desc = '', size = 18 }) {
const d = (desc || '').toLowerCase();
const i = (icon || '');

if (d.includes('thunder') || d.includes('storm') || i.includes('⛈') || i.includes('🌩'))
return <span style={{ fontSize: size, color: '#818CF8' }}>🌩️</span>;
if (d.includes('snow') || d.includes('ice') || d.includes('blizzard') || i.includes('❄') || i.includes('🌨'))
return <span style={{ fontSize: size, color: '#BAE6FD' }}>❄️</span>;
if (d.includes('frost'))
return <span style={{ fontSize: size, color: '#93C5FD' }}>🌨️</span>;
if (d.includes('rain') || d.includes('shower') || i.includes('🌧') || i.includes('🌦'))
return <span style={{ fontSize: size, color: '#38BDF8' }}>🌧️</span>;
if (d.includes('drizzle') || d.includes('slight chance'))
return <span style={{ fontSize: size, color: '#7DD3FC' }}>🌦️</span>;
if (d.includes('fog') || d.includes('haz') || d.includes('smoke') || i.includes('🌫'))
return <span style={{ fontSize: size, color: '#94A3B8' }}>🌫️</span>;
if (d.includes('wind') || d.includes('breezy') || i.includes('💨'))
return <span style={{ fontSize: size, color: '#94A3B8' }}>💨</span>;
if (d.includes('mostly cloudy') || d.includes('overcast') || i.includes('☁'))
return <span style={{ fontSize: size, color: '#CBD5E1' }}>☁️</span>;
if (d.includes('partly') || i.includes('⛅') || i.includes('🌤'))
return <span style={{ fontSize: size, color: '#FCD34D' }}>⛅</span>;
if (i.includes('🌙') || (d.includes('clear') && d.includes('night')))
return <span style={{ fontSize: size, color: '#FDE68A' }}>🌙</span>;
if (d.includes('sunny') || d.includes('clear') || i.includes('☀') || i.includes('🌞'))
return <span style={{ fontSize: size, color: '#FCD34D' }}>☀️</span>;
return <span style={{ fontSize: size, color: '#E2E8F0' }}>{icon || '🌡️'}</span>;
}