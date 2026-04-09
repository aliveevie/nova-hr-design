import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: Omit<Employee, "id" | "initials">) => void;
  onCancel: () => void;
  /** When creating (no employee), optional defaults e.g. join date / status */
  prefillDefaults?: Partial<Omit<Employee, "id" | "initials">>;
  /** Called when the user focuses a field (not submit) — e.g. clear server-side validation banner */
  onDismissServerErrors?: () => void;
  /** Optional strict email domain, e.g. `galaxyitt.com.ng` */
  emailDomain?: string;
  showCancel?: boolean;
  submitLabel?: string;
  /**
   * `modal` — max height + internal scroll (admin dialogs).
   * `page` — full natural height (e.g. invite link) so nothing is clipped or “missing”.
   */
  scrollMode?: "modal" | "page";
}

const departments = [
  "Finance and Accounting (Financial Control, Treasury, Financial Operations, Credit Control)",
  "Corporate Services (Facility Management, Fleet Management, Physical Security)",
  "Sales and Marketing",
  "Customer Support Services",
  "Research and Development",
  "Technical Operations",
  "Digital Skills Development",
  "Information Security",
];

export const EmployeeForm = ({
  employee,
  onSubmit,
  onCancel,
  prefillDefaults,
  onDismissServerErrors,
  emailDomain,
  showCancel = true,
  submitLabel,
  scrollMode = "modal",
}: EmployeeFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<Omit<Employee, "id" | "initials">>({
    defaultValues: employee ? {
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      language: employee.language,
      ninNumber: employee.ninNumber,
      bvn: employee.bvn,
      dateOfBirth: employee.dateOfBirth,
      gender: employee.gender,
      address: employee.address,
      department: employee.department,
      jobTitle: employee.jobTitle,
      grade: employee.grade,
      level: employee.level,
      status: employee.status,
      joinDate: employee.joinDate,
      salary: employee.salary,
      nextOfKin: employee.nextOfKin,
    } : {
      status: "Active",
      joinDate: new Date().toISOString().split("T")[0],
      ...prefillDefaults,
    },
  });

  const [nextOfKin, setNextOfKin] = useState(employee?.nextOfKin || {
    name: "",
    relationship: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (employee) {
      setValue("name", employee.name);
      setValue("email", employee.email);
      setValue("phone", employee.phone);
      setValue("language", employee.language || "");
      setValue("ninNumber", employee.ninNumber || "");
      setValue("bvn", employee.bvn || "");
      setValue("dateOfBirth", employee.dateOfBirth);
      setValue("gender", employee.gender);
      setValue("address", employee.address);
      setValue("department", employee.department);
      setValue("jobTitle", employee.jobTitle);
      setValue("grade", employee.grade);
      setValue("level", employee.level);
      setValue("status", employee.status);
      setValue("joinDate", employee.joinDate);
      setValue("salary", employee.salary);
    }
  }, [employee, setValue]);

  const onFormSubmit = (data: Omit<Employee, "id" | "initials">) => {
    const salary =
      typeof data.salary === "number" && Number.isFinite(data.salary) ? data.salary : undefined;
    if (salary === undefined) return;
    onSubmit({
      ...data,
      salary,
      nextOfKin: nextOfKin.name ? nextOfKin : undefined,
      documents: employee?.documents || [],
    });
  };

  return (
    <form
      onFocusCapture={(e) => {
        if (!onDismissServerErrors) return;
        const t = e.target as HTMLElement;
        if (t.closest('button[type="submit"]')) return;
        onDismissServerErrors();
      }}
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn(
        "space-y-6",
        scrollMode === "modal" && "max-h-[80vh] overflow-y-auto pr-2",
        scrollMode === "page" && "pb-8"
      )}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                required: "Email is required",
                validate: (v) => {
                  if (!emailDomain) return true;
                  return (
                    String(v || "")
                      .trim()
                      .toLowerCase()
                      .endsWith(`@${emailDomain.toLowerCase()}`) ||
                    `Use your @${emailDomain} work email`
                  );
                },
              })}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" {...register("phone", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input id="language" {...register("language")} placeholder="e.g. English, Hausa" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ninNumber">NIN Number</Label>
            <Input id="ninNumber" {...register("ninNumber")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bvn">BVN</Label>
            <Input id="bvn" {...register("bvn")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) =>
                    field.onChange(value as "Male" | "Female" | "Other")
                  }
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Employment Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Controller
              name="department"
              control={control}
              rules={{ required: "Select a department" }}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.department ? (
              <p className="text-sm text-destructive">{errors.department.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title *</Label>
            <Input id="jobTitle" {...register("jobTitle", { required: true })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Input id="grade" {...register("grade")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Input id="level" {...register("level")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Controller
              name="status"
              control={control}
              rules={{ required: "Select a status" }}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) =>
                    field.onChange(value as "Active" | "On Leave" | "Inactive")
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status ? (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="joinDate">Join Date *</Label>
            <Input id="joinDate" type="date" {...register("joinDate", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">Salary *</Label>
            <Input
              id="salary"
              type="number"
              step="any"
              min={0.01}
              {...register("salary", {
                required: "Salary is required",
                valueAsNumber: true,
                validate: (v) =>
                  (typeof v === "number" && Number.isFinite(v) && v > 0) ||
                  "Enter a valid salary greater than 0",
              })}
            />
            {errors.salary ? (
              <p className="text-sm text-destructive">{errors.salary.message}</p>
            ) : null}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Next of Kin</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nokName">Name</Label>
            <Input
              id="nokName"
              value={nextOfKin.name}
              onChange={(e) => setNextOfKin({ ...nextOfKin, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nokRelationship">Relationship</Label>
            <Input
              id="nokRelationship"
              value={nextOfKin.relationship}
              onChange={(e) => setNextOfKin({ ...nextOfKin, relationship: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nokPhone">Phone</Label>
            <Input
              id="nokPhone"
              value={nextOfKin.phone}
              onChange={(e) => setNextOfKin({ ...nextOfKin, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nokAddress">Address</Label>
            <Input
              id="nokAddress"
              value={nextOfKin.address}
              onChange={(e) => setNextOfKin({ ...nextOfKin, address: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {showCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        ) : null}
        <Button type="submit">
          {submitLabel ?? `${employee ? "Update" : "Add"} Employee`}
        </Button>
      </div>
    </form>
  );
};

