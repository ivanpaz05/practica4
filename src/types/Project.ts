import { ObjectId } from "mongodb";

export interface Project {
  _id?: ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  owner: ObjectId;
  members: ObjectId[];
}
