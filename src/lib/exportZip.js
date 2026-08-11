import { ZipWriter, BlobWriter, BlobReader, configure } from "@zip.js/zip.js";

configure({ useWebWorkers: false });

async function exportZip(filename, blob, password) {
  const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
    password,
    encryptionStrength: 3, // AES-256
  });
  await zipWriter.add(filename, new BlobReader(blob));
  return zipWriter.close();
}

export default exportZip;
