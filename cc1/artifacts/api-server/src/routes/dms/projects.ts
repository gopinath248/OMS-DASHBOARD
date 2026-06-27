import { Router, type IRouter } from "express";
import { eq, sql, ilike } from "drizzle-orm";
import { db, dmsProjectsTable, dmsDocumentsTable, dmsUsersTable } from "@workspace/db";
import {
  DmsCreateProjectBody,
  DmsUpdateProjectBody,
  DmsUpdateProjectParams,
  DmsDeleteProjectParams,
  DmsGetProjectParams,
  DmsListProjectsQueryParams,
} from "@workspace/api-zod";
import { requireDmsAuth, requireDmsAdmin } from "../../middlewares/dmsAuth";

const router: IRouter = Router();

async function getProjectsWithStats(q?: string) {
  const rows = await db
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
    .where(q ? ilike(dmsProjectsTable.name, `%${q}%`) : undefined)
    .groupBy(dmsProjectsTable.id)
    .orderBy(dmsProjectsTable.createdAt);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    documentCount: r.documentCount ?? 0,
  }));
}

router.get("/dms/projects", requireDmsAuth, async (req, res): Promise<void> => {
  const query = DmsListProjectsQueryParams.safeParse(req.query);
  const q = query.success ? query.data.q : undefined;
  const projects = await getProjectsWithStats(q);
  res.json(projects);
});

router.post("/dms/projects", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const parsed = DmsCreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(dmsProjectsTable).values({
    ...parsed.data,
    createdBy: req.dmsUser!.userId,
  }).returning();

  res.status(201).json({
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.get("/dms/projects/:id", requireDmsAuth, async (req, res): Promise<void> => {
  const params = DmsGetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(dmsProjectsTable).where(eq(dmsProjectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const rawDocs = await db
    .select({
      id: dmsDocumentsTable.id,
      title: dmsDocumentsTable.title,
      fileName: dmsDocumentsTable.fileName,
      fileType: dmsDocumentsTable.fileType,
      fileSize: dmsDocumentsTable.fileSize,
      projectId: dmsDocumentsTable.projectId,
      uploadedBy: dmsDocumentsTable.uploadedBy,
      createdAt: dmsDocumentsTable.createdAt,
      uploadedByName: dmsUsersTable.name,
    })
    .from(dmsDocumentsTable)
    .leftJoin(dmsUsersTable, eq(dmsUsersTable.id, dmsDocumentsTable.uploadedBy))
    .where(eq(dmsDocumentsTable.projectId, project.id))
    .orderBy(dmsDocumentsTable.createdAt);

  res.json({
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    documents: rawDocs.map((d) => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      projectId: d.projectId,
      projectName: project.name,
      uploadedBy: d.uploadedBy,
      uploadedByName: d.uploadedByName ?? "Unknown",
      createdAt: d.createdAt.toISOString(),
    })),
  });
});

router.patch("/dms/projects/:id", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const params = DmsUpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = DmsUpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.update(dmsProjectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(dmsProjectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.delete("/dms/projects/:id", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const params = DmsDeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.delete(dmsProjectsTable).where(eq(dmsProjectsTable.id, params.data.id)).returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
