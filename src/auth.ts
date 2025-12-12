import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDB } from "./db/mongo";

const JWT_SECRET = process.env.JWT_SECRET || "mondongo_secret";
const USERS = "users";

export const signToken = (user: { _id?: any }) => {
  const id = user._id?.toString();
  if (!id) throw new Error("Missing user id");
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

export const getUserFromToken = async (token: string) => {
  try {
    const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
    const payload = jwt.verify(raw, JWT_SECRET) as any;
    const id = payload?.id || payload?._id;
    if (!id) return null;
    const db = getDB();
    return await db.collection(USERS).findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
};
