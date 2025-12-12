import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { Task, TaskStatus } from "../types/Task";

const COLLECTION_TASKS = "Tasks";

export const createTask = async (task: Task) => {
  const db = getDB();
  const res = await db.collection<Task>(COLLECTION_TASKS).insertOne(task);
  return { ...task, _id: res.insertedId };
};

export const findTaskById = async (id: ObjectId) => {
  const db = getDB();
  return await db.collection<Task>(COLLECTION_TASKS).findOne({ _id: id });
};

export const listTasksByProject = async (projectId: ObjectId) => {
  const db = getDB();
  return await db.collection<Task>(COLLECTION_TASKS).find({ projectId }).toArray();
};

export const setTaskStatus = async (taskId: ObjectId, status: TaskStatus) => {
  const db = getDB();
  await db.collection<Task>(COLLECTION_TASKS).updateOne(
    { _id: taskId },
    { $set: { status } }
  );
  return await findTaskById(taskId);
};

export const deleteTasksByProject = async (projectId: ObjectId) => {
  const db = getDB();
  await db.collection<Task>(COLLECTION_TASKS).deleteMany({ projectId });
};
