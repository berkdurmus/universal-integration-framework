// Jest setup file
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  warn: console.warn,
  error: console.error,
};
