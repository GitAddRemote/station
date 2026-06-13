import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ComingSoon from './ComingSoon';

export default function Refinery() {
  return (
    <ComingSoon
      active="refinery"
      icon={<PrecisionManufacturingIcon />}
      title="Refinery"
      subtitle="Raw material processing and yield tracking"
      description="Submit refinery jobs, track processing queues, and monitor yield efficiency across all your mining and salvage operations."
      features={[
        'Refinery job submission and queue tracking',
        'Multi-location refinery management',
        'Yield efficiency reports and method comparisons',
        'Link raw materials from inventory to refinery jobs',
        'Profit-per-SCU analysis across ore types',
      ]}
    />
  );
}
