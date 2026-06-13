import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ComingSoon from './ComingSoon';

export default function Treasury() {
  return (
    <ComingSoon
      active="treasury"
      icon={<AccountBalanceIcon />}
      title="Treasury"
      subtitle="Org finances and aUEC management"
      description="Track income, expenses, payouts, and the financial health of your organization across all activities."
      features={[
        'Org wallet and aUEC balance tracking',
        'Contract payout distribution to members',
        'Expense logging for repairs, fuel, and supplies',
        'Income reports by activity type and time period',
        'Budget planning and financial forecasting',
      ]}
    />
  );
}
