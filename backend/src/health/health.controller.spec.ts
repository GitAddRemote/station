import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(() => {
    healthController = new HealthController();
  });

  it('should return an ok status with an ISO timestamp', () => {
    const response = healthController.getHealth();

    expect(response.status).toBe('ok');
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
