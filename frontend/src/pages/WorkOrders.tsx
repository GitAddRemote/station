import ConstructionIcon from '@mui/icons-material/Construction';
import ComingSoon from './ComingSoon';

export default function WorkOrders() {
  return (
    <ComingSoon
      active="workorders"
      icon={<ConstructionIcon />}
      title="Work Orders"
      subtitle="Task and job management for your org"
      description="Create, assign, and track maintenance, construction, and operational tasks across your fleet and facilities."
      features={[
        'Create and assign work orders to members',
        'Track progress through configurable stages',
        'Link work orders to fleet assets and inventory',
        'Priority queues and deadline tracking',
        'Integration with contracts and treasury payouts',
      ]}
    />
  );
}
