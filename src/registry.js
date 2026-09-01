/* Pure asset-type classifier — no `three` import, Node-testable.
   Branch order copied verbatim from index.html render() solids loop
   (index.html:2794-2811): first match wins. */
export function typeOf(item) {
  if (!item) return 'box';
  if (item.boat) return 'boat';
  if (item.gate) return 'gate';
  if (item.log) return 'log';
  if (item.pad) return 'pad';
  if (item.belt) return 'belt';
  if (item.slowMo) return 'slowMo';
  if (item.crumb || item.banana) return 'banana';
  if (item.wall) return 'wall';
  if (item.tramp) return 'tramp';
  if (item.type === 'disc') return 'disc';
  return 'box';
}
