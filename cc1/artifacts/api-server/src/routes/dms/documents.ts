import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, dmsDocumentsTable, dmsProjectsTable, dmsUsersTable } from "@workspace/db";
import {
  DmsListDocumentsQueryParams,
  DmsGetDocumentParams,
  DmsDeleteDocumentParams,
  DmsDownloadDocumentParams,
} from "@workspace/api-zod";
import { requireDmsAuth, requireDmsAdmin } from "../../middlewares/dmsAuth";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function formatDoc(doc: {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  projectId: number;
  uploadedBy: number;
  createdAt: Date;
  projectName?: string | null;
  uploadedByName?: string | null;
}) {
  return {
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    projectId: doc.projectId,
    projectName: doc.projectName ?? null,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName ?? "Unknown",
    createdAt: doc.createdAt.toISOString(),
  };
}

router.get("/dms/documents", requireDmsAuth, async (req, res): Promise<void> => {
  const query = DmsListDocumentsQueryParams.safeParse(req.query);
  const projectId = query.success ? query.data.projectId : undefined;
  const q = query.success ? query.data.q : undefined;

  const conditions = [];
  if (projectId) conditions.push(eq(dmsDocumentsTable.projectId, projectId));
  if (q) conditions.push(or(ilike(dmsDocumentsTable.title, `%${q}%`), ilike(dmsDocumentsTable.fileName, `%${q}%`))!);

  const rows = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${dmsDocumentsTable.createdAt} DESC`);

  res.json(rows.map(formatDoc));
});

router.post("/dms/documents", requireDmsAuth, requireDmsAdmin, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  const title = String(req.body.title ?? "").trim();
  const projectIdRaw = parseInt(String(req.body.projectId), 10);
  if (!title || isNaN(projectIdRaw)) {
    res.status(400).json({ error: "title and projectId are required" });
    return;
  }

  const [project] = await db.select().from(dmsProjectsTable).where(eq(dmsProjectsTable.id, projectIdRaw));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
  const [doc] = await db.insert(dmsDocumentsTable).values({
    title,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    fileType: ext || req.file.mimetype.split("/")[1] || "unknown",
    fileSize: req.file.size,
    projectId: projectIdRaw,
    uploadedBy: req.dmsUser!.userId,
  }).returning();

  const [uploaderRow] = await db.select({ name: dmsUsersTable.name }).from(dmsUsersTable).where(eq(dmsUsersTable.id, req.dmsUser!.userId));

  res.status(201).json(formatDoc({
    ...doc,
    projectName: project.name,
    uploadedByName: uploaderRow?.name ?? "Unknown",
  }));
});

router.get("/dms/documents/:id", requireDmsAuth, async (req, res): Promise<void> => {
  const params = DmsGetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
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
    .where(eq(dmsDocumentsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(formatDoc(row));
});

router.get("/dms/documents/:id/file", requireDmsAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [doc] = await db.select().from(dmsDocumentsTable).where(eq(dmsDocumentsTable.id, id));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const filePath = path.resolve(uploadsDir, doc.filePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
  res.sendFile(filePath);
});

router.get("/dms/documents/:id/download", requireDmsAuth, async (req, res): Promise<void> => {
  const params = DmsDownloadDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db.select().from(dmsDocumentsTable).where(eq(dmsDocumentsTable.id, params.data.id));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json({
    url: `/api/dms/documents/${doc.id}/file`,
    fileName: doc.fileName,
  });
});

router.delete("/dms/documents/:id", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const params = DmsDeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db.delete(dmsDocumentsTable).where(eq(dmsDocumentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const filePath = path.resolve(uploadsDir, doc.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  res.sendStatus(204);
});

export default router;
