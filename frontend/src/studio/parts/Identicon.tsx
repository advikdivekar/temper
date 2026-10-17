// studio/parts/Identicon.tsx
// A small picture generated from a hash, so a long string of letters
// becomes something the eye can recognise. Same hash, same picture,
// always. Change one letter of the hash and the picture changes.
//
// How: take the first 15 hex digits, turn each into on or off, and
// lay them out as the left half and centre of a 5 by 5 grid, then
// mirror to the right. Mirroring makes the pattern look deliberate.

export function Identicon({ hash, size = 44, color = "#ff5a1f" }: { hash: string; size?: number; color?: string }) {
  const cells: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    const left: boolean[] = [];
    for (let col = 0; col < 3; col++) {
      const digit = parseInt(hash[(row * 3 + col) % hash.length] || "0", 16);
      left.push(digit % 2 === 0 || digit > 11);
    }
    cells.push([left[0], left[1], left[2], left[1], left[0]]);
  }
  const unit = size / 5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Fingerprint picture" className="identicon">
      <rect width={size} height={size} fill="#0e1114" />
      {cells.map((row, y) => row.map((on, x) => on && <rect key={`${x}${y}`} x={x * unit + 1} y={y * unit + 1} width={unit - 2} height={unit - 2} fill={color} opacity={0.35 + ((parseInt(hash[(x + y * 5 + 3) % hash.length] || "0", 16)) % 5) * 0.16} />))}
    </svg>
  );
}
