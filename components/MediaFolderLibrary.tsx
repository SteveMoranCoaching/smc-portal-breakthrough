"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MediaThumbnail from "@/components/MediaThumbnail"

type MediaFolder = {
  id: string
  name: string
  parent_id: string | null
}

type ApprovedMedia = {
  id: string
  folder_id: string | null
  original_filename: string
  display_name: string | null
  media_type: "image" | "video"
  athlete_name: string | null
  event_name: string | null
  file_size_bytes: number
}

type Props = {
  folders: MediaFolder[]
  files: ApprovedMedia[]
  folderCounts: { folder_id: string | null; file_count: number }[]
}

type PreviewData = {
  fileId: string
  filename: string
  mediaType: "image" | "video"
  mimeType: string
  url: string
  expiresIn: number
}

export default function MediaFolderLibrary({
  folders,
  files,
  folderCounts,
}: Props) {
  const router = useRouter()

  const [selectedFolderId, setSelectedFolderId] =
    useState<string | null>(null)

  const [showCreateFolder, setShowCreateFolder] =
    useState(false)

  const [newFolderName, setNewFolderName] =
    useState("")

  const [creatingFolder, setCreatingFolder] =
    useState(false)

  const [folderError, setFolderError] =
    useState<string | null>(null)

    const [renamingFolderId, setRenamingFolderId] =
  useState<string | null>(null)

const [renameFolderName, setRenameFolderName] =
  useState("")

const [renameError, setRenameError] =
  useState<string | null>(null)

const [savingRename, setSavingRename] =
  useState(false)

  const [preview, setPreview] =
    useState<PreviewData | null>(null)

  const [previewLoadingId, setPreviewLoadingId] =
    useState<string | null>(null)

  const [previewError, setPreviewError] =
    useState<string | null>(null)  

  const [downloadLoading, setDownloadLoading] =
    useState(false)  

    const [showMoveMedia, setShowMoveMedia] =
  useState(false)

const [moveFolderId, setMoveFolderId] =
  useState<string>("unsorted")

const [movingMedia, setMovingMedia] =
  useState(false)

const [moveError, setMoveError] =
  useState<string | null>(null)

  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId
  )

  const countsByFolder = new Map(
    folderCounts.map((item) => [item.folder_id, Number(item.file_count)])
  )
  const unsortedCount = countsByFolder.get(null) ?? 0

  const rootFolders = folders.filter(
    (folder) => folder.parent_id === null
  )

  const [visibleFiles, setVisibleFiles] = useState<ApprovedMedia[]>([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [nextPage, setNextPage] = useState(0)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // A folder selection always starts a fresh, server-paginated gallery.
  useEffect(() => {
    if (selectedFolderId === null) return

    const controller = new AbortController()
    let active = true

    async function loadFirstPage() {
      setVisibleFiles([])
      setTotalFiles(0)
      setNextPage(0)
      setGalleryError(null)
      setLoadingFiles(true)

      try {
        const response = await fetch("/api/coach/media/folder-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId: selectedFolderId === "unsorted" ? null : selectedFolderId,
            page: 0,
          }),
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || "Unable to load folder media.")
        }
        if (!active) return
        setVisibleFiles(result.files as ApprovedMedia[])
        setTotalFiles(result.total)
        setNextPage(1)
      } catch (error) {
        if (!active) return
        setGalleryError(
          error instanceof Error ? error.message : "Unable to load folder media."
        )
      } finally {
        if (active) setLoadingFiles(false)
      }
    }

    void loadFirstPage()
    return () => {
      active = false
      controller.abort()
    }
  }, [selectedFolderId, reloadKey])

  async function loadMore() {
    if (loadingMore || loadingFiles || visibleFiles.length >= totalFiles) return
    setLoadingMore(true)
    setGalleryError(null)

    try {
      const response = await fetch("/api/coach/media/folder-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedFolderId === "unsorted" ? null : selectedFolderId,
          page: nextPage,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Unable to load more media.")
      }
      if (result.page !== nextPage) {
        throw new Error("Unexpected gallery page returned.")
      }
      setVisibleFiles((previous) => {
        const seen = new Set(previous.map((file) => file.id))
        return [...previous, ...(result.files as ApprovedMedia[]).filter((file) => !seen.has(file.id))]
      })
      setTotalFiles(result.total)
      setNextPage((page) => page + 1)
    } catch (error) {
      setGalleryError(
        error instanceof Error ? error.message : "Unable to load more media."
      )
    } finally {
      setLoadingMore(false)
    }
  }


  async function createFolder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (creatingFolder) return

    setFolderError(null)

    const name = newFolderName.trim()

    if (!name || name.length > 100) {
      setFolderError(
        "Enter a folder name between 1 and 100 characters."
      )
      return
    }

    setCreatingFolder(true)

    try {
      const response = await fetch(
        "/api/coach/media/folders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to create folder."
        )
      }

      setShowCreateFolder(false)
      setNewFolderName("")
      setSelectedFolderId(null)

      router.refresh()
    } catch (error) {
      setFolderError(
        error instanceof Error
          ? error.message
          : "Unable to create folder."
      )
    } finally {
      setCreatingFolder(false)
    }
  }


