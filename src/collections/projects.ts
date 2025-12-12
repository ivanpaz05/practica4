import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { Project } from "../types/Project";

const COLLECTION_PROJECTS = "Projects";

export const createProject = async (project: Project) => {
  const db = getDB();
  const res = await db.collection<Project>(COLLECTION_PROJECTS).insertOne(project);
  return { ...project, _id: res.insertedId };
};

export const findProjectById = async (id: ObjectId) => {
  const db = getDB();
  return await db.collection<Project>(COLLECTION_PROJECTS).findOne({ _id: id });
};

export const listProjectsForUser = async (userId: ObjectId) => {
  const db = getDB();
  return await db.collection<Project>(COLLECTION_PROJECTS).find({
    $or: [{ owner: userId }, { members: userId }],
  }).toArray();
};

export const updateProject = async (id: ObjectId, update: Partial<Project>) => {
  const db = getDB();
  await db.collection<Project>(COLLECTION_PROJECTS).updateOne(
    { _id: id },
    { $set: update }
  );
  return await findProjectById(id);
};

export const addMember = async (projectId: ObjectId, userId: ObjectId) => {
  const db = getDB();
  await db.collection<Project>(COLLECTION_PROJECTS).updateOne(
    { _id: projectId },
    { $addToSet: { members: userId } }
  );
  return await findProjectById(projectId);
};

export const deleteProject = async (id: ObjectId) => {
  const db = getDB();
  const res = await db.collection<Project>(COLLECTION_PROJECTS).deleteOne({ _id: id });
  return res.deletedCount === 1;
};
