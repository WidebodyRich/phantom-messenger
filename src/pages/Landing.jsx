import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LANDING_CSS = `
/* ===== LANDING PAGE SCOPED STYLES ===== */
.landing-page {
  background: #000000;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  line-height: 1.6;
  min-height: 100vh;
  position: relative;
}

.landing-page *, .landing-page *::before, .landing-page *::after {
  margin: 0; padding: 0; box-sizing: border-box;
}

.landing-page {
  --bg: #000000;
  --card-bg: #0A0A0A;
  --green: #00FF41;
  --green-dark: #008F11;
  --white: #FFFFFF;
  --grey: #888888;
  --grey-dark: #333333;
  --red: #661111;
  --font-mono: 'Space Mono', monospace;
  --font-sans: 'Inter', sans-serif;
  --glow: 0 0 20px rgba(0, 255, 65, 0.3);
  --glow-strong: 0 0 40px rgba(0, 255, 65, 0.5);
}

/* Scanline overlay */
.landing-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 65, 0.03) 2px,
    rgba(0, 255, 65, 0.03) 4px
  );
}

/* Scrollbar */
.landing-page ::-webkit-scrollbar { width: 6px; }
.landing-page ::-webkit-scrollbar-track { background: var(--bg); }
.landing-page ::-webkit-scrollbar-thumb { background: var(--green-dark); border-radius: 3px; }

/* Selection */
.landing-page ::selection { background: var(--green); color: var(--bg); }

/* ========== NAV ========== */
.landing-page .nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(20px);
  background: rgba(0,0,0,0.7);
  border-bottom: 1px solid rgba(0,255,65,0.1);
  transition: all 0.3s;
}

.landing-page .nav-logo {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--white);
  letter-spacing: 3px;
  text-decoration: none;
}
.landing-page .nav-logo .cursor {
  display: inline-block;
  width: 8px;
  height: 1.1em;
  background: var(--green);
  margin-left: 4px;
  vertical-align: middle;
  animation: lp-blink 1s step-end infinite;
}

.landing-page .nav-links { display: flex; gap: 2rem; list-style: none; }
.landing-page .nav-links a {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--grey);
  text-decoration: none;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: color 0.3s, text-shadow 0.3s;
}
.landing-page .nav-links a:hover {
  color: var(--green);
  text-shadow: 0 0 10px rgba(0,255,65,0.5);
}

.landing-page .nav-toggle {
  display: none;
  background: none;
  border: 1px solid var(--green-dark);
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 1.2rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

/* ========== HERO ========== */
.landing-page .hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6rem 2rem 4rem;
  overflow: hidden;
}

.landing-page .hero #matrixCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.landing-page .hero-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
}

.landing-page .hero-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--green);
  letter-spacing: 6px;
  text-transform: uppercase;
  margin-bottom: 2rem;
  opacity: 0;
  animation: lp-fadeInUp 1s 0.5s forwards;
}

.landing-page .hero-title {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(3.5rem, 10vw, 8rem);
  line-height: 0.95;
  color: var(--white);
  text-shadow: 0 0 60px rgba(0,255,65,0.15);
  margin-bottom: 2rem;
  animation: lp-glitch-anim 5s infinite;
  position: relative;
}
.landing-page .hero-title::before,
.landing-page .hero-title::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  opacity: 0.8;
}
.landing-page .hero-title::before {
  animation: lp-glitch-1 3s infinite;
  color: var(--green);
  z-index: -1;
  clip-path: inset(0 0 65% 0);
}
.landing-page .hero-title::after {
  animation: lp-glitch-2 3s infinite;
  color: rgba(0,255,65,0.3);
  z-index: -1;
  clip-path: inset(65% 0 0 0);
}

.landing-page .hero-tagline {
  font-family: var(--font-mono);
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  color: var(--green);
  margin-bottom: 3rem;
  min-height: 2em;
}
.landing-page .hero-tagline .typed-cursor {
  display: inline-block;
  width: 10px;
  height: 1.2em;
  background: var(--green);
  vertical-align: middle;
  animation: lp-blink 0.7s step-end infinite;
  margin-left: 2px;
}

.landing-page .hero-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  opacity: 0;
  animation: lp-fadeInUp 1s 3s forwards;
}

.landing-page .btn-primary {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 1rem 2.5rem;
  background: var(--green);
  color: var(--bg);
  border: 2px solid var(--green);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
  animation: lp-pulse-green 2s infinite;
  font-weight: 700;
}
.landing-page .btn-primary:hover {
  box-shadow: var(--glow-strong);
  transform: translateY(-2px);
}

.landing-page .btn-secondary {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 1rem 2.5rem;
  background: transparent;
  color: var(--green);
  border: 2px solid var(--green);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 700;
}
.landing-page .btn-secondary:hover {
  background: rgba(0,255,65,0.1);
  box-shadow: var(--glow);
  transform: translateY(-2px);
}

.landing-page .hero-subtext {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--grey);
  letter-spacing: 1px;
  line-height: 1.8;
  opacity: 0;
  animation: lp-fadeInUp 1s 3.5s forwards;
}

.landing-page .scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 2;
  opacity: 0;
  animation: lp-fadeInUp 1s 4s forwards;
}
.landing-page .scroll-indicator .arrow {
  display: block;
  color: var(--green);
  font-size: 1.5rem;
  animation: lp-bounce 2s infinite;
}
.landing-page .scroll-indicator span {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--green-dark);
  letter-spacing: 4px;
  text-transform: uppercase;
}

/* ========== STATUS BAR ========== */
.landing-page .status-bar {
  position: relative;
  overflow: hidden;
  background: #050505;
  border-top: 1px solid rgba(0,255,65,0.15);
  border-bottom: 1px solid rgba(0,255,65,0.15);
  padding: 1rem 0;
}
.landing-page .status-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,65,0.04) 1px, rgba(0,255,65,0.04) 2px);
}

.landing-page .ticker-track {
  display: flex;
  width: max-content;
  animation: lp-ticker 30s linear infinite;
}
.landing-page .ticker-track span {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--green);
  letter-spacing: 2px;
  white-space: nowrap;
  padding: 0 1.5rem;
}

/* ========== SECTIONS BASE ========== */
.landing-page .section {
  padding: 6rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.landing-page .section-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--green);
  letter-spacing: 6px;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.landing-page .section-title {
  font-family: var(--font-mono);
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--white);
  margin-bottom: 1rem;
  line-height: 1.2;
}

.landing-page .section-subtitle {
  font-family: var(--font-mono);
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: var(--grey);
  margin-bottom: 3rem;
}

/* ========== TERMINAL WINDOW ========== */
.landing-page .terminal {
  background: #0A0A0A;
  border: 1px solid rgba(0,255,65,0.2);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 3rem;
  box-shadow: 0 0 30px rgba(0,255,65,0.05);
}

.landing-page .terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.8rem 1rem;
  background: #111;
  border-bottom: 1px solid rgba(0,255,65,0.1);
}
.landing-page .terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.landing-page .terminal-dot.red { background: #3a1111; }
.landing-page .terminal-dot.yellow { background: #2a2a0a; }
.landing-page .terminal-dot.green { background: var(--green-dark); }
.landing-page .terminal-title {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--grey);
  margin-left: 0.5rem;
}

.landing-page .terminal-body {
  padding: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 2;
  color: var(--green);
}
.landing-page .terminal-body .line {
  opacity: 0;
  transform: translateY(10px);
}
.landing-page .terminal-body .line.visible {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.4s ease;
}
.landing-page .terminal-body .ok { color: var(--green); }
.landing-page .terminal-body .prompt { color: var(--grey); }

.landing-page .terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 1em;
  background: var(--green);
  animation: lp-blink 1s step-end infinite;
  vertical-align: middle;
}

/* ========== WHAT IS PHANTOM ========== */
.landing-page .what-is .content-text {
  max-width: 800px;
}
.landing-page .what-is .content-text h3 {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 3vw, 2rem);
  color: var(--white);
  margin-bottom: 1.5rem;
  font-weight: 700;
}
.landing-page .what-is .content-text p {
  font-size: 1rem;
  color: #ccc;
  line-height: 1.8;
}

/* ========== SECURITY SHOWCASE ========== */
.landing-page .security-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.landing-page .security-card {
  background: var(--card-bg);
  border: 1px solid rgba(0,255,65,0.12);
  padding: 2.5rem 2rem;
  position: relative;
  transition: all 0.4s;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
}
.landing-page .security-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.landing-page .security-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--green), transparent);
}
.landing-page .security-card:hover {
  border-color: rgba(0,255,65,0.3);
  box-shadow: 0 0 40px rgba(0,255,65,0.08);
  transform: translateY(-4px);
}

.landing-page .security-icon {
  font-size: 2rem;
  margin-bottom: 1.2rem;
}

.landing-page .security-title {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--green);
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.landing-page .security-detail {
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.7;
}

/* ========== FEATURES GRID ========== */
.landing-page .features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.landing-page .feature-card {
  background: var(--card-bg);
  border: 1px solid rgba(0,255,65,0.08);
  border-top: 2px solid var(--green-dark);
  padding: 2rem 1.5rem;
  transition: all 0.4s;
  opacity: 0;
  transform: translateY(30px);
}
.landing-page .feature-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.landing-page .feature-card:hover {
  border-color: rgba(0,255,65,0.3);
  box-shadow: 0 0 30px rgba(0,255,65,0.1);
  transform: translateY(-4px);
}

.landing-page .feature-icon {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  display: block;
}

.landing-page .feature-name {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--white);
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
}

.landing-page .feature-desc {
  font-size: 0.8rem;
  color: var(--grey);
  line-height: 1.5;
}

/* ========== COMPARISON TABLE ========== */
.landing-page .comparison-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.landing-page .comparison-table {
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.landing-page .comparison-table thead th {
  padding: 1rem;
  text-align: center;
  color: var(--green);
  letter-spacing: 2px;
  text-transform: uppercase;
  border-bottom: 2px solid var(--green-dark);
  font-size: 0.75rem;
}
.landing-page .comparison-table thead th:first-child { text-align: left; }
.landing-page .comparison-table thead th.phantom-col {
  background: rgba(0,255,65,0.05);
  box-shadow: inset 0 0 20px rgba(0,255,65,0.05);
}

.landing-page .comparison-table tbody td {
  padding: 0.8rem 1rem;
  text-align: center;
  border-bottom: 1px solid #111;
  color: var(--grey);
}
.landing-page .comparison-table tbody td:first-child {
  text-align: left;
  color: var(--white);
}
.landing-page .comparison-table tbody td.phantom-col {
  background: rgba(0,255,65,0.03);
}

.landing-page .comparison-table tbody tr:hover td { background: rgba(0,255,65,0.02); }
.landing-page .comparison-table tbody tr:hover td.phantom-col { background: rgba(0,255,65,0.06); }

.landing-page .check { color: var(--green); font-size: 1.1rem; }
.landing-page .cross { color: #661111; font-size: 1.1rem; }

.landing-page .comparison-table thead th.tor-col {
  background: rgba(102,17,17,0.08);
  color: #aa4444;
}
.landing-page .comparison-table tbody td.tor-col {
  background: rgba(102,17,17,0.03);
}
.landing-page .comparison-table tbody tr:hover td.tor-col { background: rgba(102,17,17,0.06); }
.landing-page .comparison-table .tor-note {
  font-size: 0.65rem;
  color: #666;
  display: block;
  margin-top: 2px;
}

.landing-page .comparison-result {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--green);
  text-align: center;
  margin-top: 2rem;
  letter-spacing: 2px;
}

/* ========== DARK WEB COMPARISON ========== */
.landing-page .darkweb-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}
.landing-page .darkweb-card {
  background: var(--card-bg);
  border: 1px solid rgba(0,255,65,0.08);
  padding: 2.5rem 2rem;
  position: relative;
  transition: all 0.4s;
  opacity: 0;
  transform: translateY(30px);
}
.landing-page .darkweb-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.landing-page .darkweb-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--green), transparent);
}
.landing-page .darkweb-card:hover {
  border-color: rgba(0,255,65,0.25);
  box-shadow: 0 0 30px rgba(0,255,65,0.06);
  transform: translateY(-4px);
}
.landing-page .darkweb-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}
.landing-page .darkweb-title {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--green);
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}
.landing-page .darkweb-detail {
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.7;
}
.landing-page .darkweb-analogy {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--green);
  margin-top: 1rem;
  padding: 0.6rem 0.8rem;
  border-left: 2px solid var(--green-dark);
  background: rgba(0,255,65,0.02);
}

.landing-page .darkweb-quote {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--green);
  line-height: 1.8;
  text-align: center;
  max-width: 800px;
  margin: 4rem auto 0;
  padding: 2rem;
  border: 1px solid rgba(0,255,65,0.15);
  background: rgba(0,255,65,0.02);
  position: relative;
}
.landing-page .darkweb-quote::before {
  content: '\\201C';
  position: absolute;
  top: -0.5rem;
  left: 1.5rem;
  font-size: 3rem;
  color: var(--green-dark);
  line-height: 1;
}

/* ========== WHO SHOULD USE ========== */
.landing-page .who-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-top: 2rem;
}
.landing-page .who-card {
  background: var(--card-bg);
  padding: 2.5rem 2rem;
  border: 1px solid #222;
  position: relative;
}
.landing-page .who-card.phantom-card {
  border-color: var(--green);
  box-shadow: 0 0 30px rgba(0,255,65,0.08);
}
.landing-page .who-card-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}
.landing-page .who-card .who-card-label { color: var(--grey); }
.landing-page .who-card.phantom-card .who-card-label { color: var(--green); text-shadow: 0 0 10px rgba(0,255,65,0.5); }
.landing-page .who-list {
  list-style: none;
}
.landing-page .who-list li {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #ccc;
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;
}
.landing-page .who-list li::before {
  content: '\\25B8';
  position: absolute;
  left: 0;
}
.landing-page .who-card .who-list li::before { color: var(--grey-dark); }
.landing-page .who-card.phantom-card .who-list li::before { color: var(--green); }

@media (max-width: 900px) {
  .landing-page .darkweb-grid { grid-template-columns: 1fr; }
  .landing-page .who-grid { grid-template-columns: 1fr; }
}

/* ========== PRICING ========== */
.landing-page .pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  align-items: start;
}

.landing-page .pricing-card {
  background: var(--card-bg);
  border: 1px solid #222;
  padding: 2.5rem 2rem;
  position: relative;
  transition: all 0.4s;
}
.landing-page .pricing-card:hover {
  transform: translateY(-4px);
}

.landing-page .pricing-card.essential {
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-8px);
}
.landing-page .pricing-card.essential:hover { transform: translateY(-12px); }

.landing-page .pricing-card.pro {
  border-color: var(--green);
  box-shadow: 0 0 40px rgba(0,255,65,0.1);
}
.landing-page .pricing-card.pro:hover {
  box-shadow: 0 0 60px rgba(0,255,65,0.2);
  transform: translateY(-4px);
}

.landing-page .pricing-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--green);
  letter-spacing: 2px;
  text-transform: uppercase;
  border: 1px solid var(--green-dark);
  padding: 0.25rem 0.5rem;
}

.landing-page .pricing-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 1rem;
}
.landing-page .pricing-card.free .pricing-label { color: var(--grey); }
.landing-page .pricing-card.essential .pricing-label { color: var(--white); }
.landing-page .pricing-card.pro .pricing-label { color: var(--green); text-shadow: 0 0 10px rgba(0,255,65,0.5); }

.landing-page .pricing-price {
  font-family: var(--font-mono);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--white);
  margin-bottom: 0.25rem;
}
.landing-page .pricing-price small {
  font-size: 0.8rem;
  color: var(--grey);
  font-weight: 400;
}

.landing-page .pricing-features {
  list-style: none;
  margin: 2rem 0;
}
.landing-page .pricing-features li {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--grey);
  padding: 0.4rem 0;
  padding-left: 1.2rem;
  position: relative;
  line-height: 1.5;
}
.landing-page .pricing-features li::before {
  content: '\\2014';
  position: absolute;
  left: 0;
  color: var(--green-dark);
}
.landing-page .pricing-card.pro .pricing-features li { color: var(--green); }
.landing-page .pricing-card.pro .pricing-features li::before { color: var(--green); }

.landing-page .pricing-btn {
  display: block;
  width: 100%;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 700;
}
.landing-page .pricing-card.free .pricing-btn {
  background: transparent;
  color: var(--grey);
  border: 1px solid var(--grey-dark);
}
.landing-page .pricing-card.free .pricing-btn:hover { border-color: var(--grey); }

.landing-page .pricing-card.essential .pricing-btn {
  background: var(--white);
  color: var(--bg);
}
.landing-page .pricing-card.essential .pricing-btn:hover { box-shadow: 0 0 20px rgba(255,255,255,0.2); }

.landing-page .pricing-card.pro .pricing-btn {
  background: var(--green);
  color: var(--bg);
  animation: lp-pulse-green 2s infinite;
}
.landing-page .pricing-card.pro .pricing-btn:hover { box-shadow: var(--glow-strong); }

.landing-page .pricing-note {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--grey);
  margin-top: 3rem;
  letter-spacing: 1px;
}

/* ========== HOW IT WORKS ========== */
.landing-page .steps {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  position: relative;
  padding-left: 3rem;
}
.landing-page .steps::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 2px dashed var(--green-dark);
}

.landing-page .step {
  position: relative;
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.6s;
}
.landing-page .step.visible {
  opacity: 1;
  transform: translateX(0);
}

.landing-page .step-number {
  position: absolute;
  left: -3rem;
  top: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--green);
  border: 1px solid var(--green-dark);
  background: var(--bg);
  z-index: 1;
}

.landing-page .step-title {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--white);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.landing-page .step-desc {
  font-size: 0.9rem;
  color: var(--grey);
  line-height: 1.7;
  max-width: 600px;
}

/* ========== BITCOIN ECONOMY ========== */
.landing-page .bitcoin-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.landing-page .bitcoin-text h3 {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--green);
  letter-spacing: 2px;
  margin-bottom: 2rem;
}

.landing-page .bitcoin-points {
  list-style: none;
}
.landing-page .bitcoin-points li {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: #ccc;
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;
}
.landing-page .bitcoin-points li::before {
  content: '\\25B8';
  position: absolute;
  left: 0;
  color: var(--green);
}

.landing-page .bitcoin-fees {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--green);
  letter-spacing: 2px;
  margin-top: 2rem;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(0,255,65,0.15);
  display: inline-block;
}

.landing-page .bitcoin-visual {
  position: relative;
  height: 400px;
}
.landing-page #particle-canvas {
  width: 100%;
  height: 100%;
}

/* ========== WAITLIST ========== */
.landing-page .waitlist {
  text-align: center;
  position: relative;
  overflow: hidden;
  padding: 8rem 2rem;
}
.landing-page .waitlist-content {
  position: relative;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
}

.landing-page .waitlist-title {
  font-family: var(--font-mono);
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  color: var(--white);
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.landing-page .waitlist-subtitle {
  font-size: 1rem;
  color: var(--grey);
  margin-bottom: 0.5rem;
}
.landing-page .waitlist-note {
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 3rem;
}

.landing-page .waitlist-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 450px;
  margin: 0 auto 2rem;
}

.landing-page .waitlist-input {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 1rem 1.2rem;
  background: #0A0A0A;
  border: 1px solid #222;
  color: var(--white);
  outline: none;
  letter-spacing: 1px;
  transition: all 0.3s;
}
.landing-page .waitlist-input::placeholder { color: #444; }
.landing-page .waitlist-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 20px rgba(0,255,65,0.1);
}

.landing-page .waitlist-submit {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 1rem;
  background: var(--green);
  color: var(--bg);
  border: none;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s;
}
.landing-page .waitlist-submit:hover {
  box-shadow: var(--glow-strong);
}

.landing-page .waitlist-disclaimer {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: #444;
  line-height: 1.8;
  letter-spacing: 0.5px;
}

.landing-page .waitlist-success {
  display: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--green);
  line-height: 2;
  text-align: left;
  max-width: 450px;
  margin: 0 auto;
  padding: 1.5rem;
  border: 1px solid rgba(0,255,65,0.2);
  background: rgba(0,255,65,0.02);
}

/* ========== FOOTER ========== */
.landing-page .footer {
  border-top: 2px solid var(--green-dark);
  padding: 4rem 2rem 2rem;
  background: #020202;
}

.landing-page .footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

.landing-page .footer-brand {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--white);
  letter-spacing: 3px;
  margin-bottom: 0.75rem;
}
.landing-page .footer-tagline {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--grey);
  margin-bottom: 1rem;
}
.landing-page .footer-copy {
  font-size: 0.7rem;
  color: #444;
}

.landing-page .footer-heading {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--green);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.landing-page .footer-links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.landing-page .footer-links a {
  font-size: 0.8rem;
  color: var(--grey);
  text-decoration: none;
  transition: color 0.3s;
}
.landing-page .footer-links a:hover { color: var(--green); }

.landing-page .footer-social {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.landing-page .footer-social a {
  width: 36px;
  height: 36px;
  border: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--grey);
  text-decoration: none;
  font-size: 0.8rem;
  transition: all 0.3s;
}
.landing-page .footer-social a:hover {
  border-color: var(--green);
  color: var(--green);
}

.landing-page .footer-email {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--grey);
  text-decoration: none;
}
.landing-page .footer-email:hover { color: var(--green); }

.landing-page .footer-bottom {
  border-top: 1px solid #111;
  padding-top: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
}

.landing-page .footer-ticker {
  display: flex;
  width: max-content;
  animation: lp-ticker 25s linear infinite;
}
.landing-page .footer-ticker span {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--green-dark);
  letter-spacing: 3px;
  white-space: nowrap;
  padding: 0 1rem;
}

/* ========== ANIMATIONS ========== */
@keyframes lp-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes lp-fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes lp-glitch-1 {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
}

@keyframes lp-glitch-2 {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(2px, -1px); }
  40% { transform: translate(2px, 1px); }
  60% { transform: translate(-2px, -1px); }
  80% { transform: translate(-2px, 1px); }
}

@keyframes lp-pulse-green {
  0%, 100% { box-shadow: 0 0 10px rgba(0,255,65,0.2); }
  50% { box-shadow: 0 0 30px rgba(0,255,65,0.4); }
}

@keyframes lp-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

@keyframes lp-ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* Reveal animation class */
.landing-page .reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.landing-page .reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 900px) {
  .landing-page .features-grid { grid-template-columns: repeat(2, 1fr); }
  .landing-page .pricing-grid { grid-template-columns: 1fr; max-width: 450px; margin: 0 auto; }
  .landing-page .pricing-card.essential { transform: none; }
  .landing-page .bitcoin-section { grid-template-columns: 1fr; }
  .landing-page .bitcoin-visual { height: 300px; }
  .landing-page .footer-grid { grid-template-columns: 1fr; gap: 2rem; }
}

@media (max-width: 640px) {
  .landing-page .security-grid { grid-template-columns: 1fr; }
  .landing-page .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.95);
    flex-direction: column;
    padding: 2rem;
    gap: 1.5rem;
    border-bottom: 1px solid rgba(0,255,65,0.1);
  }
  .landing-page .nav-links.open { display: flex; }
  .landing-page .nav-toggle { display: block; }
  .landing-page .features-grid { grid-template-columns: 1fr; }
  .landing-page .hero-buttons { flex-direction: column; align-items: center; }
  .landing-page .section { padding: 4rem 1.5rem; }
  .landing-page .steps { padding-left: 2.5rem; }
}
`;

