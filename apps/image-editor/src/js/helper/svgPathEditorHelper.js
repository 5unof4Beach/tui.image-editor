export function getSmallestPoint(currentPath) {
  if (!currentPath || !currentPath.path) return null;

  let smallestX = 1000;
  let smallestY = 800;

  // Loop through path commands
  currentPath.path.forEach((cmd) => {
    switch (cmd[0]) {
      case 'M': // Move to
      case 'L': // Line to
        smallestX = Math.min(smallestX, cmd[1]);
        smallestY = Math.min(smallestY, cmd[2]);
        break;
      case 'C': // Cubic bezier
        // Check control points
        smallestX = Math.min(smallestX, cmd[1], cmd[3], cmd[5]);
        smallestY = Math.min(smallestY, cmd[2], cmd[4], cmd[6]);
        break;
      case 'Q': // Quadratic bezier
        smallestX = Math.min(smallestX, cmd[1], cmd[3]);
        smallestY = Math.min(smallestY, cmd[2], cmd[4]);
        break;
      default:
        // Handle other commands if necessary
        break;
    }
  });

  return {
    x: smallestX === Infinity ? 0 : smallestX,
    y: smallestY === Infinity ? 0 : smallestY,
  };
}
