beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  // Silence console.error during tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
}); 
