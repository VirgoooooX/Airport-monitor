// Jest setup file to mock problematic ES modules
jest.mock('socks-proxy-agent', () => ({
  SocksProxyAgent: jest.fn().mockImplementation(() => ({}))
}));