async function renameFolder(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()

  if (!renamingFolderId || savingRename) return

  const name = renameFolderName.trim()

  if (!name || name.length > 100) {
    setRenameError(
      "Enter a folder name between 1 and 100 characters."
    )
    return
  }

  setSavingRename(true)
  setRenameError(null)

  try {
    const response = await fetch(
      "/api/coach/media/folders/rename",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: renamingFolderId,
          name,
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result.error || "Unable to rename folder."
      )
    }

    setRenamingFolderId(null)
    setRenameFolderName("")
    router.refresh()
  } catch (error) {
    setRenameError(
      error instanceof Error
        ? error.message
        : "Unable to rename folder."
    )
  } finally {
    setSavingRename(false)
  }
}


async function moveMedia(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()

  if (!preview || movingMedia) return

  setMovingMedia(true)
  setMoveError(null)

  try {
    const response = await fetch(
      "/api/coach/media/move",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: preview.fileId,
          folderId:
            moveFolderId === "unsorted"
              ? null
              : moveFolderId,
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result.error || "Unable to move media."
      )
    }

    setShowMoveMedia(false)
    setPreview(null)
    setSelectedFolderId(null)
    setReloadKey((key) => key + 1)
    router.refresh()
  } catch (error) {
    setMoveError(
      error instanceof Error
        ? error.message
        : "Unable to move media."
    )
  } finally {
    setMovingMedia(false)
  }
}


  async function openPreview(fileId: string) {
    setPreviewError(null)
    setPreviewLoadingId(fileId)

    try {
      const response = await fetch(
        "/api/coach/media/preview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load media preview."
        )
      }

      setPreview(result as PreviewData)
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to load media preview."
      )
    } finally {
      setPreviewLoadingId(null)
    }
  }

  async function downloadOriginal() {
    if (!preview || downloadLoading) return

    setDownloadLoading(true)
    setPreviewError(null)

    try {
      const response = await fetch(
        "/api/coach/media/download",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: preview.fileId,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to prepare download."
        )
      }

      if (typeof result.url !== "string") {
        throw new Error("Invalid download URL.")
      }

      const link = document.createElement("a")
      link.href = result.url
      link.download = result.filename || preview.filename
      link.rel = "noopener noreferrer"

      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to download media."
      )
    } finally {
      setDownloadLoading(false)
    }
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-smc-gold">
            Approved Media
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Collections & Folders
          </h2>

          <p className="mt-1 text-xs text-white/40">
            Browse your approved competition footage and photos.
          </p>
        </div>

        
        <div className="flex flex-wrap items-center gap-2">
          {selectedFolderId !== null && (
            <button
              type="button"
              onClick={() => {
                if (loadingMore) return
                setSelectedFolderId(null)
                setPreviewError(null)
              }}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-black text-white transition hover:border-smc-gold/40"
            >
              ← All Folders
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFolderError(null)
              setNewFolderName("")
              setShowCreateFolder(true)
            }}
            className="rounded-xl bg-smc-gold px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110"
          >
            + New Folder
          </button>
        </div>

      </div>

      {previewError && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {previewError}
        </div>
      )}

      {selectedFolderId === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          
{rootFolders.map((folder) => {
  return (
    <div
      key={folder.id}
      className="group relative rounded-2xl border border-smc-gold/20 bg-smc-gold/[0.035] transition hover:border-smc-gold/60 hover:bg-smc-gold/[0.07]"
    >
      <button
        type="button"
        onClick={() => { if (!loadingMore) setSelectedFolderId(folder.id) }}
        className="block w-full p-5 text-left"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-smc-gold/20 bg-smc-gold/10 text-2xl">
          📁
        </div>

        <h3 className="truncate pr-10 text-base font-black text-white transition group-hover:text-smc-gold">
          {folder.name}
        </h3>

        <p className="mt-2 text-xs text-white/40">
          {countsByFolder.get(folder.id) ?? 0} approved {
            (countsByFolder.get(folder.id) ?? 0) === 1 ? "file" : "files"
          }
        </p>
      </button>

      <button
        type="button"
        title={`Rename ${folder.name}`}
        aria-label={`Rename ${folder.name}`}
        onClick={() => {
          setRenamingFolderId(folder.id)
          setRenameFolderName(folder.name)
          setRenameError(null)
        }}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white/60 transition hover:border-smc-gold/50 hover:text-smc-gold"
      >
        ✎
      </button>
    </div>
  )
})}


          {unsortedCount > 0 && (
            <button
              type="button"
              onClick={() => { if (!loadingMore) setSelectedFolderId("unsorted") }}
              className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-left transition hover:border-white/35"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl">
                📂
              </div>

              <h3 className="text-base font-black text-white">
                Unsorted
              </h3>

              <p className="mt-2 text-xs text-white/40">
                {unsortedCount} approved {unsortedCount === 1 ? "file" : "files"}
              </p>
            </button>
          )}

          {rootFolders.length === 0 &&
            unsortedCount === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-sm font-bold text-white/60">
                  No approved media folders yet.
                </p>

                <p className="mt-2 text-xs text-white/35">
                  Approve an upload to create its event folder
                  automatically.
                </p>
              </div>
            )}
        </div>
      ) : (
        <div>
          <h3 className="mb-4 text-lg font-black text-white">
            {selectedFolderId === "unsorted"
              ? "Unsorted"
              : selectedFolder?.name || "Folder"}
          </h3>

          {galleryError && (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
              {galleryError}
              <button type="button" className="ml-3 underline" onClick={() => setReloadKey((key) => key + 1)}>Retry</button>
            </div>
          )}

          {loadingFiles ? (
            <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading folder media...</div>
          ) : visibleFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
              {galleryError ? "Unable to display files." : "No approved files in this folder."}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
              {visibleFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => openPreview(file.id)}
                  disabled={previewLoadingId === file.id}
                  className="group min-w-0 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] p-1.5 text-left transition hover:border-smc-gold/40 disabled:opacity-60"
                >
                  
<div className="mb-4">
  <MediaThumbnail
    fileId={file.id}
    mediaType={file.media_type}
    filename={
      file.display_name || file.original_filename
    }
  />
</div>


                  <h4 className="block w-full truncate text-[10px] font-bold text-white transition group-hover:text-smc-gold">
                    {file.display_name ||
                      file.original_filename}
                  </h4>

                  <p className="mt-2 text-xs text-white/40">
                    {file.athlete_name ||
                      "No athlete assigned"}
                  </p>
                </button>
              ))}
            </div>
          )}
          {!loadingFiles && visibleFiles.length > 0 && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="text-xs text-white/45">
                Showing {visibleFiles.length} of {totalFiles} approved files
              </p>
              {visibleFiles.length < totalFiles && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl bg-smc-gold px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More Photos & Videos"}
                </button>
              )}
            </div>
          )}
        </div>
      )}


