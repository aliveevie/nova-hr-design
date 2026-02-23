import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: Omit<Employee, "id" | "initials">) => void;
  onCancel: () => void;
}

const departments = ["Engineering", "Marketing", "Human Resources", "Finance", "Sales", "Design", "Operations"];

export const EmployeeForm = ({ employee, onSubmit, onCancel }: EmployeeFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Omit<Employee, "id" | "initials">>({
    defaultValues: employee ? {
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
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
    } : undefined,
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

  const onFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      nextOfKin: nextOfKin.name ? nextOfKin : undefined,
      documents: employee?.documents || [],
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email", { required: true })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" {...register("phone", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={watch("gender") || ""}
              onValueChange={(value) => setValue("gender", value as "Male" | "Female" | "Other")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
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
            <Select
              value={watch("department") || ""}
              onValueChange={(value) => setValue("department", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={watch("status") || ""}
              onValueChange={(value) => setValue("status", value as "Active" | "On Leave" | "Inactive")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="joinDate">Join Date *</Label>
            <Input id="joinDate" type="date" {...register("joinDate", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">Salary *</Label>
            <Input id="salary" type="number" {...register("salary", { required: true, valueAsNumber: true })} />
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
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{employee ? "Update" : "Add"} Employee</Button>
      </div>
    </form>
  );
};

