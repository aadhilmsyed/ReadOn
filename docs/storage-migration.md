# Storage Bucket Migration (Hardening)

## Why this change

The original bucket name produced by the first deployment was incorrect:

- Old: `readon-readon-<project-id>-us-central1`

This pass fixes naming by moving to:

- New: `readon-<project-id>-assets` (e.g., `readon-492106-assets`)

The **test** stack uses a separate bucket: `readon-<project-id>-assets-test` (see [environment-separation.md](environment-separation.md)).

## Migration performed (runtime-safe)

1. Create new bucket:
   - `readon-492106-assets`
   - location `us-central1`
   - uniform bucket-level access
2. Copy existing objects:
   - `gsutil -m rsync -r gs://<old> gs://<new>`
3. Update Cloud Run environment:
   - `READON_STORAGE_BUCKET=<new-bucket>`
4. IAM tightening:
   - grant each service account `roles/storage.objectViewer` on the new bucket
   - remove broad `roles/storage.objectAdmin` grants from the old bucket

## Old bucket

The old bucket is **deprecated** and left in place.

Optional safe delete command (run only when you are sure it’s unused):

```bash
gcloud storage buckets delete gs://readon-readon-492106-us-central1
```

