import { ObjectId } from "mongodb";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  _id?: ObjectId;
  title: string;
  projectId: ObjectId;
  assignedTo?: ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
}