export default function Landing() {
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Fonts
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'anonymous';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(link3);

    // Inject scoped CSS
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-landing-page', 'true');
    styleEl.textContent = LANDING_CSS;
    document.head.appendChild(styleEl);

    // Inject HTML content
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = `
<!-- ========== NAV ========== -->
<nav class="nav" id="nav">
  <a href="#" class="nav-logo">PHANTOM MESSENGER<span class="cursor"></span></a>
  <ul class="nav-links" id="navLinks">
    <li><a href="#features">Features</a></li>
    <li><a href="#pricing">Pricing</a></li>
    <li><a href="#why-phantom">Why Phantom</a></li>
    <li><a data-nav-register="true" href="/register">Get Access</a></li>
  </ul>
  <button class="nav-toggle" id="navToggle">[=]</button>
</nav>

<!-- ========== HERO ========== -->
<section class="hero" id="hero">
  <canvas id="matrixCanvas"></canvas>
  <div class="hero-content">
    <div class="hero-label">[ CLASSIFIED COMMUNICATION ]</div>
    <h1 class="hero-title" data-text="PHANTOM&#10;MESSENGER">PHANTOM<br>MESSENGER</h1>
    <div class="hero-tagline" id="heroTagline"><span class="typed-cursor"></span></div>
    <div class="hero-buttons">
      <a data-nav-register="true" href="/register" class="btn-primary">[ JOIN NOW ]</a>
      <a href="#features" class="btn-secondary">[ VIEW FEATURES ]</a>
    </div>
    <p class="hero-subtext">No phone number required. No identity required. No compromises.</p>
  </div>
  <div class="scroll-indicator">
    <span class="arrow">&#8964;</span>
    <span>SCROLL TO DECRYPT</span>
  </div>
</section>

<!-- ========== STATUS BAR ========== -->
<div class="status-bar">
  <div class="ticker-track">
    <span>[ ENCRYPTION: ACTIVE ]</span><span>&middot;&middot;&middot;</span>
    <span>[ METADATA: NULL ]</span><span>&middot;&middot;&middot;</span>
    <span>[ IP LOG: DISABLED ]</span><span>&middot;&middot;&middot;</span>
    <span>[ MESSAGES STORED: 0 ]</span><span>&middot;&middot;&middot;</span>
    <span>[ SURVEILLANCE: BLOCKED ]</span><span>&middot;&middot;&middot;</span>
    <span>[ STATUS: SECURE ]</span><span>&middot;&middot;&middot;</span>
    <span>[ ENCRYPTION: ACTIVE ]</span><span>&middot;&middot;&middot;</span>
    <span>[ METADATA: NULL ]</span><span>&middot;&middot;&middot;</span>
    <span>[ IP LOG: DISABLED ]</span><span>&middot;&middot;&middot;</span>
    <span>[ MESSAGES STORED: 0 ]</span><span>&middot;&middot;&middot;</span>
    <span>[ SURVEILLANCE: BLOCKED ]</span><span>&middot;&middot;&middot;</span>
    <span>[ STATUS: SECURE ]</span><span>&middot;&middot;&middot;</span>
  </div>
</div>

<!-- ========== WHAT IS PHANTOM ========== -->
<section class="section what-is" id="why-phantom">
  <div class="reveal">
    <div class="terminal">
      <div class="terminal-bar">
        <span class="terminal-dot red"></span>
        <span class="terminal-dot yellow"></span>
        <span class="terminal-dot green"></span>
        <span class="terminal-title">phantom_messenger.exe</span>
      </div>
      <div class="terminal-body" id="terminalBody">
        <div class="line"><span class="prompt">&gt;</span> INITIALIZING PHANTOM MESSENGER...</div>
        <div class="line"><span class="prompt">&gt;</span> ENCRYPTION PROTOCOL: PHANTOM PROTOCOL <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> METADATA COLLECTION: DISABLED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> IP LOGGING: NULL <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SERVER KNOWLEDGE: ZERO <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SCREENSHOT CAPTURE: BLOCKED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SCREEN RECORDING: BLOCKED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SCREEN SHARING: BLOCKED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> PEGASUS SPYWARE: NEUTRALIZED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> FAKE NETWORK DETECTION: ACTIVE <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SERVER LOCATION: OUTSIDE US JURISDICTION <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> BITCOIN WALLET: INTEGRATED <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> LIGHTNING NETWORK: ACTIVE <span class="ok">[OK]</span></div>
        <div class="line"><span class="prompt">&gt;</span> SYSTEM STATUS: FULLY OPERATIONAL</div>
        <div class="line"><span class="terminal-cursor"></span></div>
      </div>
    </div>
    <div class="content-text">
      <h3>The Last Messenger You Will Ever Need</h3>
      <p>Phantom Messenger is built on a single principle \u2014 your privacy is mathematically enforced, not just promised. We use military grade Phantom Protocol encryption, zero knowledge architecture, and sealed sender technology to ensure that even we cannot read your messages. Not won't. Cannot. There is a difference. Built with a fully integrated Bitcoin economy so you can communicate and transact privately in one place.</p>
    </div>
  </div>
</section>

<!-- ========== SECURITY SHOWCASE ========== -->
<section class="section security-section" id="security">
  <div class="reveal">
    <div class="section-label">[ THREAT NEUTRALIZATION ]</div>
    <div class="section-title">Built For The Highest Levels Of Privacy</div>
    <div class="section-subtitle">Every attack vector. Closed.</div>
  </div>
  <div class="security-grid reveal">
    <div class="security-card">
      <div class="security-icon">\uD83C\uDF10</div>
      <div class="security-title">Servers Outside US Jurisdiction</div>
      <div class="security-detail">All Phantom infrastructure operates outside United States jurisdiction. No FISA court orders. No NSA taps. No Patriot Act subpoenas. Our servers are located in privacy-respecting jurisdictions with strong data protection laws. Even if a government comes knocking \u2014 they are knocking on the wrong door, in the wrong country, under the wrong legal framework.</div>
    </div>
    <div class="security-card">
      <div class="security-icon">\uD83D\uDCF5</div>
      <div class="security-title">Total Screen Capture Defense</div>
      <div class="security-detail">Phantom enforces FLAG_SECURE at the OS level on every single screen in the app. Screenshots are blocked. Screen recordings are blocked. Screen sharing is blocked. Screen mirroring is blocked. No one can capture what is on your screen \u2014 not a person looking over your shoulder with a screen recorder, not an app running in the background, not a remote access tool. Your conversations exist only in the moment they are read.</div>
    </div>
    <div class="security-card">
      <div class="security-icon">\uD83D\uDD77\uFE0F</div>
      <div class="security-title">Pegasus Spyware Defense</div>
      <div class="security-detail">NSO Group's Pegasus is the most sophisticated commercial spyware ever deployed \u2014 used by governments worldwide to surveil journalists, activists, and political targets. Phantom is purpose-built to resist it. Our anti-exploitation layer detects and blocks zero-click injection vectors, prevents privilege escalation, and isolates the app from compromised OS components. Even on an infected device, Phantom fights back.</div>
    </div>
    <div class="security-card">
      <div class="security-icon">\uD83D\uDCE1</div>
      <div class="security-title">Fake Network Protection</div>
      <div class="security-detail">IMSI catchers \u2014 also known as Stingrays \u2014 are fake cell towers used by law enforcement and intelligence agencies to intercept mobile communications. Phantom detects rogue base stations, fake Wi-Fi access points, and man-in-the-middle network attacks in real time. If your connection is being intercepted, Phantom alerts you, blocks transmission, and reroutes through verified encrypted channels. Your data never touches a compromised network.</div>
    </div>
    <div class="security-card">
      <div class="security-icon">\uD83D\uDEE1\uFE0F</div>
      <div class="security-title">Anti-Forensics At Every Layer</div>
      <div class="security-detail">If your device is seized, there is nothing to find. Phantom overwrites deleted data with cryptographic noise. RAM is scrubbed on app close. No SQLite databases. No plaintext logs. No recoverable message fragments. Commercial forensic tools like Cellebrite and GrayKey will find exactly what we want them to find \u2014 nothing. Your device is a dead end.</div>
    </div>
    <div class="security-card">
      <div class="security-icon">\u26A0\uFE0F</div>
      <div class="security-title">Zero Trust Architecture</div>
      <div class="security-detail">Phantom trusts nothing and no one \u2014 not the network, not the server, not even the operating system. Every component is sandboxed. Every connection is verified end-to-end. Keys are stored in hardware-backed secure enclaves. There is no single point of failure, no master key, no admin backdoor. The system is designed so that compromising any single component reveals nothing about any other.</div>
    </div>
  </div>
</section>

<!-- ========== FEATURES ========== -->
<section class="section" id="features">
  <div class="reveal">
    <div class="section-label">[ SYSTEM CAPABILITIES ]</div>
    <div class="section-title">Everything Signal Wishes It Had.</div>
    <div class="section-subtitle">And Everything Telegram Will Never Have.</div>
  </div>
  <div class="features-grid" id="featuresGrid">
    <div class="feature-card"><span class="feature-icon">\uD83D\uDD12</span><div class="feature-name">End-To-End Encryption</div><div class="feature-desc">Every single message is encrypted using the Phantom Protocol \u2014 our proprietary encryption engine built from the ground up. Text, images, voice, video. No exceptions. No backdoors. Mathematically impossible to intercept.</div></div>
    <div class="feature-card"><span class="feature-icon">\u2205</span><div class="feature-name">Zero Metadata</div><div class="feature-desc">Most apps encrypt your messages but still log who you talk to, when, and how often. Phantom collects none of it. No contact graphs. No timestamps. No frequency analysis. Your social map is invisible \u2014 even to us.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDCE8</span><div class="feature-name">Sealed Sender</div><div class="feature-desc">Our servers relay encrypted packets without knowing who sent them. The sender's identity is sealed inside the encryption layer \u2014 meaning not even our own infrastructure knows the origin of any message passing through it.</div></div>
    <div class="feature-card"><span class="feature-icon">\u20BF</span><div class="feature-name">Built-in Bitcoin Wallet</div><div class="feature-desc">A full non-custodial Bitcoin wallet lives inside every Phantom account. Send, receive, and store BTC without ever leaving the app. No third-party wallet apps. No KYC. No bank. Just you and your keys.</div></div>
    <div class="feature-card"><span class="feature-icon">\u26A1</span><div class="feature-name">Lightning Network</div><div class="feature-desc">Send Bitcoin to any contact instantly with near-zero fees via the Lightning Network. Micropayments, tips, subscriptions, and commerce \u2014 all settled in seconds. The speed of Venmo with the privacy of cash.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDEE1\uFE0F</span><div class="feature-name">Screenshot Blocked</div><div class="feature-desc">FLAG_SECURE is enforced on every screen in the app, blocking screenshots and screen recordings at the OS level. This also defeats advanced spyware like Pegasus from capturing your screen content in real time.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDEA8</span><div class="feature-name">Panic Button</div><div class="feature-desc">One tap. Everything gone. The panic button instantly and permanently wipes all messages, keys, wallet data, and account identity from your device. No recovery possible. For moments when deletion is not optional.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDD10</span><div class="feature-name">Duress PIN</div><div class="feature-desc">Enter your duress PIN instead of your real one, and Phantom opens a convincing decoy app with fake conversations and an empty wallet. Anyone forcing you to unlock your phone will see exactly what you want them to see.</div></div>
    <div class="feature-card"><span class="feature-icon">\u23F3</span><div class="feature-name">Disappearing Messages</div><div class="feature-desc">Set messages to self-destruct after 5 seconds, 1 hour, 24 hours, or 7 days. Once the timer expires, messages are wiped from both devices with zero recoverable trace. Not archived. Not hidden. Destroyed.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDC7B</span><div class="feature-name">Anonymous Accounts</div><div class="feature-desc">Create your account with a 12-word seed phrase and nothing else. No phone number. No email. No government name. Your identity is a cryptographic key pair \u2014 portable, anonymous, and entirely under your control.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDCDE</span><div class="feature-name">Encrypted Calls</div><div class="feature-desc">Crystal-clear voice and video calls encrypted end-to-end with the Phantom Protocol. No call logs stored on our servers. No metadata about who called whom. Just a direct, private line between two people.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83D\uDC65</span><div class="feature-name">Private Groups</div><div class="feature-desc">Create fully encrypted group conversations with up to 1,000 members. Every message, image, and file is encrypted for every participant individually. Group admins control access. No one outside the group \u2014 including us \u2014 can see a thing.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83C\uDFEA</span><div class="feature-name">Storefronts</div><div class="feature-desc">Launch a private storefront inside any encrypted channel. List products or services, accept Bitcoin payments, and manage orders \u2014 all within Phantom. Run your entire business without ever exposing your identity or your customers'.</div></div>
    <div class="feature-card"><span class="feature-icon">\uD83E\uDDF9</span><div class="feature-name">Anti-Forensics Mode</div><div class="feature-desc">When enabled, Phantom overwrites deleted data with cryptographic noise, disables swap files, and prevents any forensic tool from recovering message fragments \u2014 even from a physically seized device with full disk access.</div></div>
    <div class="feature-card"><span class="feature-icon">\u2601\uFE0F</span><div class="feature-name">No iCloud Backup</div><div class="feature-desc">Phantom is excluded from iCloud and Google Drive backups entirely. Your messages never touch Apple or Google servers. No cloud copies. No accidental syncs. What lives on your device stays on your device \u2014 nowhere else.</div></div>
  </div>
</section>

<!-- ========== COMPARISON ========== -->
<section class="section" id="comparison">
  <div class="reveal">
    <div class="section-label">[ THREAT ASSESSMENT ]</div>
    <div class="section-title">How Do You Compare?</div>
    <div class="section-subtitle">We ran the numbers.</div>
  </div>
  <div class="comparison-wrapper reveal">
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Signal</th>
          <th>Telegram</th>
          <th class="tor-col">Tor Browser</th>
          <th class="phantom-col">PHANTOM</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>End-To-End Encryption</td><td><span class="check">\u2713</span></td><td><span class="cross">\u2717</span><span class="tor-note">Opt-in only</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Connection only, not content</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Non-Custodial Bitcoin Wallet</td><td><span class="cross">\u2717</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Anonymous Sign-Up</td><td><span class="cross">\u2717</span><span class="tor-note">Phone required</span></td><td><span class="cross">\u2717</span><span class="tor-note">Phone required</span></td><td class="tor-col"><span class="check">\u2713</span><span class="tor-note">Not a messenger</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Zero Metadata</td><td><span class="check">\u2713</span><span class="tor-note">Partial</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Traffic analysis</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Disappearing Messages</td><td><span class="check">\u2713</span></td><td><span class="check">\u2713</span><span class="tor-note">Secret chats</span></td><td class="tor-col"><span class="cross">\u2717</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Screen Capture Protection</td><td><span class="cross">\u2717</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Panic Button / Duress PIN</td><td><span class="cross">\u2717</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Device-Level Protection</td><td><span class="cross">\u2717</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Payment Privacy</td><td><span class="cross">\u2717</span></td><td><span class="cross">\u2717</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">On-chain traceable</span></td><td class="phantom-col"><span class="check">\u2713</span><span class="tor-note">Lightning Network</span></td></tr>
        <tr><td>Server Seizure Risk</td><td><span class="check">\u2713</span><span class="tor-note">Low</span></td><td><span class="cross">\u2717</span><span class="tor-note">High</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Sites seized constantly</span></td><td class="phantom-col"><span class="check">\u2713</span><span class="tor-note">Nothing to seize</span></td></tr>
        <tr><td>Ease Of Use</td><td><span class="check">\u2713</span></td><td><span class="check">\u2713</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Technical knowledge</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Works On iPhone</td><td><span class="check">\u2713</span></td><td><span class="check">\u2713</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Limited</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Legal Status</td><td><span class="check">\u2713</span></td><td><span class="check">\u2713</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Grey area</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Reliability</td><td><span class="check">\u2713</span></td><td><span class="check">\u2713</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Slow and unreliable</span></td><td class="phantom-col"><span class="check">\u2713</span></td></tr>
        <tr><td>Deanonymization Resistant</td><td><span class="check">\u2713</span><span class="tor-note">Unlikely</span></td><td><span class="cross">\u2717</span><span class="tor-note">Metadata exposed</span></td><td class="tor-col"><span class="cross">\u2717</span><span class="tor-note">Proven repeatedly</span></td><td class="phantom-col"><span class="check">\u2713</span><span class="tor-note">Math prevents it</span></td></tr>
      </tbody>
    </table>
    <div class="comparison-result">PHANTOM MESSENGER WINS: 15/15 CATEGORIES</div>
  </div>
</section>

<!-- ========== PHANTOM VS DARK WEB ========== -->
<section class="section" id="darkweb">
  <div class="reveal">
    <div class="section-label">[ DECLASSIFIED ]</div>
    <div class="section-title">Why Phantom Makes The Dark Web Obsolete</div>
    <div class="section-subtitle">Different approach. Superior result.</div>
  </div>
  <div class="darkweb-grid">
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\uD83D\uDD12</div>
      <div class="darkweb-title">Content Encryption vs Connection Encryption</div>
      <div class="darkweb-detail">Tor hides WHERE you are going but not WHAT you are sending. Exit nodes can read unencrypted traffic. Phantom encrypts the CONTENT of every message before it leaves your device. Even if someone intercepted your Phantom traffic they would see nothing but encrypted noise.</div>
      <div class="darkweb-analogy">"Tor is a tinted-window car to a secret meeting. Phantom is speaking in a code only your recipient understands."</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\uD83D\uDDA5\uFE0F</div>
      <div class="darkweb-title">No Servers To Seize</div>
      <div class="darkweb-detail">Dark web sites have servers. When seized, every user gets exposed. Silk Road. AlphaBay. Hansa. DarkMarket \u2014 all seized, all users exposed. Phantom: messages deleted from servers the moment they are delivered. No message history. No user identity. Even a full server seizure yields encrypted blobs and hashed usernames \u2014 mathematically useless.</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\uD83D\uDCF1</div>
      <div class="darkweb-title">Works Like A Normal App</div>
      <div class="darkweb-detail">Tor requires technical knowledge most people do not have. Misconfigured browsers, JavaScript leaks, DNS resolution errors \u2014 most users make mistakes that expose them. Phantom works like any normal app on your iPhone or Android. The complexity is invisible. The security is automatic.</div>
      <div class="darkweb-analogy">"Privacy that requires technical expertise is not real privacy for most people."</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F</div>
      <div class="darkweb-title">Sealed Sender vs Traffic Analysis</div>
      <div class="darkweb-detail">Tor is vulnerable to traffic analysis \u2014 governments run their own Tor nodes to correlate traffic patterns. Timing attacks, guard node surveillance, and correlation attacks have deanonymized users repeatedly. Phantom\u2019s Sealed Sender means our own servers literally cannot see who sent a message to whom. The social graph does not exist anywhere.</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\uD83D\uDEE1\uFE0F</div>
      <div class="darkweb-title">Device-Level Protection</div>
      <div class="darkweb-detail">Tor does nothing if your device is compromised. Spyware reads what is on your screen regardless of how you connected. Phantom blocks screen capture at the OS level, defends against Pegasus spyware, wipes secure memory on exit, offers a duress PIN that opens a decoy app, and has a panic button for instant total data destruction.</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\u26A1</div>
      <div class="darkweb-title">Lightning Network vs Traceable Bitcoin</div>
      <div class="darkweb-detail">Dark web Bitcoin transactions are permanently recorded on the public blockchain. Chainalysis and similar firms trace them for the FBI, DEA, and IRS regularly. Phantom uses Lightning Network: transactions do not appear on the public blockchain, leave no permanent record, settle in seconds, and cannot be traced back to either party.</div>
    </div>
    <div class="darkweb-card reveal">
      <div class="darkweb-icon">\u2705</div>
      <div class="darkweb-title">Fully Legal And Legitimate</div>
      <div class="darkweb-detail">The dark web carries legal risk just from association. Law enforcement monitors it heavily. Accessing certain services is itself a crime in many jurisdictions. Phantom is a legitimate registered business, available on official App Stores, built on open-source encryption standards. Journalists, lawyers, executives, and activists use Phantom for legally protected private communication.</div>
    </div>
  </div>
  <div class="darkweb-quote reveal">The dark web tries to hide where you are going. Phantom makes what you are saying mathematically impossible to understand regardless of where it goes. One hides your path. The other makes the destination irrelevant.</div>
</section>

<!-- ========== WHO SHOULD USE WHAT ========== -->
<section class="section" id="who-uses">
  <div class="reveal">
    <div class="section-label">[ USE CASE ANALYSIS ]</div>
    <div class="section-title">The Right Tool For The Job</div>
  </div>
  <div class="who-grid reveal">
    <div class="who-card">
      <div class="who-card-label">[ TOR / DARK WEB ]</div>
      <ul class="who-list">
        <li>Accessing censored information in authoritarian countries</li>
        <li>Whistleblowers accessing specific hidden services</li>
        <li>Security researchers and journalists investigating the deep web</li>
        <li>People with deep technical knowledge and operational security training</li>
      </ul>
    </div>
    <div class="who-card phantom-card">
      <div class="who-card-label">[ PHANTOM MESSENGER ]</div>
      <ul class="who-list">
        <li>Anyone who wants real privacy in daily communication</li>
        <li>Professionals protecting legally privileged conversations</li>
        <li>Journalists protecting sources and sensitive leads</li>
        <li>Businesses protecting sensitive internal discussions</li>
        <li>Anyone who wants dark-web-level security in a beautiful, normal app</li>
      </ul>
    </div>
  </div>
</section>

<!-- ========== PRICING ========== -->
<section class="section" id="pricing">
  <div class="reveal">
    <div class="section-label">[ SELECT YOUR PLAN ]</div>
    <div class="section-title">Full Privacy Comes Standard. Pick Your Features.</div>
  </div>
  <div class="pricing-grid reveal">
    <!-- FREE -->
    <div class="pricing-card free">
      <div class="pricing-label">[ FREE ]</div>
      <div class="pricing-price">$0</div>
      <ul class="pricing-features">
        <li>5 contacts maximum</li>
        <li>50 messages per day combined</li>
        <li>Photo and video sharing</li>
        <li>Basic E2EE messaging</li>
        <li>All features visible \u2014 upgrade to unlock</li>
      </ul>
      <a data-nav-register="true" href="/register" class="pricing-btn">[ DOWNLOAD FREE ]</a>
    </div>
    <!-- ESSENTIAL -->
    <div class="pricing-card essential">
      <div class="pricing-label">[ ESSENTIAL ]</div>
      <div class="pricing-price">$24.99<small>/mo</small></div>
      <ul class="pricing-features">
        <li>50 contacts</li>
        <li>Unlimited messages</li>
        <li>Voice and video calls</li>
        <li>Group chats \u2014 25 members max</li>
        <li>30 min group calls \u2014 unlimited calls</li>
        <li>Disappearing messages</li>
        <li>Duress PIN + decoy app</li>
        <li>Bitcoin wallet + Lightning</li>
        <li>2 Storefronts \u2014 25 listings each</li>
        <li>Panic button</li>
      </ul>
      <a data-nav-register="true" href="/register" class="pricing-btn">[ GET ESSENTIAL ]</a>
    </div>
    <!-- PRO -->
    <div class="pricing-card pro">
      <div class="pricing-badge">MAXIMUM PRIVACY</div>
      <div class="pricing-label">[ PHANTOM PRO ]</div>
      <div class="pricing-price">$149.99<small>/mo</small></div>
      <ul class="pricing-features">
        <li>Unlimited contacts</li>
        <li>Unlimited messages</li>
        <li>Unlimited group members</li>
        <li>Unlimited group call participants</li>
        <li>No call time limits</li>
        <li>Unlimited Storefronts and listings</li>
        <li>Paid group and Storefront monetization</li>
        <li>Scheduled messages</li>
        <li>5 linked devices</li>
        <li>Priority support \u2014 4 hour response</li>
        <li>Every security feature unlocked</li>
        <li>Early access to new features</li>
      </ul>
      <a data-nav-register="true" href="/register" class="pricing-btn">[ GO PRO ]</a>
    </div>
  </div>
  <div class="pricing-note reveal">Every plan gets the same Phantom Protocol encryption. Every plan gets zero metadata. Every plan is fully private. The only difference is features \u2014 not security.</div>
</section>

<!-- ========== HOW IT WORKS ========== -->
<section class="section" id="how-it-works">
  <div class="reveal">
    <div class="section-label">[ PROTOCOL SEQUENCE ]</div>
    <div class="section-title">How Phantom Protects You</div>
  </div>
  <div class="steps">
    <div class="step">
      <div class="step-number">01</div>
      <div class="step-title">Create Your Identity</div>
      <div class="step-desc">Choose your account method. Maximum privacy users get a 12-word seed phrase \u2014 no email, no phone, no real name. You are your phrase. Nothing else.</div>
    </div>
    <div class="step">
      <div class="step-number">02</div>
      <div class="step-title">Keys Never Leave Your Device</div>
      <div class="step-desc">Your encryption keys are generated on your device and stored in hardware. They never touch our servers. Ever. We have nothing to hand over even if forced.</div>
    </div>
    <div class="step">
      <div class="step-number">03</div>
      <div class="step-title">Communicate In The Void</div>
      <div class="step-desc">Messages encrypt on your device. Travel as unreadable ciphertext. Decrypt only on your recipient's device. Server sees nothing. Logs nothing. Stores nothing.</div>
    </div>
  </div>
</section>

<!-- ========== BITCOIN ECONOMY ========== -->
<section class="section" id="bitcoin">
  <div class="reveal">
    <div class="section-label">[ FINANCIAL PROTOCOL ]</div>
    <div class="section-title">Your Messages And Your Money. Private.</div>
  </div>
  <div class="bitcoin-section reveal">
    <div class="bitcoin-text">
      <h3>The First Messenger With A Built-In Economy</h3>
      <ul class="bitcoin-points">
        <li>Send Bitcoin to anyone in your contacts</li>
        <li>Two-party escrow \u2014 both sides confirm receipt</li>
        <li>Lightning Network for instant near-zero fee payments</li>
        <li>Earn Bitcoin from paid groups and Storefronts</li>
        <li>Renew your subscription with earned Bitcoin</li>
        <li>Zero fee on subscription renewals</li>
        <li>Link your external Bitcoin wallet</li>
        <li>Anonymous \u2014 no KYC, no identity required</li>
      </ul>
      <div class="bitcoin-fees">[ TRANSACTION FEES: 3% P2P &middot; 3.5% COMMERCE &middot; 0% RENEWALS ]</div>
    </div>
    <div class="bitcoin-visual">
      <canvas id="particle-canvas"></canvas>
    </div>
  </div>
</section>

<!-- ========== WAITLIST ========== -->
<section class="waitlist" id="waitlist">
  <div class="waitlist-content">
    <div class="section-label">[ TRANSMISSION INCOMING ]</div>
    <div class="waitlist-title">BE FIRST.<br>BE PRIVATE.</div>
    <div class="waitlist-subtitle">Join now. Get your first month free.</div>
    <div class="waitlist-note">No spam. No tracking. Just a single email when Phantom Messenger launches.</div>
    <form class="waitlist-form" id="waitlistForm">
      <input type="text" class="waitlist-input" name="name" placeholder="YOUR NAME" required>
      <input type="email" class="waitlist-input" name="email" placeholder="YOUR EMAIL" required>
      <button type="submit" class="waitlist-submit">[ TRANSMIT ]</button>
    </form>
    <div class="waitlist-disclaimer">We do not sell your email. We do not share your email.<br>We barely want to know your email. That is kind of the whole point.</div>
    <div class="waitlist-success" id="waitlistSuccess">
      &gt; TRANSMISSION RECEIVED<br>
      &gt; IDENTITY LOGGED: ANONYMOUS<br>
      &gt; STATUS: FIRST ACCESS GRANTED<br>
      &gt; WELCOME TO PHANTOM<span class="terminal-cursor"></span>
    </div>
  </div>
</section>

<!-- ========== FOOTER ========== -->
<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand">PHANTOM MESSENGER</div>
      <div class="footer-tagline">Private by architecture. Not by promise.</div>
      <div class="footer-copy">&copy; 2025 Phantom Messenger LLC</div>
    </div>
    <div>
      <div class="footer-heading">NAVIGATION</div>
      <ul class="footer-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#why-phantom">Why Phantom</a></li>
        <li><a data-nav-register="true" href="/register">Early Access</a></li>
        <li><a href="#">Privacy Policy</a></li>
        <li><a href="#">Terms of Service</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-heading">CONNECT</div>
      <div class="footer-social">
        <a href="#" aria-label="X / Twitter"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>
      </div>
      <a href="mailto:contact@phantommessenger.app" class="footer-email">contact@phantommessenger.app</a>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="footer-ticker">
      <span>[ ENCRYPTED ]</span><span>&middot;</span>
      <span>[ ANONYMOUS ]</span><span>&middot;</span>
      <span>[ UNSTOPPABLE ]</span><span>&middot;</span>
      <span>[ ZERO METADATA ]</span><span>&middot;</span>
      <span>[ ZERO COMPROMISE ]</span><span>&middot;</span>
      <span>[ PRIVATE BY ARCHITECTURE ]</span><span>&middot;</span>
      <span>[ ENCRYPTED ]</span><span>&middot;</span>
      <span>[ ANONYMOUS ]</span><span>&middot;</span>
      <span>[ UNSTOPPABLE ]</span><span>&middot;</span>
      <span>[ ZERO METADATA ]</span><span>&middot;</span>
      <span>[ ZERO COMPROMISE ]</span><span>&middot;</span>
      <span>[ PRIVATE BY ARCHITECTURE ]</span><span>&middot;</span>
    </div>
  </div>
</footer>
`;

    // ========== Intercept register links with React Router ==========
    const handleClick = (e) => {
      const link = e.target.closest('a[data-nav-register="true"]');
      if (link) {
        e.preventDefault();
        navigate('/register');
      }
    };
    container.addEventListener('click', handleClick);

    // ========== MATRIX RAIN (Hero section) ==========
    let matrixAnimId;
    const matrixSetup = () => {
      const canvas = container.querySelector('#matrixCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const fontSize = 12;
      const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789PHANTOM'.split('');

      let columns, drops, speeds;
      const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        columns = Math.floor(canvas.width / fontSize);
        const oldDrops = drops || [];
        const oldSpeeds = speeds || [];
        drops = Array.from({ length: columns }, (_, i) =>
          i < oldDrops.length ? oldDrops[i] : Math.random() * -(canvas.height / fontSize)
        );
        speeds = Array.from({ length: columns }, (_, i) =>
          i < oldSpeeds.length ? oldSpeeds[i] : 0.3 + Math.random() * 0.7
        );
      };
      resize();
      window.addEventListener('resize', resize);

      // Use setInterval at ~30fps for consistent speed
      const draw = () => {
        // Very slow fade — long trails
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // White-green bright head
          ctx.fillStyle = '#AAFFAA';
          ctx.globalAlpha = 1;
          ctx.fillText(char, x, y);

          // Bright green body
          ctx.fillStyle = '#00FF41';
          ctx.globalAlpha = 0.8;
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);

          // Mid trail
          ctx.fillStyle = '#00CC33';
          ctx.globalAlpha = 0.5;
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize * 2);

          ctx.globalAlpha = 1;

          if (y > canvas.height && Math.random() > 0.98) {
            drops[i] = 0;
            speeds[i] = 0.3 + Math.random() * 0.7;
          }
          drops[i] += speeds[i];
        }
      };
      const intervalId = setInterval(draw, 33);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('resize', resize);
      };
    };
    const cleanupMatrix = matrixSetup();

    // ========== PARTICLE NETWORK (Bitcoin section) ==========
    let particleAnimId;
    const particleSetup = () => {
      const canvas = container.querySelector('#particle-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let w, h, particles = [];
      const count = 50;

      function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
      }

      class Particle {
        constructor() {
          this.x = Math.random() * w;
          this.y = Math.random() * h;
          this.vx = (Math.random() - 0.5) * 0.8;
          this.vy = (Math.random() - 0.5) * 0.8;
          this.r = Math.random() * 2 + 1;
          this.pulse = Math.random() * Math.PI * 2;
        }
        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.pulse += 0.02;
          if (this.x < 0 || this.x > w) this.vx *= -1;
          if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
          const alpha = 0.3 + Math.sin(this.pulse) * 0.2;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 65, ' + alpha + ')';
          ctx.fill();
        }
      }

      function init() {
        particles = [];
        for (let i = 0; i < count; i++) particles.push(new Particle());
      }

      function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = 'rgba(0, 255, 65, ' + (0.15 * (1 - dist / 150)) + ')';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        particleAnimId = requestAnimationFrame(animate);
      }

      resize();
      const resizeHandler = () => { resize(); init(); };
      window.addEventListener('resize', resizeHandler);
      init();
      animate();

      return resizeHandler;
    };
    const particleResizeHandler = particleSetup();

    // ========== TYPING EFFECT ==========
    const typingSetup = () => {
      const text = 'Private by architecture. Not by promise.';
      const el = container.querySelector('#heroTagline');
      if (!el) return;
      let i = 0;
      let timeoutId;

      function type() {
        if (i <= text.length) {
          el.innerHTML = text.substring(0, i) + '<span class="typed-cursor"></span>';
          i++;
          timeoutId = setTimeout(type, 60 + Math.random() * 40);
        }
      }

      timeoutId = setTimeout(type, 1500);
      return () => clearTimeout(timeoutId);
    };
    const cleanupTyping = typingSetup();

    // ========== TERMINAL TYPING ==========
    const terminalSetup = () => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const lines = entry.target.querySelectorAll('.line');
            lines.forEach((line, i) => {
              setTimeout(() => line.classList.add('visible'), i * 300);
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      const terminal = container.querySelector('#terminalBody');
      if (terminal) observer.observe(terminal);
      return observer;
    };
    const terminalObserver = terminalSetup();

    // ========== SCROLL REVEAL ==========
    const revealSetup = () => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      container.querySelectorAll('.reveal, .feature-card, .security-card, .step').forEach(el => observer.observe(el));
      return observer;
    };
    const revealObserver = revealSetup();

    // ========== MOBILE NAV ==========
    const navToggle = container.querySelector('#navToggle');
    const navLinks = container.querySelector('#navLinks');
    const toggleHandler = () => navLinks && navLinks.classList.toggle('open');
    if (navToggle) navToggle.addEventListener('click', toggleHandler);

    const navLinkEls = container.querySelectorAll('.nav-links a');
    const closeMobileNav = () => navLinks && navLinks.classList.remove('open');
    navLinkEls.forEach(a => a.addEventListener('click', closeMobileNav));

    // ========== FORM ==========
    const waitlistForm = container.querySelector('#waitlistForm');
    const formHandler = (e) => {
      e.preventDefault();
      navigate('/register');
    };
    if (waitlistForm) waitlistForm.addEventListener('submit', formHandler);

    // ========== CLEANUP ==========
    return () => {
      // Remove injected style
      styleEl.remove();
      link1.remove();
      link2.remove();
      link3.remove();

      // Cancel animations
      if (cleanupMatrix) cleanupMatrix();
      if (particleAnimId) cancelAnimationFrame(particleAnimId);
      if (particleResizeHandler) window.removeEventListener('resize', particleResizeHandler);
      if (cleanupTyping) cleanupTyping();
      if (terminalObserver) terminalObserver.disconnect();
      if (revealObserver) revealObserver.disconnect();

      // Remove event listeners
      container.removeEventListener('click', handleClick);
      if (navToggle) navToggle.removeEventListener('click', toggleHandler);
      navLinkEls.forEach(a => a.removeEventListener('click', closeMobileNav));
      if (waitlistForm) waitlistForm.removeEventListener('submit', formHandler);
    };
  }, [navigate]);

  return <div className="landing-page" ref={containerRef} />;
}
