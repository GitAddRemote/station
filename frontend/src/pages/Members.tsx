import GroupsIcon from '@mui/icons-material/Groups';
import ComingSoon from './ComingSoon';

export default function Members() {
  return (
    <ComingSoon
      active="members"
      icon={<GroupsIcon />}
      title="Members"
      subtitle="Your organization's roster"
      description="View and manage every member of your organization — roles, activity, contributions, and standing."
      features={[
        'Full member roster with role and rank management',
        'Activity tracking and contribution history',
        'Recruitment pipeline and application review',
        'Reputation and standing scores',
        'Division and squad assignment',
      ]}
    />
  );
}
