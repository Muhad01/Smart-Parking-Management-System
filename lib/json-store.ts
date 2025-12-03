import fs from "fs"
import path from "path"

const dataDir = path.join(process.cwd(), "data")

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  ensureDataDir()
  const filePath = path.join(dataDir, fileName)

  try {
    const raw = await fs.promises.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // File does not exist yet; return fallback
      return fallback
    }
    throw err
  }
}

export async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  ensureDataDir()
  const filePath = path.join(dataDir, fileName)
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}







