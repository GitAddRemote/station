import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ComingSoon from './ComingSoon';

export default function Fleet() {
  return (
    <ComingSoon
      active="fleet"
      icon={<RocketLaunchIcon />}
      title="Fleet"
      subtitle="Your org's ships and vehicles"
      description="Register, track, and manage every ship and vehicle in your organization — from daily drivers to capital assets."
      features={[
        'Full ship and vehicle registry with loadout tracking',
        'Availability scheduling and deployment logs',
        'Assign ships to contracts and work orders',
        'Insurance and repair cost tracking',
        'Fleet readiness dashboards and status reports',
      ]}
    />
  );
}
