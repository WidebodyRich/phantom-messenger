export default function PhantomLogo({ size = 36, className = '' }) {
  return (
    <img
      src="/phantom-logo.png"
      alt="Phantom"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
