'use client';

export default function BattleAnimationStyles() {
  return (
    <style jsx global>{`
      @keyframes damageFloat {
        0% { opacity: 1; transform: translate(-50%, 0) scale(0.5); }
        15% { opacity: 1; transform: translate(-50%, -8px) scale(1.4); }
        30% { opacity: 1; transform: translate(-50%, -16px) scale(1.1); }
        100% { opacity: 0; transform: translate(-50%, -50px) scale(0.8); }
      }
      @keyframes skillPopup {
        0% { opacity: 0; transform: translate(-50%, 10px) scale(0.5); }
        15% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
      }
      @keyframes skillBannerAnim {
        0% { opacity: 0; transform: scale(0.5); }
        15% { opacity: 1; transform: scale(1.08); }
        30% { opacity: 1; transform: scale(1); }
        80% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.9) translateY(-10px); }
      }
      @keyframes fieldEventBanner {
        0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
        10% { opacity: 1; transform: translateY(0) scale(1.05); }
        20% { transform: translateY(0) scale(1); }
        80% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
      }
      @keyframes synergyPulse {
        0% { opacity: 0; transform: scale(0.5); }
        30% { opacity: 1; transform: scale(1.1); }
        70% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.8); }
      }
      @keyframes ultimateFlash {
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes ultimateText {
        0% { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
        20% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); }
        40% { transform: translate(-50%,-50%) scale(1); }
        80% { opacity: 1; }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(1.2); }
      }
      @keyframes streakBounce {
        0% { transform: translateY(100px); opacity: 0; }
        40% { transform: translateY(-10px); opacity: 1; }
        60% { transform: translateY(5px); }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes attackLunge {
        0% { transform: translateY(0); }
        40% { transform: translateY(-14px) scale(1.08); }
        100% { transform: translateY(0) scale(1); }
      }
      @keyframes attackLungeDown {
        0% { transform: translateY(0); }
        40% { transform: translateY(14px) scale(1.08); }
        100% { transform: translateY(0) scale(1); }
      }
      @keyframes hitShake {
        0% { transform: translate(0, 0); }
        15% { transform: translate(-5px, -2px); }
        30% { transform: translate(5px, 2px); }
        45% { transform: translate(-4px, 3px); }
        60% { transform: translate(4px, -2px); }
        75% { transform: translate(-2px, 1px); }
        100% { transform: translate(0, 0); }
      }
      @keyframes deathFade {
        0% { transform: scale(1); filter: brightness(1) grayscale(0); }
        50% { transform: scale(0.95); filter: brightness(1.5) grayscale(0.5); }
        100% { transform: scale(1); filter: brightness(0.6) grayscale(1); opacity: 0.4; }
      }
      @keyframes slashTravel {
        0% { clip-path: inset(0 100% 0 0); opacity: 0.3; }
        30% { clip-path: inset(0 40% 0 0); opacity: 1; }
        70% { clip-path: inset(0 0 0 30%); opacity: 1; }
        100% { clip-path: inset(0 0 0 100%); opacity: 0; }
      }
      @keyframes turnAnnounce {
        0% { opacity: 0; transform: scale(0.5) rotate(-5deg); }
        20% { opacity: 1; transform: scale(1.15) rotate(0deg); }
        40% { transform: scale(1) rotate(0deg); }
        80% { opacity: 1; transform: scale(1) rotate(0deg); }
        100% { opacity: 0; transform: scale(0.9) rotate(2deg); }
      }
      @keyframes tacticCardReveal {
        0% { opacity: 0; transform: translateY(30px) scale(0.7) rotateX(15deg); }
        30% { opacity: 1; transform: translateY(-5px) scale(1.05) rotateX(0deg); }
        70% { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
        100% { opacity: 0; transform: translateY(-15px) scale(0.95) rotateX(-5deg); }
      }
      @keyframes liveLogIn {
        0% { opacity: 0; transform: translateX(20px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      @keyframes liveLogOut {
        0% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-10px); }
      }
      @keyframes battleBtnPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(245,158,11,0.3), 0 4px 15px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 0 30px rgba(220,38,38,0.7), 0 0 60px rgba(245,158,11,0.5), 0 4px 20px rgba(0,0,0,0.4); }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes tacticActivate {
        0% { transform: scale(1); filter: brightness(1); }
        30% { transform: scale(1.15) translateY(-8px); filter: brightness(1.8); }
        60% { transform: scale(1.1) translateY(-12px); filter: brightness(2); }
        100% { transform: scale(1.08) translateY(-10px); filter: brightness(1.6); }
      }
      @keyframes tacticFadeOut {
        0% { opacity: 1; transform: scale(1.08) translateY(-10px); filter: brightness(1.6); }
        30% { opacity: 0.8; transform: scale(1.15) translateY(-20px); filter: brightness(2); }
        60% { opacity: 0.4; transform: scale(0.6) translateY(-30px); filter: brightness(2.5) blur(2px); }
        100% { opacity: 0; transform: scale(0) translateY(-40px); filter: brightness(3) blur(4px); }
      }
      @keyframes tacticGlowPulse {
        0% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      @keyframes tacticParticleBurst {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        40% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--tx, 20px), var(--ty, -20px)) scale(0); }
      }
    `}</style>
  );
}
