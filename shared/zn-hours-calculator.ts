export function calculateShiftHours(eventType: string): number {
  const timePattern = /(\d{1,2})-(\d{1,2})/;
  const match = eventType.match(timePattern);

  if (!match) {
    return 0;
  }

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);

  if (isNaN(start) || isNaN(end)) {
    return 0;
  }

  if (end < start) {
    // Overnight shift
    return (24 - start) + end;
  } else {
    return end - start;
  }
}
