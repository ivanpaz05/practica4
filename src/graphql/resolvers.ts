import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { signToken } from "../auth";

const USERS = "users";
const PROJECTS = "projects";
const TASKS = "tasks";

const requireUser = (ctx: any) => {
  const u = ctx?.user;
  if (!u?._id) throw new Error("Not authenticated");
  return u;
};

const toDate = (s: string) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
};

const isOwner = (project: any, userId: string) =>
  project?.owner?.toString() === userId;

const isMemberOrOwner = (project: any, userId: string) =>
  isOwner(project, userId) ||
  (project?.members || []).some((m: any) => m.toString() === userId);

const asOid = (id: any) => (id instanceof ObjectId ? id : new ObjectId(id));

export const resolvers = {
  Project: {
    owner: (p: any) => getDB().collection(USERS).findOne({ _id: asOid(p.owner) }),
    members: async (p: any) => {
      const ids = (p.members || []).map(asOid);
      if (!ids.length) return [];
      return getDB().collection(USERS).find({ _id: { $in: ids } }).toArray();
    },
    tasks: (p: any) =>
      getDB().collection(TASKS).find({ projectId: asOid(p._id) }).toArray(),
    startDate: (p: any) => new Date(p.startDate).toISOString(),
    endDate: (p: any) => new Date(p.endDate).toISOString(),
  },

  Task: {
    assignedTo: (t: any) =>
      t.assignedTo ? getDB().collection(USERS).findOne({ _id: asOid(t.assignedTo) }) : null,
    projectId: (t: any) => t.projectId?.toString?.() ?? String(t.projectId),
    dueDate: (t: any) => (t.dueDate ? new Date(t.dueDate).toISOString() : null),
  },

  Query: {
    users: (_: any, __: any, ctx: any) => {
      requireUser(ctx);
      return getDB().collection(USERS).find().toArray();
    },

    me: async (_: any, __: any, ctx: any) => {
      const u = requireUser(ctx);
      return getDB().collection(USERS).findOne({ _id: asOid(u._id) });
    },

    myProjects: (_: any, __: any, ctx: any) => {
      const u = requireUser(ctx);
      const uid = asOid(u._id);
      return getDB()
        .collection(PROJECTS)
        .find({ $or: [{ owner: uid }, { members: uid }] })
        .toArray();
    },

    projectDetails: async (_: any, { projectId }: any, ctx: any) => {
      const u = requireUser(ctx);
      const p = await getDB().collection(PROJECTS).findOne({ _id: asOid(projectId) });
      if (!p) throw new Error("Project not found");
      if (!isMemberOrOwner(p, u._id)) throw new Error("Forbidden");
      return p;
    },
  },

  Mutation: {
    register: async (_: any, { input }: any) => {
      const db = getDB();

      const exists = await db.collection(USERS).findOne({
        $or: [{ username: input.username }, { email: input.email }],
      });
      if (exists) throw new Error("User already exists");

      const hash = await bcrypt.hash(input.password, 10);

      const r = await db.collection(USERS).insertOne({
        username: input.username,
        email: input.email,
        password: hash,
        createdAt: new Date(),
      });

      const user = await db.collection(USERS).findOne({ _id: r.insertedId });
      if (!user) throw new Error("User not found");

      const token = signToken(user);
      return { token, user };
    },

    login: async (_: any, { input }: any) => {
      const db = getDB();

      const user = await db.collection(USERS).findOne({ email: input.email });
      if (!user) throw new Error("Invalid credentials");

      const ok = await bcrypt.compare(input.password, user.password);
      if (!ok) throw new Error("Invalid credentials");

      const token = signToken(user);
      return { token, user };
    },

    createProject: async (_: any, { input }: any, ctx: any) => {
      const u = requireUser(ctx);
      const sd = toDate(input.startDate);
      const ed = toDate(input.endDate);
      if (ed <= sd) throw new Error("endDate must be after startDate");

      const r = await getDB().collection(PROJECTS).insertOne({
        name: input.name,
        description: input.description ?? null,
        startDate: sd,
        endDate: ed,
        owner: asOid(u._id),
        members: [],
      });

      return getDB().collection(PROJECTS).findOne({ _id: r.insertedId });
    },

    updateProject: async (_: any, { id, input }: any, ctx: any) => {
      const u = requireUser(ctx);
      const db = getDB();

      const pid = asOid(id);
      const p = await db.collection(PROJECTS).findOne({ _id: pid });
      if (!p) throw new Error("Project not found");
      if (!isOwner(p, u._id)) throw new Error("Forbidden");

      const patch: any = {};
      if (input?.name !== undefined) patch.name = input.name;
      if (input?.description !== undefined) patch.description = input.description;

      const nextStart = input?.startDate !== undefined ? toDate(input.startDate) : p.startDate;
      const nextEnd = input?.endDate !== undefined ? toDate(input.endDate) : p.endDate;
      if (new Date(nextEnd) <= new Date(nextStart))
        throw new Error("endDate must be after startDate");

      if (input?.startDate !== undefined) patch.startDate = nextStart;
      if (input?.endDate !== undefined) patch.endDate = nextEnd;

      await db.collection(PROJECTS).updateOne({ _id: pid }, { $set: patch });
      return db.collection(PROJECTS).findOne({ _id: pid });
    },

    addMember: async (_: any, { projectId, userId }: any, ctx: any) => {
      const u = requireUser(ctx);
      const db = getDB();

      const pid = asOid(projectId);
      const p = await db.collection(PROJECTS).findOne({ _id: pid });
      if (!p) throw new Error("Project not found");
      if (!isOwner(p, u._id)) throw new Error("Forbidden");

      const uid = asOid(userId);
      const exists = await db.collection(USERS).findOne({ _id: uid });
      if (!exists) throw new Error("User not found");

      await db.collection(PROJECTS).updateOne(
        { _id: pid },
        { $addToSet: { members: uid } }
      );

      return db.collection(PROJECTS).findOne({ _id: pid });
    },

    createTask: async (_: any, { projectId, input }: any, ctx: any) => {
      const u = requireUser(ctx);
      const db = getDB();

      const pid = asOid(projectId);
      const p = await db.collection(PROJECTS).findOne({ _id: pid });
      if (!p) throw new Error("Project not found");
      if (!isMemberOrOwner(p, u._id)) throw new Error("Forbidden");

      const assignedTo = input.assignedTo ? asOid(input.assignedTo) : null;
      if (assignedTo) {
        const ok = await db.collection(USERS).findOne({ _id: assignedTo });
        if (!ok) throw new Error("User not found");
      }

      const dueDate = input.dueDate ? toDate(input.dueDate) : null;

      const r = await db.collection(TASKS).insertOne({
        title: input.title,
        projectId: pid,
        assignedTo,
        status: "PENDING",
        priority: input.priority,
        dueDate,
      });

      return db.collection(TASKS).findOne({ _id: r.insertedId });
    },

    updateTaskStatus: async (_: any, { taskId, status }: any, ctx: any) => {
      const u = requireUser(ctx);
      const db = getDB();

      const tid = asOid(taskId);
      const t = await db.collection(TASKS).findOne({ _id: tid });
      if (!t) throw new Error("Task not found");

      const p = await db.collection(PROJECTS).findOne({ _id: asOid(t.projectId) });
      if (!p) throw new Error("Project not found");
      if (!isMemberOrOwner(p, u._id)) throw new Error("Forbidden");

      await db.collection(TASKS).updateOne({ _id: tid }, { $set: { status } });
      return db.collection(TASKS).findOne({ _id: tid });
    },

    deleteProject: async (_: any, { id }: any, ctx: any) => {
      const u = requireUser(ctx);
      const db = getDB();

      const pid = asOid(id);
      const p = await db.collection(PROJECTS).findOne({ _id: pid });
      if (!p) throw new Error("Project not found");
      if (!isOwner(p, u._id)) throw new Error("Forbidden");

      await db.collection(TASKS).deleteMany({ projectId: pid });
      await db.collection(PROJECTS).deleteOne({ _id: pid });
      return true;
    },
  },
};