{renamingFolderId && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="rename-folder-title"
    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
  >
    <div className="w-full max-w-md rounded-2xl border border-smc-gold/25 bg-[#0b0b0b] p-6 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
        Media Organisation
      </p>

      <h3
        id="rename-folder-title"
        className="mt-2 text-xl font-black text-white"
      >
        Rename Folder
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/45">
        Change the folder name without affecting its media.
      </p>

      <form onSubmit={renameFolder} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="rename-media-folder-name"
            className="mb-2 block text-xs font-bold text-white/70"
          >
            Folder Name
          </label>

          <input
            id="rename-media-folder-name"
            type="text"
            autoFocus
            required
            maxLength={100}
            value={renameFolderName}
            onChange={(event) =>
              setRenameFolderName(event.target.value)
            }
            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-smc-gold/60"
          />
        </div>

        {renameError && (
          <p role="alert" className="text-xs text-red-300">
            {renameError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={savingRename}
            onClick={() => {
              setRenamingFolderId(null)
              setRenameError(null)
            }}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-white transition hover:border-white/35 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={savingRename || !renameFolderName.trim()}
            className="rounded-xl bg-smc-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {savingRename ? "Saving..." : "Save Name"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


{showMoveMedia && preview && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="move-media-title"
    className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
  >
    <div className="w-full max-w-md rounded-2xl border border-smc-gold/25 bg-[#0b0b0b] p-6 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
        Media Organisation
      </p>

      <h3
        id="move-media-title"
        className="mt-2 text-xl font-black text-white"
      >
        Move Media
      </h3>

      <p className="mt-2 break-words text-sm leading-6 text-white/45">
        Choose a destination for {preview.filename}.
      </p>

      <form
        onSubmit={moveMedia}
        className="mt-6 space-y-4"
      >
        <div>
          <label
            htmlFor="move-media-folder"
            className="mb-2 block text-xs font-bold text-white/70"
          >
            Destination Folder
          </label>

          <select
            id="move-media-folder"
            value={moveFolderId}
            onChange={(event) =>
              setMoveFolderId(event.target.value)
            }
            className="w-full rounded-xl border border-white/15 bg-[#151515] px-4 py-3 text-sm text-white outline-none transition focus:border-smc-gold/60"
          >
            <option value="unsorted">
              Unsorted
            </option>

            {rootFolders.map((folder) => (
              <option
                key={folder.id}
                value={folder.id}
              >
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {moveError && (
          <p
            role="alert"
            className="text-xs text-red-300"
          >
            {moveError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={movingMedia}
            onClick={() => {
              setShowMoveMedia(false)
              setMoveError(null)
            }}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-white transition hover:border-white/35 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={movingMedia}
            className="rounded-xl bg-smc-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {movingMedia
              ? "Moving..."
              : "Move Media"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {showCreateFolder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-folder-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-smc-gold/25 bg-[#0b0b0b] p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-smc-gold">
              Media Organisation
            </p>

            <h3
              id="create-folder-title"
              className="mt-2 text-xl font-black text-white"
            >
              Create New Folder
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Create a collection for competition footage,
              athletes or content projects.
            </p>

            <form
              onSubmit={createFolder}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="new-media-folder-name"
                  className="mb-2 block text-xs font-bold text-white/70"
                >
                  Folder Name
                </label>

                <input
                  id="new-media-folder-name"
                  type="text"
                  autoFocus
                  required
                  maxLength={100}
                  value={newFolderName}
                  onChange={(event) =>
                    setNewFolderName(event.target.value)
                  }
                  placeholder="e.g. SMC Winter Open 2027"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-smc-gold/60"
                />
              </div>

              {folderError && (
                <p
                  role="alert"
                  className="text-xs text-red-300"
                >
                  {folderError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={creatingFolder}
                  onClick={() => {
                    setShowCreateFolder(false)
                    setFolderError(null)
                  }}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-white transition hover:border-white/35 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingFolder ||
                    !newFolderName.trim()
                  }
                  className="rounded-xl bg-smc-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingFolder
                    ? "Creating..."
                    : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-smc-gold/25 bg-[#090909] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {preview.filename}
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-widest text-smc-gold">
                  Original Quality · Private Media
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-black text-white hover:border-smc-gold/50"
              >
                Close ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
              {preview.mediaType === "video" ? (
                <video
                  key={preview.fileId}
                  src={preview.url}
                  controls
                  playsInline
                  className="max-h-[65vh] max-w-full rounded-xl"
                />
              ) : (
                // The URL is generated by our authenticated API.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.filename}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain"
                />
              )}
            </div>

            
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
  <p className="text-xs text-white/40">
    Original-quality media · Private storage
  </p>

  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => setPreview(null)}
      className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-black text-white transition hover:border-smc-gold/40"
    >
      Back to Folder
    </button>


<button
  type="button"
  onClick={() => {
    setMoveError(null)

    const currentFile = visibleFiles.find(
      (file) => file.id === preview.fileId
    )

    setMoveFolderId(
      currentFile?.folder_id || "unsorted"
    )

    setShowMoveMedia(true)
  }}
  className="rounded-xl border border-smc-gold/40 px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-smc-gold transition hover:bg-smc-gold/10"
>
  Move to Folder
</button>


    <button
      type="button"
      onClick={downloadOriginal}
      disabled={downloadLoading}
      className="rounded-xl bg-smc-gold px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
    >
      {downloadLoading
        ? "Preparing..."
        : "↓ Download Original"}
    </button>
  </div>
</div>

          </div>
        </div>
      )}
    </div>
  )
}