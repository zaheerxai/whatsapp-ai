function humanDelay(minMs = 800, maxMs = 2200) {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { humanDelay };
