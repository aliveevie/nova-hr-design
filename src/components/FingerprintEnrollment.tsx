import { FingerprintEnrollmentWizard } from "@/components/FingerprintEnrollmentWizard";

type Props = {
  employeeId: string;
  employeeName: string;
};

export const FingerprintEnrollment = ({ employeeId, employeeName }: Props) => {
  return (
    <FingerprintEnrollmentWizard
      variant="inline"
      employeeId={employeeId}
      employeeName={employeeName}
      title={`Fingerprints — ${employeeName}`}
    />
  );
};
