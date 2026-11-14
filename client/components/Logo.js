// Square frame with "RS / SB" initials, drawn as SVG so it stays sharp on any phone.
// To use the organization's official artwork instead, put it at public/logo.svg
// and replace this component with: <img src="/logo.svg" alt="RSSB" className="logo" />
export default function Logo() {
  return (
    <svg className="logo" viewBox="0 0 100 100" role="img" aria-label="RSSB logo">
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="9" y="9" width="82" height="82" fill="none" stroke="#fff" strokeWidth="5" />
      <g fill="#fff" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="36" textAnchor="middle">
        <text x="31" y="47">R</text>
        <text x="69" y="47">S</text>
        <text x="31" y="82">S</text>
        <text x="69" y="82">B</text>
      </g>
    </svg>
  );
}
