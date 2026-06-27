import { Router, type IRouter } from "express";
import { eq, sql, ilike, or } from "drizzle-orm";
import { db, dmsProjectsTable, dmsDocumentsTable, dmsUsersTable } from "@workspace/db";
import { requireDmsAuth } from "../../middlewares/dmsAuth";

const router: IRouter = Router();

async function formatDocument(doc: {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  projectId: number;
  uploadedBy: number;
  createdAt: Date;
  projectName: string | null;
  uploadedByName: string | null;
}) {
  return {
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    projectId: doc.projectId,
    projectName: doc.projectName,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName ?? "Unknown",
    createdAt: doc.createdAt.toISOString(),
  };
}

router.get("/dms/dashboard", requireDmsAuth, async (_req, res): Promise<void> => {
  const [[{ totalProjects }], [{ totalDocuments }], [{ totalUsers }]] = await Promise.all([
    db.select({ totalProjects: sql<number>`count(*)::int` }).from(dmsProjectsTable),
    db.select({ totalDocuments: sql<number>`count(*)::int` }).from(dmsDocumentsTable),
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(dmsUsersTable),
  ]);

  const recentRaw = await db
    .select({
      id: dmsDocumentsTable.id,
      title: dmsDocumentsTable.title,
      fileName: dmsDocumentsTable.fileName,
      fileType: dmsDocumentsTable.fileType,
      fileSize: dmsDocumentsTable.fileSize,
      projectId: dmsDocumentsTable.projectId,
      uploadedBy: dmsDocumentsTable.uploadedBy,
      createdAt: dmsDocumentsTable.createdAt,
      projectName: dmsProjectsTable.name,
      uploadedByName: dmsUsersTable.name,
    })
    .from(dmsDocumentsTable)
    .leftJoin(dmsProjectsTable, eq(dmsProjectsTable.id, dmsDocumentsTable.projectId))
    .leftJoin(dmsUsersTable, eq(dmsUsersTable.id, dmsDocumentsTable.uploadedBy))
    .orderBy(sql`${dmsDocumentsTable.createdAt} DESC`)
    .limit(8);

  const projectsByTypeRaw = await db
    .select({
      type: dmsProjectsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(dmsProjectsTable)
    .groupBy(dmsProjectsTable.type)
    .orderBy(sql`count(*) DESC`);

  res.json({
    totalProjects: totalProjects ?? 0,
    totalDocuments: totalDocuments ?? 0,
    totalUsers: totalUsers ?? 0,
    recentUploads: await Promise.all(recentRaw.map(formatDocument)),
    projectsByType: projectsByTypeRaw.map((r) => ({ type: r.type, count: r.count })),
  });
});

router.get("/dms/search", requireDmsAuth, async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json({ projects: [], documents: [] });
    return;
  }

  const projectsRaw = await db
    .select({
      id: dmsProjectsTable.id,
      name: dmsProjectsTable.name,
      type: dmsProjectsTable.type,
      description: dmsProjectsTable.description,
      createdAt: dmsProjectsTable.createdAt,
      updatedAt: dmsProjectsTable.updatedAt,
      documentCount: sql<number>`count(${dmsDocumentsTable.id})::int`,
    })
    .from(dmsProjectsTable)
    .leftJoin(dmsDocumentsTable, eq(dmsDocumentsTable.projectId, dmsProjectsTable.id))
    .where(or(ilike(dmsProjectsTable.name, `%${q}%`), ilike(dmsProjectsTable.description, `%${q}%`), ilike(dmsProjectsTable.type, `%${q}%`)))
    .groupBy(dmsProjectsTable.id)
    .limit(10);

  const documentsRaw = await db
    .select({
      id: dmsDocumentsTable.id,
      title: dmsDocumentsTable.title,
      fileName: dmsDocumentsTable.fileName,
      fileType: dmsDocumentsTable.fileType,
      fileSize: dmsDocumentsTable.fileSize,
      projectId: dmsDocumentsTable.projectId,
      uploadedBy: dmsDocumentsTable.uploadedBy,
      createdAt: dmsDocumentsTable.createdAt,
      projectName: dmsProjectsTable.name,
      uploadedByName: dmsUsersTable.name,
    })
    .from(dmsDocumentsTable)
    .leftJoin(dmsProjectsTable, eq(dmsProjectsTable.id, dmsDocumentsTable.projectId))
    .leftJoin(dmsUsersTable, eq(dmsUsersTable.id, dmsDocumentsTable.uploadedBy))
    .where(or(ilike(dmsDocumentsTable.title, `%${q}%`), ilike(dmsDocumentsTable.fileName, `%${q}%`)))
    .limit(10);

  res.json({
    projects: projectsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      documentCount: r.documentCount ?? 0,
    })),
    documents: await Promise.all(documentsRaw.map(formatDocument)),
  });
});

export default router;
