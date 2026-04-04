import { DefaultConfigurationManager } from '../../src/config/configuration-manager.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigurationManager Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-integration-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should load and validate example configuration', async () => {
    const configManager = new DefaultConfigurationManager();
    
    // Create a test config similar to example-config.json
    const testConfig = {
      airports: [
        {
          id: 'airport_example_1',
          name: 'Example Airport 1',
          subscriptionUrl: 'https://example.com/subscription',
          nodes: [
            {
              id: 'node_1',
              airportId: 'airport_example_1',
              name: 'Example Node 1',
              protocol: 'vmess',
              address: 'example.com',
              port: 443,
              config: {
                id: 'uuid-here',
                alterId: 0,
                security: 'auto',
                network: 'tcp'
              }
            }
          ],
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      checkInterval: 300,
      checkTimeout: 30,
      logLevel: 'info',
      storagePath: path.join(tempDir, 'monitor.db')
    };

    const configPath = path.join(tempDir, 'test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    const config = await configManager.loadConfig(configPath);

    expect(config.airports).toHaveLength(1);
    expect(config.airports[0].name).toBe('Example Airport 1');
    expect(config.airports[0].nodes).toHaveLength(1);
    expect(config.checkInterval).toBe(300);
    expect(config.checkTimeout).toBe(30);
    expect(config.logLevel).toBe('info');
  });

  it('should persist airports to database', async () => {
    const configManager = new DefaultConfigurationManager();
    
    const testConfig = {
      airports: [
        {
          id: 'airport1',
          name: 'Test Airport',
          nodes: [],
          createdAt: new Date().toISOString()
        }
      ],
      checkInterval: 60,
      checkTimeout: 30,
      logLevel: 'info',
      storagePath: path.join(tempDir, 'test.db')
    };

    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(testConfig));

    await configManager.loadConfig(configPath);

    // Verify database file was created
    expect(fs.existsSync(path.join(tempDir, 'test.db'))).toBe(true);

    // Verify airports can be retrieved
    const airports = configManager.getAirports();
    expect(airports).toHaveLength(1);
    expect(airports[0].name).toBe('Test Airport');
  });
});
