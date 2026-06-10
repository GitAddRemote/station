import { ReactNode } from 'react';

interface StubPortletProps {
  icon: ReactNode;
  label: string;
}

function StubPortlet({ icon, label }: StubPortletProps) {
  return (
    <div className="pstub">
      {icon}
      <span className="pstub-label">{label} coming soon</span>
    </div>
  );
}

export default StubPortlet;
